'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TestTube, User, Database, Wifi, WifiOff } from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface SubscriptionData {
  userId: string;
  tier: 'free' | 'pro' | 'team';
  status: string;
  createdAt: any;
  updatedAt: any;
}

export function SubscriptionDebug() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by ensuring component is mounted before showing dynamic content
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for auth changes
  useEffect(() => {
    if (!mounted) return;
    
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setUserEmail(user.email);
      } else {
        setUserId(null);
        setUserEmail(null);
        setSubscriptionData(null);
      }
    });

    return () => unsubscribe();
  }, [mounted]);

  // Monitor network connectivity - only after component is mounted
  useEffect(() => {
    if (!mounted) return;
    
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionError(null);
      console.log('🌐 Network connection restored');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionError('Network disconnected');
      console.log('🚫 Network connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state only after mounting to avoid hydration mismatch
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [mounted]);

  // Listen for real-time subscription changes
  useEffect(() => {
    if (!userId || !mounted) return;

    console.log(`👂 Listening for subscription changes for user: ${userId}`);
    
    const subscriptionRef = doc(db, 'subscriptions', userId);
    const unsubscribe = onSnapshot(subscriptionRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as SubscriptionData;
        console.log('📊 Real-time subscription update:', data);
        setSubscriptionData(data);
        setLastUpdate(new Date());
        setConnectionError(null); // Clear any connection errors on successful update
        
        // Show toast when subscription changes (only if tier actually changed)
        if (subscriptionData && subscriptionData.tier !== data.tier) {
          toast.success(`🎉 Subscription updated to ${data.tier.toUpperCase()}!`);
        }
      } else {
        console.log('📊 No subscription document found');
        setSubscriptionData(null);
      }
    }, (error) => {
      console.error('📊 Subscription listener error:', error);
      
      // Handle different types of errors
      if (error.code === 'unavailable') {
        setConnectionError('Firestore temporarily unavailable');
        console.log('🔄 Firestore service temporarily unavailable, will retry automatically');
      } else if (error.message.includes('INTERNET_DISCONNECTED')) {
        setConnectionError('Internet connection lost');
        console.log('🚫 Internet connection lost, listener will reconnect when online');
      } else {
        setConnectionError(`Connection error: ${error.message}`);
        // Only show toast for non-network errors
        toast.error('Failed to listen for subscription changes');
      }
    });

    return () => {
      console.log(`👂 Cleaning up subscription listener for user: ${userId}`);
      unsubscribe();
    };
  }, [userId, mounted]); // Removed subscriptionData dependency to prevent infinite loops

  // Test manual subscription update
  const testSubscriptionUpdate = async (tier: 'free' | 'pro' | 'team') => {
    if (!userId) {
      toast.error('Please log in first');
      return;
    }

    setLoading(true);
    try {
      console.log(`🧪 Testing subscription update to ${tier} for user ${userId}`);
      
      const response = await fetch('/api/test-subscription-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          tier,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Test subscription update successful:', data);
        toast.success(`Successfully updated subscription to ${tier}!`);
      } else {
        console.error('❌ Test subscription update failed:', data);
        toast.error(data.error || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('💥 Error testing subscription update:', error);
      toast.error('Failed to test subscription update');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state until component is mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Subscription Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!userId) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Subscription Debug
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to see subscription debug information.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Subscription Debug - Real-time Firebase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="space-y-2">
          <h3 className="font-semibold">👤 User Info</h3>
          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
            <p><strong>User ID:</strong> <code className="bg-white px-2 py-1 rounded text-sm">{userId}</code></p>
            <p><strong>Email:</strong> <code className="bg-white px-2 py-1 rounded text-sm">{userEmail}</code></p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
            Connection Status
          </h3>
          <div className="bg-gray-50 p-3 rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? 'default' : 'destructive'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              {connectionError && (
                <Badge variant="outline" className="text-orange-600">
                  {connectionError}
                </Badge>
              )}
            </div>
            {!isOnline && (
              <p className="text-sm text-muted-foreground">
                Real-time updates are paused. They will resume when connection is restored.
              </p>
            )}
          </div>
        </div>

        {/* Subscription Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">🔥 Firebase Subscription Data</h3>
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <p><strong>Firestore Path:</strong> <code className="bg-white px-2 py-1 rounded text-sm">subscriptions/{userId}</code></p>
            {subscriptionData ? (
              <div className="space-y-1">
                <div><strong>Tier:</strong> <Badge variant={subscriptionData.tier === 'pro' ? 'default' : 'secondary'}>{subscriptionData.tier.toUpperCase()}</Badge></div>
                <div><strong>Status:</strong> <Badge variant="outline">{subscriptionData.status}</Badge></div>
                <div><strong>Created:</strong> {subscriptionData.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}</div>
                <div><strong>Updated:</strong> {subscriptionData.updatedAt?.toDate?.()?.toLocaleString() || 'N/A'}</div>
              </div>
            ) : (
              <p className="text-muted-foreground">No subscription data found in Firebase</p>
            )}
          </div>
        </div>

        {/* Last Update */}
        {lastUpdate && (
          <div className="space-y-2">
            <h3 className="font-semibold">⏰ Last Real-time Update</h3>
            <p className="text-sm text-muted-foreground">
              {lastUpdate.toLocaleString()} (changes appear automatically)
            </p>
          </div>
        )}

        {/* Test Buttons */}
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test Subscription Updates
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => testSubscriptionUpdate('free')}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              Set to Free
            </Button>
            <Button
              onClick={() => testSubscriptionUpdate('pro')}
              disabled={loading}
              variant="default"
              size="sm"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              Set to Pro
            </Button>
            <Button
              onClick={() => testSubscriptionUpdate('team')}
              disabled={loading}
              variant="secondary"
              size="sm"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              Set to Team
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            These buttons directly update your subscription in Firebase. Changes appear in real-time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 