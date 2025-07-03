// Stripe configuration for Daygo subscription system
// This file handles both client-side and server-side Stripe initialization

import { loadStripe, Stripe } from '@stripe/stripe-js';

// Client-side Stripe instance (singleton pattern)
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// Server-side Stripe configuration
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia', // Use latest API version
  typescript: true,
});

// Subscription configuration
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

// Helper function to format currency
export const formatPrice = (amount: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

// Validate required environment variables
export const validateStripeConfig = () => {
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