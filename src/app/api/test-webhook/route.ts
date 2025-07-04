// Test endpoint to simulate webhook subscription upgrade
// This helps verify that the subscription update system works correctly
import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin for server-side operations
initAdmin();

// Server-side function to update subscription tier (same as webhook)
async function updateSubscriptionTierServer(userId: string, tier: 'free' | 'pro' | 'team'): Promise<void> {
  try {
    // Get Firestore instance for admin operations
    const db = getFirestore();
    // Update the user's subscription document in the 'subscriptions' collection
    await updateDoc(doc(db, 'subscriptions', userId), {
      tier, // Set the new subscription tier (free, pro, or team)
      updatedAt: serverTimestamp(), // Track when the update happened
    });
    console.log(`🔄 Updated Firestore: user ${userId} -> ${tier}`);
  } catch (error) {
    console.error('💥 Error updating subscription tier in Firestore:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  // Only allow this endpoint in development for security
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Get user ID from request body
    const { userId } = await req.json();

    // Validate that user ID is provided
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId in request body' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing webhook upgrade for user: ${userId}`);

    // Simulate what happens when a user successfully subscribes to Pro
    // This is the same logic that runs in the actual webhook
    await updateSubscriptionTierServer(userId, 'pro');

    console.log(`✅ Successfully upgraded user ${userId} to Pro tier`);

    return NextResponse.json({ 
      success: true,
      message: `User ${userId} successfully upgraded to Pro tier`,
      userId,
      tier: 'pro',
      note: 'This was a test upgrade - the user should now have Pro access in the app'
    });

  } catch (error) {
    console.error('❌ Test webhook upgrade failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to test webhook upgrade',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 