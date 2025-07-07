import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';
import { getStripeServer } from '@/lib/stripe';

// Initialize Firebase Admin
initAdmin();

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'User email required' }, { status: 400 });
    }

    console.log('Syncing subscription for user:', userId, userEmail);

    // Get user's Stripe customer and subscriptions
    const stripe = getStripeServer();
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      // No Stripe customer found - user is on free plan
      await updateUserSubscription(userId, 'free', null, 'no_subscription');
      return NextResponse.json({ 
        tier: 'free',
        message: 'No Stripe customer found - set to free plan'
      });
    }

    const customer = customers.data[0];
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // Customer exists but no active subscription
      await updateUserSubscription(userId, 'free', null, 'no_active_subscription');
      return NextResponse.json({ 
        tier: 'free',
        message: 'No active subscription found - set to free plan'
      });
    }

    // User has active subscription
    const subscription = subscriptions.data[0];
    const tier = subscription.metadata.tier || 'pro'; // Default to pro if no tier specified

    await updateUserSubscription(userId, tier as 'pro' | 'team', subscription.id, subscription.status);

    console.log('Successfully synced subscription:', { userId, tier, subscriptionId: subscription.id });

    return NextResponse.json({ 
      tier,
      subscriptionId: subscription.id,
      status: subscription.status,
      message: 'Subscription synced successfully'
    });

  } catch (error) {
    console.error('Subscription sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function updateUserSubscription(
  userId: string, 
  tier: 'free' | 'pro' | 'team', 
  subscriptionId: string | null,
  status: string
) {
  const db = getFirestore();
  
  const subscriptionUpdatePromise = updateDoc(doc(db, 'subscriptions', userId), {
    tier,
    stripeSubscriptionId: subscriptionId,
    status,
    updatedAt: serverTimestamp(),
  });

  const userUpdatePromise = updateDoc(doc(db, 'users', userId), {
    subscriptionTier: tier,
    stripeSubscriptionId: subscriptionId,
    subscriptionStatus: status,
    updatedAt: serverTimestamp(),
  });

  await Promise.all([subscriptionUpdatePromise, userUpdatePromise]);
}