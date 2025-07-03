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

// Validate required environment variables (server-side only)
export const validateStripeConfig = () => {
  if (typeof window !== 'undefined') {
    return; // Skip validation on client-side
  }
  
  const required = [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Stripe environment variables: ${missing.join(', ')}`);
  }
};

// Type definitions for Stripe metadata
export interface SubscriptionMetadata {
  userId: string;
  tier: 'pro' | 'team';
  previousTier?: string;
}

export interface CustomerMetadata {
  userId: string;
  email: string;
  name?: string;
} 