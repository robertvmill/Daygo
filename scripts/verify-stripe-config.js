#!/usr/bin/env node

/**
 * Stripe Configuration Verification Script
 * 
 * This script verifies your Stripe configuration and provides guidance
 * on setting up webhooks correctly for both development and production.
 */

require('dotenv').config();

console.log('🔍 STRIPE CONFIGURATION VERIFICATION');
console.log('====================================\n');

// Check environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRO_PRICE_ID',
  'NEXT_PUBLIC_APP_URL'
];

console.log('📋 Environment Variables Check:');
const missingVars = [];
const envDetails = {};

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingVars.push(varName);
    console.log(`❌ ${varName}: MISSING`);
  } else {
    envDetails[varName] = value;
    console.log(`✅ ${varName}: ${value.substring(0, 15)}...`);
  }
});

if (missingVars.length > 0) {
  console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

console.log('\n🔐 Stripe Keys Analysis:');
const publishableKey = envDetails.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const secretKey = envDetails.STRIPE_SECRET_KEY;
const webhookSecret = envDetails.STRIPE_WEBHOOK_SECRET;
const appUrl = envDetails.NEXT_PUBLIC_APP_URL;

// Determine environment
const isTestMode = publishableKey.includes('test') || secretKey.includes('test');
const isDevUrl = appUrl.includes('localhost') || appUrl.includes('127.0.0.1');

console.log(`🌍 Environment: ${isTestMode ? 'TEST' : 'LIVE'}`);
console.log(`🔗 App URL: ${appUrl}`);
console.log(`🎯 Webhook URL: ${appUrl}/api/webhooks/stripe`);

console.log('\n⚙️  Configuration Analysis:');

// Check for mismatched configuration
if (isTestMode && !isDevUrl) {
  console.log('⚠️  WARNING: Using TEST keys with PRODUCTION URL');
  console.log('   This is common during development but should be reviewed for production');
}

if (!isTestMode && isDevUrl) {
  console.log('❌ ERROR: Using LIVE keys with LOCALHOST URL');
  console.log('   This configuration will not work - webhooks cannot reach localhost');
}

// Validate key formats
const keyValidations = [
  { name: 'Publishable Key', key: publishableKey, prefix: 'pk_' },
  { name: 'Secret Key', key: secretKey, prefix: 'sk_' },
  { name: 'Webhook Secret', key: webhookSecret, prefix: 'whsec_' },
  { name: 'Price ID', key: envDetails.STRIPE_PRO_PRICE_ID, prefix: 'price_' }
];

console.log('\n🔑 Key Format Validation:');
keyValidations.forEach(({ name, key, prefix }) => {
  if (key.startsWith(prefix)) {
    console.log(`✅ ${name}: Valid format`);
  } else {
    console.log(`❌ ${name}: Invalid format (should start with "${prefix}")`);
  }
});

console.log('\n📖 STRIPE WEBHOOK SETUP GUIDE');
console.log('===============================\n');

console.log('1. Go to your Stripe Dashboard:');
console.log('   https://dashboard.stripe.com/webhooks\n');

console.log('2. Create a new webhook endpoint with this URL:');
console.log(`   ${appUrl}/api/webhooks/stripe\n`);

console.log('3. Select these events to listen for:');
console.log('   • customer.subscription.created');
console.log('   • customer.subscription.updated');
console.log('   • customer.subscription.deleted');
console.log('   • invoice.payment_succeeded');
console.log('   • invoice.payment_failed\n');

console.log('4. After creating the webhook:');
console.log('   • Copy the webhook signing secret (starts with "whsec_")');
console.log('   • Update your .env file with STRIPE_WEBHOOK_SECRET\n');

console.log('5. Test the webhook:');
console.log('   • Use the "Send test webhook" button in Stripe Dashboard');
console.log('   • Check your application logs for webhook events\n');

if (isTestMode) {
  console.log('🧪 TEST MODE CONFIGURATION:');
  console.log('For local development, consider using Stripe CLI:');
  console.log('1. Install Stripe CLI: https://stripe.com/docs/stripe-cli');
  console.log('2. Run: stripe login');
  console.log('3. Forward events: stripe listen --forward-to localhost:3000/api/webhooks/stripe');
  console.log('4. Use the webhook secret from CLI output\n');
}

console.log('🔍 TROUBLESHOOTING:');
console.log('===================');
console.log('• Check webhook logs in Stripe Dashboard');
console.log('• Verify webhook URL is accessible (returns 405 for GET requests)');
console.log('• Ensure webhook secret matches exactly');
console.log('• Check application logs for detailed error messages');
console.log('• Test with ngrok for local development if needed\n');

console.log('✅ Configuration verification complete!');