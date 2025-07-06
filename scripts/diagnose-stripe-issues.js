#!/usr/bin/env node

/**
 * Stripe Integration Diagnostic Script
 * 
 * This script diagnoses common issues with Stripe integration
 * and provides specific recommendations for fixes.
 */

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

console.log('🔍 STRIPE INTEGRATION DIAGNOSTICS');
console.log('==================================\n');

async function runDiagnostics() {
  try {
    // 1. Test Stripe API Connection
    console.log('1. Testing Stripe API connection...');
    try {
      const account = await stripe.accounts.retrieve();
      console.log('✅ Stripe API connection successful');
      console.log(`   Account ID: ${account.id}`);
      console.log(`   Country: ${account.country}`);
      console.log(`   Test mode: ${!account.livemode}`);
    } catch (error) {
      console.log('❌ Stripe API connection failed:', error.message);
      return;
    }

    // 2. Check Price ID
    console.log('\n2. Validating Price ID...');
    try {
      const price = await stripe.prices.retrieve(process.env.STRIPE_PRO_PRICE_ID);
      console.log('✅ Price ID is valid');
      console.log(`   Amount: ${price.unit_amount} ${price.currency}`);
      console.log(`   Recurring: ${price.recurring?.interval || 'one-time'}`);
      console.log(`   Active: ${price.active}`);
    } catch (error) {
      console.log('❌ Price ID validation failed:', error.message);
      console.log('   Please check your STRIPE_PRO_PRICE_ID in .env');
    }

    // 3. List recent webhook endpoints
    console.log('\n3. Checking webhook endpoints...');
    try {
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
      console.log(`✅ Found ${webhooks.data.length} webhook endpoints`);
      
      const targetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`;
      let foundMatchingWebhook = false;
      
      webhooks.data.forEach((webhook, index) => {
        console.log(`\n   Webhook ${index + 1}:`);
        console.log(`   URL: ${webhook.url}`);
        console.log(`   Status: ${webhook.status}`);
        console.log(`   Events: ${webhook.enabled_events.join(', ')}`);
        
        if (webhook.url === targetUrl) {
          foundMatchingWebhook = true;
          console.log('   ✅ This webhook matches your app URL');
        }
      });
      
      if (!foundMatchingWebhook && webhooks.data.length > 0) {
        console.log(`\n   ⚠️  No webhook found matching: ${targetUrl}`);
        console.log('   You may need to create a webhook or update the URL');
      }
      
    } catch (error) {
      console.log('❌ Webhook endpoint check failed:', error.message);
    }

    // 4. List recent events
    console.log('\n4. Checking recent webhook events...');
    try {
      const events = await stripe.events.list({ limit: 5 });
      console.log(`✅ Found ${events.data.length} recent events`);
      
      events.data.forEach((event, index) => {
        console.log(`\n   Event ${index + 1}:`);
        console.log(`   Type: ${event.type}`);
        console.log(`   Created: ${new Date(event.created * 1000).toISOString()}`);
        console.log(`   Livemode: ${event.livemode}`);
        
        if (event.type.includes('subscription') || event.type.includes('invoice')) {
          console.log('   🎯 This is a subscription-related event');
        }
      });
    } catch (error) {
      console.log('❌ Recent events check failed:', error.message);
    }

    // 5. Check for recent customers
    console.log('\n5. Checking recent customers...');
    try {
      const customers = await stripe.customers.list({ limit: 5 });
      console.log(`✅ Found ${customers.data.length} recent customers`);
      
      customers.data.forEach((customer, index) => {
        console.log(`\n   Customer ${index + 1}:`);
        console.log(`   ID: ${customer.id}`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   Created: ${new Date(customer.created * 1000).toISOString()}`);
        console.log(`   Subscriptions: ${customer.subscriptions?.data?.length || 0}`);
      });
    } catch (error) {
      console.log('❌ Recent customers check failed:', error.message);
    }

    // 6. Environment analysis
    console.log('\n6. Environment Analysis:');
    const isTestMode = process.env.STRIPE_SECRET_KEY.includes('test');
    const isDevUrl = process.env.NEXT_PUBLIC_APP_URL.includes('localhost');
    
    console.log(`   Test mode: ${isTestMode}`);
    console.log(`   App URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
    console.log(`   Webhook URL: ${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`);
    
    if (isTestMode && !isDevUrl) {
      console.log('\n   ⚠️  ISSUE DETECTED: Test keys with production URL');
      console.log('   This is the most likely cause of webhook delivery issues');
      console.log('   Solutions:');
      console.log('   - Use live keys for production deployment');
      console.log('   - Use test keys with localhost for development');
      console.log('   - Use Stripe CLI for local webhook testing');
    }

    console.log('\n✅ Diagnostic complete!');
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. Check Stripe Dashboard webhook logs for delivery failures');
    console.log('2. Verify webhook secret matches the endpoint in Stripe Dashboard');
    console.log('3. Test webhook delivery using Stripe Dashboard test feature');
    console.log('4. Monitor application logs during test purchases');
    console.log('5. Consider using Stripe CLI for local development');

  } catch (error) {
    console.log('❌ Diagnostic failed:', error.message);
  }
}

runDiagnostics();