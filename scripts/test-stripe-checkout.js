#!/usr/bin/env node

/**
 * Test script to simulate a Stripe checkout and verify webhook processing
 */

require('dotenv').config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;

if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
  console.error('Missing required environment variables');
  process.exit(1);
}

console.log('🧪 Testing Stripe checkout flow...');
console.log('Price ID:', STRIPE_PRICE_ID);
console.log('Webhook should receive metadata and upgrade user automatically');
console.log('');
console.log('💡 To test:');
console.log('1. Go to: https://www.daygo.live/upgrade');
console.log('2. Click "Upgrade to Pro"');
console.log('3. Complete checkout with test card: 4242424242424242');
console.log('4. Check webhook logs in Vercel dashboard');
console.log('5. Verify user is upgraded to Pro in Firebase');
console.log('');
console.log('🔍 Watch for these log entries:');
console.log('- "Checking for checkout session metadata since subscription metadata is empty"');
console.log('- "Found metadata in checkout session"');
console.log('- "Successfully updated Firestore subscription and user"');