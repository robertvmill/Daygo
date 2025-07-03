// API route for creating Stripe checkout sessions
// This handles the subscription upgrade flow from the upgrade page

import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG, type SubscriptionMetadata, type CustomerMetadata } from '@/lib/stripe';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase-admin';

// Initialize Firebase Admin
initAdmin();

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;
    let userEmail: string;
    let userName: string | undefined;

    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      userId = decodedToken.uid;
      userEmail = decodedToken.email || '';
      userName = decodedToken.name;
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return NextResponse.json(
        { error: 'Invalid authorization token' },
        { status: 401 }
      );
    }

    // Parse request body
    const { priceId, tier } = await req.json();

    if (!priceId || !tier) {
      return NextResponse.json(
        { error: 'Missing priceId or tier in request body' },
        { status: 400 }
      );
    }

    // Validate tier
    if (!['pro', 'team'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid subscription tier. Must be "pro" or "team".' },
        { status: 400 }
      );
    }

    // Check if customer already exists in Stripe
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      // Create new customer
      const customerMetadata: CustomerMetadata = {
        userId,
        email: userEmail,
        name: userName,
      };

      customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: customerMetadata,
      });
    }

    // Prepare subscription metadata
    const subscriptionMetadata: SubscriptionMetadata = {
      userId,
      tier,
    };

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      subscription_data: {
        metadata: subscriptionMetadata,
      },
      success_url: `${STRIPE_CONFIG.baseUrl}${STRIPE_CONFIG.successUrl}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${STRIPE_CONFIG.baseUrl}${STRIPE_CONFIG.cancelUrl}`,
      metadata: {
        userId,
        tier,
      },
    });

    console.log('Created checkout session:', session.id, 'for user:', userId, 'tier:', tier);

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 