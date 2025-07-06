// Stripe webhook handler for subscription events
// This updates user subscription status in Firestore when Stripe processes payments

import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer, STRIPE_CONFIG, validateStripeConfig } from '@/lib/stripe';
import Stripe from 'stripe';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

// Initialize Firebase Admin
initAdmin();

// Enhanced logging utility
const logWithTimestamp = (level: 'info' | 'error' | 'warn', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = data ? JSON.stringify(data, null, 2) : '';
  
  switch (level) {
    case 'info':
      console.log(`[${timestamp}] ℹ️  WEBHOOK: ${message}`, logData);
      break;
    case 'error':
      console.error(`[${timestamp}] ❌ WEBHOOK ERROR: ${message}`, logData);
      break;
    case 'warn':
      console.warn(`[${timestamp}] ⚠️  WEBHOOK WARNING: ${message}`, logData);
      break;
  }
};

// Server-side function to update subscription tier
async function updateSubscriptionTierServer(userId: string, tier: 'free' | 'pro' | 'team'): Promise<void> {
  const startTime = Date.now();
  
  try {
    logWithTimestamp('info', 'Starting Firestore subscription update', {
      userId: userId,
      newTier: tier,
      collection: 'subscriptions',
      timestamp: new Date().toISOString()
    });
    
    const db = getFirestore();
    const docRef = doc(db, 'subscriptions', userId);
    
    const updateData = {
      tier,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(docRef, updateData);
    
    const processingTime = Date.now() - startTime;
    logWithTimestamp('info', 'Firestore subscription update completed', {
      userId: userId,
      newTier: tier,
      processingTimeMs: processingTime,
      docPath: `subscriptions/${userId}`,
      updateData: { tier, updatedAt: '[serverTimestamp]' }
    });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logWithTimestamp('error', 'Firestore subscription update failed', {
      userId: userId,
      tier: tier,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
      docPath: `subscriptions/${userId}`
    });
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Validate Stripe configuration first
    try {
      validateStripeConfig();
    } catch (configError) {
      logWithTimestamp('error', 'Stripe configuration validation failed', { error: configError });
      return NextResponse.json(
        { error: 'Stripe configuration invalid' },
        { status: 500 }
      );
    }

    logWithTimestamp('info', 'Webhook request received', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      timestamp: new Date().toISOString()
    });

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    // Enhanced request validation
    if (!signature) {
      logWithTimestamp('error', 'Missing stripe-signature header', {
        headers: Object.fromEntries(req.headers.entries()),
        bodyLength: body.length
      });
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    if (!STRIPE_CONFIG.webhookSecret) {
      logWithTimestamp('error', 'Missing STRIPE_WEBHOOK_SECRET environment variable', {
        availableEnvVars: Object.keys(process.env).filter(key => key.startsWith('STRIPE_'))
      });
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature with enhanced error handling
    let event: Stripe.Event;
    try {
      const stripe = getStripeServer();
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_CONFIG.webhookSecret
      );
      
      logWithTimestamp('info', 'Webhook signature verified successfully', {
        eventId: event.id,
        eventType: event.type,
        created: event.created,
        livemode: event.livemode
      });
    } catch (err) {
      logWithTimestamp('error', 'Webhook signature verification failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        signatureLength: signature.length,
        bodyLength: body.length,
        webhookSecretConfigured: !!STRIPE_CONFIG.webhookSecret,
        webhookSecretPrefix: STRIPE_CONFIG.webhookSecret?.substring(0, 10) + '...'
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    logWithTimestamp('info', 'Processing Stripe webhook event', {
      eventId: event.id,
      eventType: event.type,
      created: new Date(event.created * 1000).toISOString(),
      livemode: event.livemode,
      apiVersion: event.api_version
    });

    // Handle different event types with comprehensive logging
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        logWithTimestamp('info', `Processing ${event.type} event`, {
          eventId: event.id,
          subscriptionId: (event.data.object as Stripe.Subscription).id
        });
        
        const subscription = event.data.object as Stripe.Subscription;
        logWithTimestamp('info', 'Subscription details', {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer,
          priceId: subscription.items.data[0]?.price?.id,
          metadata: subscription.metadata,
          currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString()
        });
        
        await handleSubscriptionChange(subscription, 'active');
        break;
      }

      case 'customer.subscription.deleted': {
        logWithTimestamp('info', 'Processing subscription deleted event', {
          eventId: event.id,
          subscriptionId: (event.data.object as Stripe.Subscription).id
        });
        
        const subscription = event.data.object as Stripe.Subscription;
        logWithTimestamp('info', 'Deleted subscription details', {
          subscriptionId: subscription.id,
          status: subscription.status,
          customerId: subscription.customer,
          metadata: subscription.metadata,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
        });
        
        await handleSubscriptionChange(subscription, 'canceled');
        break;
      }

      case 'invoice.payment_succeeded': {
        logWithTimestamp('info', 'Processing invoice payment succeeded event', {
          eventId: event.id,
          invoiceId: (event.data.object as Stripe.Invoice).id
        });
        
        const invoice = event.data.object as Stripe.Invoice;
        logWithTimestamp('info', 'Invoice payment succeeded details', {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status
        });
        
        if (invoice.subscription) {
          const stripeServer = getStripeServer();
          const subscription = await stripeServer.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionChange(subscription, 'active');
        }
        break;
      }

      case 'invoice.payment_failed': {
        logWithTimestamp('info', 'Processing invoice payment failed event', {
          eventId: event.id,
          invoiceId: (event.data.object as Stripe.Invoice).id
        });
        
        const invoice = event.data.object as Stripe.Invoice;
        logWithTimestamp('warn', 'Invoice payment failed details', {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          customerId: invoice.customer,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: invoice.status,
          attemptCount: invoice.attempt_count
        });
        
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
        logWithTimestamp('warn', `Unhandled event type: ${event.type}`, {
          eventId: event.id,
          eventData: event.data
        });
    }

    const processingTime = Date.now() - startTime;
    logWithTimestamp('info', 'Webhook processing completed successfully', {
      eventId: event.id,
      eventType: event.type,
      processingTimeMs: processingTime
    });

    return NextResponse.json({ 
      received: true,
      eventId: event.id,
      eventType: event.type,
      processingTime: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logWithTimestamp('error', 'Webhook handler error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
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
  const startTime = Date.now();
  
  try {
    logWithTimestamp('info', 'Starting subscription change handling', {
      subscriptionId: subscription.id,
      requestedStatus: status,
      stripeStatus: subscription.status,
      customerId: subscription.customer,
      priceId: subscription.items.data[0]?.price?.id
    });
    
    logWithTimestamp('info', 'Subscription metadata analysis', {
      subscriptionId: subscription.id,
      metadata: subscription.metadata,
      metadataKeys: Object.keys(subscription.metadata),
      metadataCount: Object.keys(subscription.metadata).length
    });
    
    const userId = subscription.metadata.userId;
    const tier = subscription.metadata.tier as 'pro' | 'team';

    // Enhanced validation with detailed logging
    if (!userId) {
      logWithTimestamp('error', 'Missing userId in subscription metadata', {
        subscriptionId: subscription.id,
        availableMetadataKeys: Object.keys(subscription.metadata),
        fullMetadata: subscription.metadata,
        customerId: subscription.customer,
        createdAt: new Date(subscription.created * 1000).toISOString()
      });
      return;
    }

    if (!tier || !['pro', 'team'].includes(tier)) {
      logWithTimestamp('error', 'Invalid tier in subscription metadata', {
        subscriptionId: subscription.id,
        receivedTier: tier,
        expectedTiers: ['pro', 'team'],
        fullMetadata: subscription.metadata,
        userId: userId
      });
      return;
    }

    logWithTimestamp('info', 'Validated subscription metadata', {
      subscriptionId: subscription.id,
      userId: userId,
      tier: tier,
      status: status,
      stripeStatus: subscription.status
    });

    // Determine effective tier based on status
    let effectiveTier: 'free' | 'pro' | 'team';
    
    if (status === 'active') {
      effectiveTier = tier;
    } else {
      effectiveTier = 'free';
    }

    logWithTimestamp('info', 'Calculated effective tier', {
      subscriptionId: subscription.id,
      userId: userId,
      originalTier: tier,
      requestedStatus: status,
      effectiveTier: effectiveTier,
      reasoning: status === 'active' ? 'Active subscription' : 'Canceled/past due subscription'
    });

    // Update user subscription in Firestore
    await updateSubscriptionTierServer(userId, effectiveTier);

    const processingTime = Date.now() - startTime;
    logWithTimestamp('info', 'Subscription change handled successfully', {
      subscriptionId: subscription.id,
      userId: userId,
      finalTier: effectiveTier,
      processingTimeMs: processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logWithTimestamp('error', 'Error handling subscription change', {
      subscriptionId: subscription.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
      subscriptionMetadata: subscription.metadata
    });
    throw error;
  }
}

// Disable body parsing for webhook validation
export const config = {
  api: {
    bodyParser: false,
  },
}; 