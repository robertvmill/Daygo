#!/usr/bin/env node

/**
 * Set a specific user to Pro subscription
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

async function setUserToPro(userId) {
  try {
    console.log(`🚀 Setting user ${userId} to Pro...`);

    // Update subscription document
    await db.collection('subscriptions').doc(userId).set({
      tier: 'pro',
      status: 'active',
      stripeSubscriptionId: 'manual_pro_upgrade',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Update user document
    await db.collection('users').doc(userId).set({
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      stripeSubscriptionId: 'manual_pro_upgrade',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`✅ Successfully upgraded user ${userId} to Pro!`);

  } catch (error) {
    console.error('❌ Error upgrading user:', error);
  }
}

// Your user ID
const userId = 'qij4hZzZZufAJqczzuERK7BaoI03';
setUserToPro(userId);