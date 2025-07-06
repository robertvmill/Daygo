'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUserSubscription, getUserUsage } from '@/services/subscriptionService';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { UserSubscription, UsageStats } from '@/types/subscription';

export function DebugSubscription() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by ensuring component is mounted before showing dynamic content
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email);
        try {
          const [subData, usageData] = await Promise.all([
            getUserSubscription(),
            getUserUsage()
          ]);
          setSubscription(subData);
          setUsage(usageData);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } else {
        setUserId(null);
        setUserEmail(null);
        setSubscription(null);
        setUsage(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mounted]);

  const handleTestUpgrade = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/test-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Reload data
        const [subData, usageData] = await Promise.all([
          getUserSubscription(),
          getUserUsage()
        ]);
        setSubscription(subData);
        setUsage(usageData);
        alert('✅ ' + result.message);
      } else {
        alert('❌ ' + result.error);
      }
    } catch (err) {
      alert('❌ Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleFixSubscription = async () => {
    if (!userId) return;
    
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        alert('❌ Please log in with an email account to fix your subscription');
        return;
      }

      console.log('Attempting to fix subscription for:', userId, user.email);
      
      const response = await fetch('/api/fix-subscription-simple', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          userEmail: user.email
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Reload data
        const [subData, usageData] = await Promise.all([
          getUserSubscription(),
          getUserUsage()
        ]);
        setSubscription(subData);
        setUsage(usageData);
        alert('✅ ' + result.message);
      } else {
        alert('❌ ' + result.error + (result.suggestion ? '\n\n💡 ' + result.suggestion : ''));
      }
    } catch (err) {
      alert('❌ Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Show loading state until component is mounted to prevent hydration mismatch
  if (!mounted || loading) return <div>Loading subscription data...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!userId) return <div>Please log in to view subscription data</div>;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Subscription Debug</CardTitle>
        <CardDescription>Current subscription and usage information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">User Information</h3>
          <div className="bg-gray-50 p-3 rounded space-y-1">
            <p><strong>User ID:</strong> {userId}</p>
            <p><strong>Email:</strong> {userEmail || 'No email'}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Subscription</h3>
          <div className="bg-gray-50 p-3 rounded space-y-2">
            {subscription ? (
              <>
                <div className="flex items-center gap-2">
                  <strong>Tier:</strong>
                  <Badge variant={subscription.tier === 'pro' ? 'default' : 'secondary'}>
                    {subscription.tier.toUpperCase()}
                  </Badge>
                </div>
                <p><strong>Status:</strong> {subscription.status}</p>
                <p><strong>Customer ID:</strong> {subscription.stripeCustomerId || 'None'}</p>
                <p><strong>Subscription ID:</strong> {subscription.stripeSubscriptionId || 'None'}</p>
                <p><strong>Created:</strong> {subscription.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}</p>
                <p><strong>Updated:</strong> {subscription.updatedAt?.toDate?.()?.toLocaleString() || 'N/A'}</p>
              </>
            ) : (
              <p className="text-gray-500">No subscription data found</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Usage</h3>
          <div className="bg-gray-50 p-3 rounded space-y-1">
            {usage ? (
              <>
                <p><strong>Journal Entries:</strong> {usage.journalEntriesCount}</p>
                <p><strong>Templates:</strong> {usage.templatesCount}</p>
                <p><strong>Last Updated:</strong> {usage.lastUpdated?.toDate?.()?.toLocaleString() || 'N/A'}</p>
              </>
            ) : (
              <p className="text-gray-500">No usage data found</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleTestUpgrade} variant="outline" size="sm">
            Test Upgrade to Pro
          </Button>
          <Button onClick={handleFixSubscription} variant="outline" size="sm">
            Fix Subscription
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 