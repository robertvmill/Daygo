#!/usr/bin/env node

/**
 * Set a specific user back to Free subscription
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

const db = admin.firestore();

async function setUserToFree(userId) {
  try {
    console.log(`🚀 Setting user ${userId} back to Free...`);

    // Update subscription document
    await db.collection('subscriptions').doc(userId).set({
      tier: 'free',
      status: 'no_subscription',
      stripeSubscriptionId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Update user document
    await db.collection('users').doc(userId).set({
      subscriptionTier: 'free',
      subscriptionStatus: 'no_subscription',
      stripeSubscriptionId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`✅ Successfully set user ${userId} back to Free!`);

  } catch (error) {
    console.error('❌ Error setting user to free:', error);
  }
}

// Your user ID
const userId = 'qij4hZzZZufAJqczzuERK7BaoI03';
setUserToFree(userId);