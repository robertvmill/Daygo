// Server-side Stripe configuration for Daygo
// This file contains server-only code and should never be imported on the client

import Stripe from 'stripe';

// Server-side Stripe instance (lazy initialization)
let stripeInstance: Stripe | null = null;

export const getStripeServer = (): Stripe => {
  // Only initialize on server-side
  if (typeof window !== 'undefined') {
    throw new Error('Server-side Stripe instance cannot be used on the client');
  }
  
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }
    
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia', // Use latest API version
      typescript: true,
    });
  }
  
  return stripeInstance;
};

// Subscription configuration (server-side)
export const STRIPE_CONFIG = {
  // Price IDs from your Stripe Dashboard (create these in Products section)
  prices: {
    pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly', // Replace with actual price ID
    team: process.env.STRIPE_TEAM_PRICE_ID || 'price_team_monthly', // Replace with actual price ID
  },
  
  // Webhook configuration
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  
  // App URLs for redirects
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Success/cancel URLs after checkout
  successUrl: '/upgrade?success=true',
  cancelUrl: '/upgrade?canceled=true',
} as const;

// Comprehensive environment validation (server-side only)
export const validateStripeConfig = () => {
  if (typeof window !== 'undefined') {
    return; // Skip validation on client-side
  }
  
  const required = [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRO_PRICE_ID',
    'NEXT_PUBLIC_APP_URL',
  ];
  
  console.log('🔍 Checking environment variables:', required.map(key => ({ 
    key, 
    exists: !!process.env[key],
    value: process.env[key] ? `${process.env[key].substring(0, 10)}...` : 'undefined'
  })));
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('🚨 STRIPE CONFIGURATION ERROR 🚨');
    console.error('Missing required environment variables:', missing);
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('STRIPE')));
    console.error('Please check your .env file and ensure all Stripe variables are set.');
    throw new Error(`Missing required Stripe environment variables: ${missing.join(', ')}`);
  }
  
  // Validate format of key environment variables
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (publishableKey && !publishableKey.startsWith('pk_')) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with "pk_"');
  }
  
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (secretKey && !secretKey.startsWith('sk_')) {
    throw new Error('STRIPE_SECRET_KEY must start with "sk_"');
  }
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret && !webhookSecret.startsWith('whsec_')) {
    throw new Error('STRIPE_WEBHOOK_SECRET must start with "whsec_"');
  }
  
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (priceId && !priceId.startsWith('price_')) {
    throw new Error('STRIPE_PRO_PRICE_ID must start with "price_"');
  }
  
  console.log('✅ Stripe configuration validated successfully');
  console.log('📋 Environment: ' + (publishableKey?.includes('test') ? 'TEST' : 'LIVE'));
  console.log('🌐 App URL:', process.env.NEXT_PUBLIC_APP_URL);
  console.log('🔐 Webhook URL:', `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe`);
};

// Type definitions for Stripe metadata
export interface SubscriptionMetadata {
  userId: string;
  tier: 'pro' | 'team';
  previousTier?: string;
  [key: string]: string | undefined; // Index signature for Stripe metadata
}

export interface CustomerMetadata {
  userId: string;
  email: string;
  name?: string;
  [key: string]: string | undefined; // Index signature for Stripe metadata
} 