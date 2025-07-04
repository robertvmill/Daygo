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

  useEffect(() => {
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
  }, []);

  const handleTestUpgrade = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/test-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier: 'pro' })
      });
      
      if (response.ok) {
        // Reload data
        const [subData, usageData] = await Promise.all([
          getUserSubscription(),
          getUserUsage()
        ]);
        setSubscription(subData);
        setUsage(usageData);
        alert('✅ Successfully upgraded to Pro!');
      } else {
        const error = await response.json();
        alert('❌ Failed to upgrade: ' + error.error);
      }
    } catch (err) {
      alert('❌ Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleTestDowngrade = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/test-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier: 'free' })
      });
      
      if (response.ok) {
        // Reload data
        const [subData, usageData] = await Promise.all([
          getUserSubscription(),
          getUserUsage()
        ]);
        setSubscription(subData);
        setUsage(usageData);
        alert('✅ Successfully downgraded to Free!');
      } else {
        const error = await response.json();
        alert('❌ Failed to downgrade: ' + error.error);
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

  if (loading) return <div>Loading subscription data...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!userId) return <div>Please log in to view subscription data</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug: Subscription Status</CardTitle>
          <CardDescription>Real-time data from Firestore collections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">📋 User Info</h3>
            <p><strong>User ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{userId}</code></p>
            <p><strong>Email:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{userEmail || 'Not available'}</code></p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">💳 Subscription (from `subscriptions` collection)</h3>
            {subscription ? (
              <div className="space-y-2">
                <div><strong>Tier:</strong> <Badge variant={subscription.tier === 'pro' ? 'default' : 'secondary'}>{subscription.tier.toUpperCase()}</Badge></div>
                <div><strong>Status:</strong> <Badge variant="outline">{subscription.status}</Badge></div>
                <p><strong>Firestore Path:</strong> <code className="bg-gray-100 px-2 py-1 rounded">subscriptions/{userId}</code></p>
                <p><strong>Created:</strong> {subscription.createdAt.toLocaleDateString()}</p>
                <p><strong>Updated:</strong> {subscription.updatedAt.toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-gray-500">No subscription data found</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">📊 Usage (from `usage` collection)</h3>
            {usage ? (
              <div className="space-y-2">
                <p><strong>Journal Entries:</strong> {usage.journalEntriesCount}</p>
                <p><strong>Templates:</strong> {usage.templatesCount}</p>
                <p><strong>Firestore Path:</strong> <code className="bg-gray-100 px-2 py-1 rounded">usage/{userId}</code></p>
                <p><strong>Last Updated:</strong> {usage.lastUpdated.toLocaleDateString()}</p>
              </div>
            ) : (
              <p className="text-gray-500">No usage data found</p>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="font-semibold mb-2">🔧 Production Actions</h3>
              <Button onClick={handleFixSubscription} className="bg-green-600 hover:bg-green-700">
                🔄 Fix My Subscription (Syncs with Stripe)
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                This verifies your actual Stripe purchase and updates Firestore accordingly
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">🧪 Test Actions (Development Only)</h3>
              <div className="space-x-2">
                <Button onClick={handleTestUpgrade} disabled={subscription?.tier === 'pro'}>
                  ⬆️ Test Upgrade to Pro
                </Button>
                <Button onClick={handleTestDowngrade} variant="outline" disabled={subscription?.tier === 'free'}>
                  ⬇️ Test Downgrade to Free
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 