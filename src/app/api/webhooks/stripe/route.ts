import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer, STRIPE_CONFIG } from '@/lib/stripe';
import Stripe from 'stripe';
import { getFirestore, doc, updateDoc, setDoc, serverTimestamp } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

// Initialize Firebase Admin
initAdmin();

// Simple logging function
const log = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// Handle GET requests for webhook verification
export async function GET() {
  log('info', 'Webhook endpoint GET request - endpoint is active');
  return NextResponse.json({ status: 'Webhook endpoint active', timestamp: new Date().toISOString() });
}

// Main webhook handler
export async function POST(req: NextRequest) {
  log('info', 'Webhook POST request received');
  
  try {
    // Get raw request body and signature - critical for webhook verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    log('info', 'Request details', {
      bodyLength: body.length,
      hasSignature: !!signature,
      userAgent: req.headers.get('user-agent'),
      webhookSecret: STRIPE_CONFIG.webhookSecret ? `${STRIPE_CONFIG.webhookSecret.substring(0, 10)}...` : 'missing'
    });

    if (!signature) {
      log('error', 'Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (!STRIPE_CONFIG.webhookSecret) {
      log('error', 'Missing webhook secret in environment');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      const stripe = getStripeServer();
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_CONFIG.webhookSecret);
      log('info', 'Webhook signature verified successfully', {
        eventId: event.id,
        eventType: event.type
      });
    } catch (err) {
      log('error', 'Webhook signature verification failed', {
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle subscription events
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      log('info', 'Processing subscription event', { eventType: event.type, eventId: event.id });
      
      const subscription = event.data.object as Stripe.Subscription;
      
      log('info', 'Subscription details', {
        subscriptionId: subscription.id,
        status: subscription.status,
        metadata: subscription.metadata
      });

      // Extract user info from metadata
      const userId = subscription.metadata.userId;
      const tier = subscription.metadata.tier as 'pro' | 'team';

      if (!userId) {
        log('warn', 'No userId in subscription metadata', { 
          subscriptionId: subscription.id,
          metadata: subscription.metadata 
        });
        return NextResponse.json({ received: true, warning: 'No userId in metadata' });
      }

      if (!tier || !['pro', 'team'].includes(tier)) {
        log('warn', 'Invalid tier in subscription metadata', { 
          subscriptionId: subscription.id,
          tier: tier,
          metadata: subscription.metadata 
        });
        return NextResponse.json({ received: true, warning: 'Invalid tier in metadata' });
      }

      // Update user subscription in Firestore
      try {
        const db = getFirestore();
        const effectiveTier = subscription.status === 'active' ? tier : 'free';
        
        // Update both subscriptions collection and user document
        const subscriptionUpdatePromise = setDoc(doc(db, 'subscriptions', userId), {
          tier: effectiveTier,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        const userUpdatePromise = setDoc(doc(db, 'users', userId), {
          subscriptionTier: effectiveTier,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        await Promise.all([subscriptionUpdatePromise, userUpdatePromise]);

        log('info', 'Successfully updated Firestore subscription and user', {
          userId: userId,
          tier: effectiveTier,
          subscriptionId: subscription.id
        });
      } catch (firestoreError) {
        log('error', 'Failed to update Firestore', {
          error: firestoreError instanceof Error ? firestoreError.message : 'Unknown error',
          userId: userId
        });
      }
    } else {
      log('info', 'Unhandled event type', { eventType: event.type, eventId: event.id });
    }

    log('info', 'Webhook processing completed successfully');
    return NextResponse.json({ received: true, eventId: event.id });

  } catch (error) {
    log('error', 'Webhook processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Configure to receive raw body for webhook signature verification
export const runtime = 'nodejs';