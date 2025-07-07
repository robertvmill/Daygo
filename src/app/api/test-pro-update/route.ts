import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

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

    console.log('Testing subscription update for user:', userId);

    const db = getFirestore();
    
    // Update user to Pro
    const subscriptionUpdatePromise = setDoc(doc(db, 'subscriptions', userId), {
      tier: 'pro',
      status: 'active',
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const userUpdatePromise = setDoc(doc(db, 'users', userId), {
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await Promise.all([subscriptionUpdatePromise, userUpdatePromise]);

    console.log('Successfully updated user to Pro:', userId);

    return NextResponse.json({ 
      success: true,
      tier: 'pro',
      userId: userId,
      message: 'User updated to Pro plan'
    });

  } catch (error) {
    console.error('Test subscription update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}