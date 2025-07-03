// Subscription service for managing user limits and usage tracking
// Inspired by Notion's approach to content blocks and workspace management

'use client';

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { 
  UserSubscription, 
  UsageStats, 
  SubscriptionTier, 
  SUBSCRIPTION_TIERS,
  isWithinLimit,
  getUpgradeMessage 
} from '@/types/subscription';

// Get current user's subscription information
export async function getUserSubscription(): Promise<UserSubscription | null> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const subscriptionDoc = await getDoc(doc(db, 'subscriptions', user.uid));
    
    if (!subscriptionDoc.exists()) {
      // Create default free subscription for new users
      const defaultSubscription: Omit<UserSubscription, 'id'> = {
        userId: user.uid,
        tier: 'free',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await setDoc(doc(db, 'subscriptions', user.uid), {
        ...defaultSubscription,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        currentPeriodStart: serverTimestamp(),
        currentPeriodEnd: serverTimestamp(),
      });
      
      return {
        id: user.uid,
        ...defaultSubscription,
      };
    }

    const data = subscriptionDoc.data();
    return {
      id: subscriptionDoc.id,
      userId: data.userId,
      tier: data.tier,
      status: data.status,
      currentPeriodStart: data.currentPeriodStart?.toDate() || new Date(),
      currentPeriodEnd: data.currentPeriodEnd?.toDate() || new Date(),
      cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
}

// Get current user's usage statistics
export async function getUserUsage(): Promise<UsageStats> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated');
    }

    const usageDoc = await getDoc(doc(db, 'usage', user.uid));
    
    if (!usageDoc.exists()) {
      // Initialize usage tracking for new users
      const defaultUsage: Omit<UsageStats, 'userId'> = {
        journalEntriesCount: 0,
        templatesCount: 0,
        currentPeriodStart: new Date(),
        lastUpdated: new Date(),
      };
      
      await setDoc(doc(db, 'usage', user.uid), {
        userId: user.uid,
        ...defaultUsage,
        currentPeriodStart: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
      
      return {
        userId: user.uid,
        ...defaultUsage,
      };
    }

    const data = usageDoc.data();
    return {
      userId: data.userId,
      journalEntriesCount: data.journalEntriesCount || 0,
      templatesCount: data.templatesCount || 0,
      currentPeriodStart: data.currentPeriodStart?.toDate() || new Date(),
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting user usage:', error);
    throw error;
  }
}

// Check if user can create a new journal entry (like Notion's block limit)
export async function canCreateJournalEntry(): Promise<{ canCreate: boolean; message?: string }> {
  try {
    const [subscription, usage] = await Promise.all([
      getUserSubscription(),
      getUserUsage()
    ]);

    if (!subscription) {
      return { canCreate: false, message: 'Unable to verify subscription status' };
    }

    const limits = SUBSCRIPTION_TIERS[subscription.tier];
    const canCreate = isWithinLimit(usage.journalEntriesCount, limits.maxJournalEntries);

    if (!canCreate) {
      return {
        canCreate: false,
        message: getUpgradeMessage('journal')
      };
    }

    return { canCreate: true };
  } catch (error) {
    console.error('Error checking journal entry limit:', error);
    return { canCreate: false, message: 'Error checking subscription limits' };
  }
}

// Check if user can create a new template (like Notion's workspace limit)
export async function canCreateTemplate(): Promise<{ canCreate: boolean; message?: string }> {
  try {
    const [subscription, usage] = await Promise.all([
      getUserSubscription(),
      getUserUsage()
    ]);

    if (!subscription) {
      return { canCreate: false, message: 'Unable to verify subscription status' };
    }

    const limits = SUBSCRIPTION_TIERS[subscription.tier];
    const canCreate = isWithinLimit(usage.templatesCount, limits.maxTemplates);

    if (!canCreate) {
      return {
        canCreate: false,
        message: getUpgradeMessage('template')
      };
    }

    return { canCreate: true };
  } catch (error) {
    console.error('Error checking template limit:', error);
    return { canCreate: false, message: 'Error checking subscription limits' };
  }
}

// Track journal entry creation (increment usage counter)
export async function trackJournalEntryCreated(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, 'usage', user.uid), {
      journalEntriesCount: increment(1),
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking journal entry creation:', error);
    // Don't throw error - usage tracking shouldn't block core functionality
  }
}

// Track template creation (increment usage counter)
export async function trackTemplateCreated(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, 'usage', user.uid), {
      templatesCount: increment(1),
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking template creation:', error);
    // Don't throw error - usage tracking shouldn't block core functionality
  }
}

// Track item deletion (decrement usage counter)
export async function trackJournalEntryDeleted(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, 'usage', user.uid), {
      journalEntriesCount: increment(-1),
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking journal entry deletion:', error);
  }
}

export async function trackTemplateDeleted(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, 'usage', user.uid), {
      templatesCount: increment(-1),
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error tracking template deletion:', error);
  }
}

// Sync actual usage with database (for data integrity)
export async function syncUsageWithDatabase(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    // Count actual journal entries
    const journalQuery = query(
      collection(db, 'journalEntries'),
      where('userId', '==', user.uid)
    );
    const journalSnapshot = await getDocs(journalQuery);
    const actualJournalCount = journalSnapshot.size;

    // Count actual templates
    const templateQuery = query(
      collection(db, 'templates'),
      where('userId', '==', user.uid)
    );
    const templateSnapshot = await getDocs(templateQuery);
    const actualTemplateCount = templateSnapshot.size;

    // Update usage with actual counts
    await updateDoc(doc(db, 'usage', user.uid), {
      journalEntriesCount: actualJournalCount,
      templatesCount: actualTemplateCount,
      lastUpdated: serverTimestamp(),
    });

    console.log('Usage synced - Journal entries:', actualJournalCount, 'Templates:', actualTemplateCount);
  } catch (error) {
    console.error('Error syncing usage with database:', error);
  }
}

// Check if user has access to premium features
export async function hasFeatureAccess(feature: keyof typeof SUBSCRIPTION_TIERS.free): Promise<boolean> {
  try {
    const subscription = await getUserSubscription();
    if (!subscription) return false;

    const limits = SUBSCRIPTION_TIERS[subscription.tier];
    return limits[feature] === true;
  } catch (error) {
    console.error('Error checking feature access:', error);
    return false;
  }
}

// Update user subscription tier (for admin or stripe webhook)
export async function updateSubscriptionTier(userId: string, tier: SubscriptionTier): Promise<void> {
  try {
    await updateDoc(doc(db, 'subscriptions', userId), {
      tier,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating subscription tier:', error);
    throw error;
  }
} 