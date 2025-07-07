#!/usr/bin/env node

/**
 * Initialize all Firebase Auth users with free subscription documents
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function initializeAllUsers() {
  try {
    console.log('🚀 Starting to initialize all users...');

    // Get all users from Firebase Auth
    let allUsers = [];
    let nextPageToken;

    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
      
      console.log(`📊 Fetched ${listUsersResult.users.length} users, total so far: ${allUsers.length}`);
    } while (nextPageToken);

    console.log(`✅ Found ${allUsers.length} total users in Firebase Auth`);

    // Process users
    let processedCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
      try {
        const userId = user.uid;
        const userEmail = user.email || `user-${userId}@unknown.com`;
        const userName = user.displayName || 'Unknown User';

        // Create subscription document
        await db.collection('subscriptions').doc(userId).set({
          tier: 'free',
          status: 'no_subscription',
          stripeSubscriptionId: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Create user document
        await db.collection('users').doc(userId).set({
          email: userEmail,
          name: userName,
          subscriptionTier: 'free',
          subscriptionStatus: 'no_subscription',
          stripeSubscriptionId: null,
          createdAt: user.metadata.creationTime || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        processedCount++;
        console.log(`✅ Processed ${processedCount}/${allUsers.length}: ${userEmail}`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing user ${user.uid}:`, error.message);
      }
    }

    console.log(`\n🎉 Initialization complete!`);
    console.log(`✅ Successfully processed: ${processedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);

  } catch (error) {
    console.error('❌ User initialization failed:', error);
  }
}

initializeAllUsers();