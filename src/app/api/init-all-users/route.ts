import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

// Initialize Firebase Admin
initAdmin();

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting to initialize all users...');

    const auth = getAuth();
    const db = getFirestore();

    // Get all users from Firebase Auth (paginated)
    let allUsers: any[] = [];
    let nextPageToken: string | undefined;

    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
      
      console.log(`📊 Fetched ${listUsersResult.users.length} users, total so far: ${allUsers.length}`);
    } while (nextPageToken);

    console.log(`✅ Found ${allUsers.length} total users in Firebase Auth`);

    // Process users in batches to avoid overwhelming Firestore
    const batchSize = 50;
    let processedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batch = allUsers.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} users)...`);

      const promises = batch.map(async (user) => {
        try {
          const userId = user.uid;
          const userEmail = user.email || `user-${userId}@unknown.com`;
          const userName = user.displayName || 'Unknown User';

          // Create subscription document
          const subscriptionPromise = setDoc(doc(db, 'subscriptions', userId), {
            tier: 'free',
            status: 'no_subscription',
            stripeSubscriptionId: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });

          // Create user document
          const userPromise = setDoc(doc(db, 'users', userId), {
            email: userEmail,
            name: userName,
            subscriptionTier: 'free',
            subscriptionStatus: 'no_subscription',
            stripeSubscriptionId: null,
            createdAt: user.metadata.creationTime || serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });

          await Promise.all([subscriptionPromise, userPromise]);
          
          processedCount++;
          if (processedCount % 10 === 0) {
            console.log(`✅ Processed ${processedCount}/${allUsers.length} users`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error processing user ${user.uid}:`, error);
        }
      });

      await Promise.all(promises);
      
      // Small delay between batches to be nice to Firestore
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎉 Initialization complete!`);
    console.log(`✅ Successfully processed: ${processedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);

    return NextResponse.json({
      success: true,
      totalUsers: allUsers.length,
      processedUsers: processedCount,
      errors: errorCount,
      message: 'All users initialized with free subscriptions'
    });

  } catch (error) {
    console.error('❌ User initialization failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}