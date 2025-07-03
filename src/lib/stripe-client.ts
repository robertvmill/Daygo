// Client-side Stripe configuration for Daygo
// This file only contains code that can safely run in the browser

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

// Helper function to format currency (safe for client-side)
export const formatPrice = (amount: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

// Client-safe configuration
export const CLIENT_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  successUrl: '/upgrade?success=true',
  cancelUrl: '/upgrade?canceled=true',
} as const; 