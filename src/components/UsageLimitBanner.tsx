// Usage limit banner component inspired by Notion's friendly upgrade prompts
// Shows current usage against limits and provides upgrade CTAs

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Zap, AlertTriangle } from 'lucide-react';
import { 
  getUserSubscription, 
  getUserUsage,
  hasFeatureAccess 
} from '@/services/subscriptionService';
import { 
  SUBSCRIPTION_TIERS, 
  getUsagePercentage,
  getLimitMessage 
} from '@/types/subscription';
import type { UserSubscription, UsageStats } from '@/types/subscription';

interface UsageLimitBannerProps {
  type?: 'compact' | 'detailed';
  showUpgradeButton?: boolean;
  className?: string;
}

export function UsageLimitBanner({ 
  type = 'compact', 
  showUpgradeButton = true,
  className = '' 
}: UsageLimitBannerProps) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsageData = async () => {
      try {
        setLoading(true);
        const [subscriptionData, usageData] = await Promise.all([
          getUserSubscription(),
          getUserUsage()
        ]);
        
        setSubscription(subscriptionData);
        setUsage(usageData);
        setError(null);
      } catch (err) {
        console.error('Error loading usage data:', err);
        setError('Failed to load usage information');
      } finally {
        setLoading(false);
      }
    };

    loadUsageData();
  }, []);

  const handleUpgrade = () => {
    // TODO: Implement upgrade flow (Stripe checkout)
    console.log('Opening upgrade flow...');
    // For now, just redirect to a placeholder
    window.open('/upgrade', '_blank');
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-16 bg-muted rounded-md"></div>
      </div>
    );
  }

  if (error || !subscription || !usage) {
    return null;
  }

  const limits = SUBSCRIPTION_TIERS[subscription.tier];
  const journalPercentage = getUsagePercentage(usage.journalEntriesCount, limits.maxJournalEntries);
  const templatePercentage = getUsagePercentage(usage.templatesCount, limits.maxTemplates);
  
  // Determine if user is approaching or at limits
  const isApproachingJournalLimit = journalPercentage >= 40;
  const isApproachingTemplateLimit = templatePercentage >= 40;
  const isAtAnyLimit = journalPercentage >= 100 || templatePercentage >= 100;

  // Don't show banner for pro/team users unless they want detailed view
  if (subscription.tier !== 'free' && type === 'compact') {
    return null;
  }

  if (type === 'compact') {
    // Show compact banner when approaching limits
    if (!isApproachingJournalLimit && !isApproachingTemplateLimit && !isAtAnyLimit) {
      return null;
    }

    return (
      <Alert className={`${className} ${isAtAnyLimit ? 'border-destructive' : 'border-warning'}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div>
            {isAtAnyLimit ? (
              <span className="font-medium">You've reached your {subscription.tier} plan limits</span>
            ) : (
              <span>
                You're using {Math.max(journalPercentage, templatePercentage).toFixed(0)}% of your {subscription.tier} plan
              </span>
            )}
          </div>
          {showUpgradeButton && (
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              className="ml-4"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Detailed view
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Your Plan</h3>
            <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'}>
              {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
            </Badge>
          </div>
          {subscription.tier === 'free' && showUpgradeButton && (
            <Button onClick={handleUpgrade} size="sm">
              <TrendingUp className="h-3 w-3 mr-1" />
              Upgrade to Pro
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {/* Journal Entries Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Journal Entries</span>
              <span className="text-sm text-muted-foreground">
                {limits.maxJournalEntries === 'unlimited' 
                  ? `${usage.journalEntriesCount} entries`
                  : `${usage.journalEntriesCount} / ${limits.maxJournalEntries}`
                }
              </span>
            </div>
            {limits.maxJournalEntries !== 'unlimited' && (
              <Progress value={journalPercentage} className="h-2" />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {getLimitMessage('journal', subscription.tier)}
            </p>
          </div>

          {/* Templates Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Templates</span>
              <span className="text-sm text-muted-foreground">
                {limits.maxTemplates === 'unlimited' 
                  ? `${usage.templatesCount} templates`
                  : `${usage.templatesCount} / ${limits.maxTemplates}`
                }
              </span>
            </div>
            {limits.maxTemplates !== 'unlimited' && (
              <Progress value={templatePercentage} className="h-2" />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {getLimitMessage('template', subscription.tier)}
            </p>
          </div>

          {/* Feature Access */}
          {subscription.tier === 'free' && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Unlock with Pro:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  AI Features
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Advanced Search
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Priority Support
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 