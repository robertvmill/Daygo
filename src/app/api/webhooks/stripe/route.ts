// Stripe webhook handler for subscription events
// This updates user subscription status in Firestore when Stripe processes payments

import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer, STRIPE_CONFIG } from '@/lib/stripe';
import Stripe from 'stripe';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

// Initialize Firebase Admin
initAdmin();

// Server-side function to update subscription tier
async function updateSubscriptionTierServer(userId: string, tier: 'free' | 'pro' | 'team'): Promise<void> {
  try {
    const db = getFirestore();
    await updateDoc(doc(db, 'subscriptions', userId), {
      tier,
      updatedAt: serverTimestamp(),
    });
    console.log(`🔄 Updated Firestore: user ${userId} -> ${tier}`);
  } catch (error) {
    console.error('💥 Error updating subscription tier in Firestore:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    if (!STRIPE_CONFIG.webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      const stripe = getStripeServer();
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_CONFIG.webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('🎯 Received Stripe webhook event:', event.type, event.id);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        console.log('📋 Processing subscription created/updated event');
        const subscription = event.data.object as Stripe.Subscription;
        console.log('📋 Subscription status from Stripe:', subscription.status);
        await handleSubscriptionChange(subscription, 'active');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, 'canceled');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          // Reactivate subscription if payment succeeds after failure
          const stripeServer = getStripeServer();
          const subscription = await stripeServer.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionChange(subscription, 'active');
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const stripeServer = getStripeServer();
          const subscription = await stripeServer.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionChange(subscription, 'past_due');
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to handle subscription changes
async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  status: 'active' | 'canceled' | 'past_due'
) {
  try {
    console.log('🔍 DEBUG: Subscription metadata:', JSON.stringify(subscription.metadata, null, 2));
    console.log('🔍 DEBUG: Subscription object keys:', Object.keys(subscription));
    console.log('🔍 DEBUG: Subscription status:', subscription.status);
    console.log('🔍 DEBUG: Subscription id:', subscription.id);
    
    const userId = subscription.metadata.userId;
    const tier = subscription.metadata.tier as 'pro' | 'team';

    if (!userId) {
      console.error('❌ No userId in subscription metadata:', subscription.id);
      console.error('❌ Available metadata keys:', Object.keys(subscription.metadata));
      return;
    }

    if (!tier || !['pro', 'team'].includes(tier)) {
      console.error('❌ Invalid tier in subscription metadata:', subscription.id, tier);
      console.error('❌ Available metadata:', subscription.metadata);
      return;
    }

    console.log(`✅ Updating subscription for user ${userId}: ${tier} (${status})`);

    // Determine effective tier based on status
    let effectiveTier: 'free' | 'pro' | 'team';
    
    if (status === 'active') {
      effectiveTier = tier;
    } else {
      // If subscription is canceled or past due, downgrade to free
      effectiveTier = 'free';
    }

    // Update user subscription in Firestore
    await updateSubscriptionTierServer(userId, effectiveTier);

    console.log(`🎉 Successfully updated user ${userId} to ${effectiveTier} tier`);

  } catch (error) {
    console.error('💥 Error handling subscription change:', error);
    throw error;
  }
}

// Disable body parsing for webhook validation
export const config = {
  api: {
    bodyParser: false,
  },
}; 