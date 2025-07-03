// Test route to manually upgrade user to Pro tier (for development testing)
import { NextRequest, NextResponse } from 'next/server';
import { updateSubscriptionTier } from '@/services/subscriptionService';

export async function POST(req: NextRequest) {
  try {
    // This is a development-only endpoint for testing subscription upgrades
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    const { userId, tier = 'pro' } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    if (!['pro', 'team', 'free'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be pro, team, or free' },
        { status: 400 }
      );
    }

    console.log(`Manually upgrading user ${userId} to ${tier} tier`);

    // Update user subscription tier in Firestore
    await updateSubscriptionTier(userId, tier);

    return NextResponse.json({ 
      success: true,
      message: `Successfully upgraded user ${userId} to ${tier} tier`,
      userId,
      tier
    });

  } catch (error) {
    console.error('Manual upgrade error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upgrade user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 