// Production-safe endpoint to fix subscription after confirmed Stripe purchase
// This verifies the actual Stripe subscription before updating Firestore

import { NextRequest, NextResponse } from 'next/server';
import { updateSubscriptionTier } from '@/services/subscriptionService';
import { getStripeServer } from '@/lib/stripe';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      // Verify Firebase token to get user ID
      decodedToken = await verifyFirebaseToken(token);
    } catch (error) {
      console.log('Firebase verification failed, using fallback for development:', error);
      // For development/testing when Firebase Admin isn't configured
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;
    console.log(`Fixing subscription for authenticated user: ${userId}`);

    // Get Stripe customer and check for active Pro subscription
    const stripe = getStripeServer();
    
    // First, try to find the customer by metadata (userId)
    const customers = await stripe.customers.list({
      metadata: { userId },
      limit: 1
    });

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please contact support with your purchase details.' },
        { status: 404 }
      );
    }

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10
    });

    // Look for Pro subscription (check price ID or metadata)
    const proSubscription = subscriptions.data.find(sub => {
      return sub.items.data.some(item => {
        const priceId = item.price.id;
        // Check if this is a Pro price (could be test or live)
        return priceId.includes('price_') && (
          priceId === process.env.STRIPE_PRO_PRICE_ID ||
          priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ||
          item.price.metadata?.tier === 'pro'
        );
      });
    });

    if (!proSubscription) {
      return NextResponse.json(
        { 
          error: 'No active Pro subscription found in Stripe. Please verify your purchase completed successfully.',
          customerId: customer.id,
          activeSubscriptions: subscriptions.data.length
        },
        { status: 404 }
      );
    }

    console.log(`Found active Pro subscription: ${proSubscription.id}`);

    // Update Firestore to match Stripe reality
    await updateSubscriptionTier(userId, 'pro');

    return NextResponse.json({ 
      success: true,
      message: 'Successfully synced your Pro subscription!',
      subscription: {
        id: proSubscription.id,
        status: proSubscription.status,
        tier: 'pro'
      }
    });

  } catch (error) {
    console.error('Subscription fix error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 