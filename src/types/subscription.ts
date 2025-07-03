// Subscription types inspired by Notion's freemium model
// This defines the different subscription tiers and usage limits for Daygo

export type SubscriptionTier = 'free' | 'pro' | 'team';

export interface SubscriptionLimits {
  // Core content limits (like Notion's blocks)
  maxJournalEntries: number | 'unlimited';
  maxTemplates: number | 'unlimited';
  
  // Feature access
  aiFeatures: boolean;
  advancedSearch: boolean;
  advancedExport: boolean;
  prioritySupport: boolean;
  
  // Future features
  sharedTemplates: boolean;
  collaborativeJournaling: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageStats {
  userId: string;
  journalEntriesCount: number;
  templatesCount: number;
  currentPeriodStart: Date;
  lastUpdated: Date;
}

// Subscription tier configurations (like Notion's plans)
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxJournalEntries: 100, // Like Notion's block limit
    maxTemplates: 5, // Like Notion's workspace limit
    aiFeatures: false,
    advancedSearch: false,
    advancedExport: false,
    prioritySupport: false,
    sharedTemplates: false,
    collaborativeJournaling: false,
  },
  pro: {
    maxJournalEntries: 'unlimited',
    maxTemplates: 'unlimited',
    aiFeatures: true,
    advancedSearch: true,
    advancedExport: true,
    prioritySupport: true,
    sharedTemplates: true,
    collaborativeJournaling: false,
  },
  team: {
    maxJournalEntries: 'unlimited',
    maxTemplates: 'unlimited',
    aiFeatures: true,
    advancedSearch: true,
    advancedExport: true,
    prioritySupport: true,
    sharedTemplates: true,
    collaborativeJournaling: true,
  },
};

// Pricing information (like Notion's transparent pricing)
export const PRICING = {
  free: {
    price: 0,
    billingPeriod: null,
    description: "Perfect for getting started with journaling",
  },
  pro: {
    price: 8,
    billingPeriod: 'month' as const,
    description: "For serious journalers who want unlimited expression",
  },
  team: {
    price: 15,
    billingPeriod: 'month' as const,
    description: "For families or teams who journal together",
  },
};

// Usage limit check helpers
export function isWithinLimit(currentCount: number, limit: number | 'unlimited'): boolean {
  if (limit === 'unlimited') return true;
  return currentCount < limit;
}

export function getUsagePercentage(currentCount: number, limit: number | 'unlimited'): number {
  if (limit === 'unlimited') return 0;
  return Math.min((currentCount / limit) * 100, 100);
}

// Message helpers (like Notion's friendly messaging)
export function getLimitMessage(type: 'journal' | 'template', tier: SubscriptionTier): string {
  const limits = SUBSCRIPTION_TIERS[tier];
  
  if (type === 'journal') {
    if (limits.maxJournalEntries === 'unlimited') {
      return "You have unlimited journal entries";
    }
    return `You can create up to ${limits.maxJournalEntries} journal entries`;
  }
  
  if (type === 'template') {
    if (limits.maxTemplates === 'unlimited') {
      return "You have unlimited templates";
    }
    return `You can create up to ${limits.maxTemplates} templates`;
  }
  
  return "";
}

export function getUpgradeMessage(type: 'journal' | 'template'): string {
  if (type === 'journal') {
    return "You've reached your journal entry limit. Upgrade to Pro for unlimited entries and AI-powered insights.";
  }
  
  if (type === 'template') {
    return "You've reached your template limit. Upgrade to Pro for unlimited templates and advanced features.";
  }
  
  return "Upgrade to Pro to unlock unlimited access and premium features.";
} 