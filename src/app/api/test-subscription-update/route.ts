// Test endpoint to manually update subscription status
// This helps us verify that the database update mechanism works

import { NextRequest, NextResponse } from 'next/server';
import { initAdmin } from '@/lib/firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin for server-side operations
initAdmin();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tier } = body;

    if (!userId || !tier) {
      return NextResponse.json(
        { error: 'Missing userId or tier in request body' },
        { status: 400 }
      );
    }

    if (!['free', 'pro', 'team'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be: free, pro, or team' },
        { status: 400 }
      );
    }

    console.log(`🧪 TEST: Updating subscription for user ${userId} to ${tier}`);

    // Get Firestore instance for admin operations
    const db = getFirestore();
    const subscriptionRef = db.collection('subscriptions').doc(userId);

    // First, check if subscription document exists
    const subscriptionDoc = await subscriptionRef.get();
    
    if (!subscriptionDoc.exists) {
      console.log(`📝 Creating new subscription document for user ${userId}`);
      
      // Create new subscription document
      await subscriptionRef.set({
        userId,
        tier,
        status: 'active',
        currentPeriodStart: FieldValue.serverTimestamp(),
        currentPeriodEnd: FieldValue.serverTimestamp(),
        cancelAtPeriodEnd: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      console.log(`✅ Created new subscription: user ${userId} -> ${tier}`);
    } else {
      console.log(`📝 Updating existing subscription document for user ${userId}`);
      
      // Update existing subscription document
      await subscriptionRef.update({
        tier,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      console.log(`✅ Updated subscription: user ${userId} -> ${tier}`);
    }

    // Get the updated document to verify
    const updatedDoc = await subscriptionRef.get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      success: true,
      message: `Successfully updated subscription for user ${userId} to ${tier}`,
      data: {
        userId: updatedData?.userId,
        tier: updatedData?.tier,
        status: updatedData?.status,
        updatedAt: updatedData?.updatedAt,
      }
    });

  } catch (error) {
    console.error('💥 Test subscription update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 