// Simplified subscription fix endpoint that works without Firebase Admin SDK
// This uses client-provided userId but verifies against Stripe data for security

import { NextRequest, NextResponse } from 'next/server';
import { updateSubscriptionTier } from '@/services/subscriptionService';
import { getStripeServer } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail } = await req.json();

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing userId or userEmail' },
        { status: 400 }
      );
    }

    console.log(`Attempting to fix subscription for user: ${userId} (${userEmail})`);

    const stripe = getStripeServer();
    
    // Find customer by email (more reliable than metadata)
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      // Try finding by metadata as backup
      const customersByMetadata = await stripe.customers.list({
        metadata: { userId },
        limit: 1
      });
      
      if (customersByMetadata.data.length > 0) {
        customer = customersByMetadata.data[0];
      } else {
        return NextResponse.json(
          { 
            error: 'No Stripe customer found. Please ensure you completed the purchase successfully.',
            suggestion: 'Check your email for a Stripe receipt, or contact support.'
          },
          { status: 404 }
        );
      }
    }

    console.log(`Found Stripe customer: ${customer.id} (${customer.email})`);

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { 
          error: 'No active subscriptions found in Stripe.',
          suggestion: 'Your payment may still be processing, or the subscription may have failed. Check your email for confirmation.'
        },
        { status: 404 }
      );
    }

    // Look for Pro subscription (any subscription with a price > $5/month indicates Pro)
    const proSubscription = subscriptions.data.find(sub => {
      return sub.items.data.some(item => {
        const priceAmount = item.price.unit_amount || 0;
        const priceCurrency = item.price.currency;
        const priceId = item.price.id;
        
        // Pro is $8 CAD/month = 800 cents, or similar amounts in other currencies
        // Accept any subscription over $5/month as Pro tier
        const isProPrice = priceAmount >= 500; // 500 cents = $5
        
        console.log(`Checking price ${priceId}: ${priceAmount} ${priceCurrency} - Pro? ${isProPrice}`);
        return isProPrice;
      });
    });

    if (!proSubscription) {
      return NextResponse.json(
        { 
          error: 'No Pro subscription found. Found subscriptions but none appear to be Pro tier.',
          subscriptions: subscriptions.data.map(sub => ({
            id: sub.id,
            status: sub.status,
            amount: sub.items.data[0]?.price.unit_amount,
            currency: sub.items.data[0]?.price.currency
          }))
        },
        { status: 404 }
      );
    }

    console.log(`Found Pro subscription: ${proSubscription.id} - Status: ${proSubscription.status}`);

    // Update Firestore to Pro tier
    await updateSubscriptionTier(userId, 'pro');

    console.log(`Successfully updated user ${userId} to Pro tier`);

    return NextResponse.json({ 
      success: true,
      message: 'Successfully synced your Pro subscription! You now have unlimited access.',
      subscription: {
        id: proSubscription.id,
        status: proSubscription.status,
        tier: 'pro',
        amount: proSubscription.items.data[0]?.price.unit_amount,
        currency: proSubscription.items.data[0]?.price.currency
      },
      customer: {
        id: customer.id,
        email: customer.email
      }
    });

  } catch (error) {
    console.error('Subscription fix error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please try again in a few minutes, or contact support if the issue persists.'
      },
      { status: 500 }
    );
  }
} 