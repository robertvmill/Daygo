#!/usr/bin/env node

/**
 * Test script to check Stripe webhook metadata flow
 */

require('dotenv').config();
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testMetadataFlow() {
  try {
    console.log('🧪 Testing Stripe metadata flow...\n');

    // List recent checkout sessions
    console.log('📋 Recent checkout sessions:');
    const sessions = await stripe.checkout.sessions.list({ limit: 5 });
    
    for (const session of sessions.data) {
      console.log(`Session ${session.id}:`);
      console.log(`  Status: ${session.payment_status}`);
      console.log(`  Mode: ${session.mode}`);
      console.log(`  Metadata:`, session.metadata);
      console.log(`  Subscription: ${session.subscription}`);
      
      if (session.subscription) {
        // Get the subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        console.log(`  Subscription metadata:`, subscription.metadata);
        console.log(`  Subscription status: ${subscription.status}`);
      }
      console.log('');
    }

    // List recent subscriptions
    console.log('💳 Recent subscriptions:');
    const subscriptions = await stripe.subscriptions.list({ limit: 5 });
    
    for (const subscription of subscriptions.data) {
      console.log(`Subscription ${subscription.id}:`);
      console.log(`  Status: ${subscription.status}`);
      console.log(`  Metadata:`, subscription.metadata);
      console.log(`  Customer: ${subscription.customer}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMetadataFlow();