'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Users, Crown, ArrowLeft, RefreshCw } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UsageLimitBanner } from "@/components/UsageLimitBanner";
import { PRICING, SUBSCRIPTION_TIERS } from "@/types/subscription";
import { getUserSubscription, getUserUsage } from "@/services/subscriptionService";
import type { UserSubscription, UsageStats } from "@/types/subscription";
// No need to import stripe config - we'll use env variables directly
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Upgrade page component inspired by Notion's pricing page
export default function UpgradePage() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();

  // Prevent hydration mismatch by ensuring component is mounted before showing dynamic content
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const loadData = async () => {
      try {
        const [subscriptionData, usageData] = await Promise.all([
          getUserSubscription(),
          getUserUsage()
        ]);
        setSubscription(subscriptionData);
        setUsage(usageData);
      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mounted]);

  // Handle return from Stripe checkout
  useEffect(() => {
    if (!mounted) return;
    
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');

    if (success === 'true') {
      toast.success('🎉 Welcome to Pro! Your subscription has been activated.');
      
      // Refresh subscription data after successful checkout with retry logic
      const refreshData = async () => {
        try {
          console.log('🔄 Syncing subscription with Stripe...');
          
          // First sync with Stripe
          const auth = getAuth();
          const user = auth.currentUser;
          
          if (user) {
            const token = await user.getIdToken();
            const syncResponse = await fetch('/api/sync-subscription', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            
            if (syncResponse.ok) {
              const syncData = await syncResponse.json();
              console.log('✅ Subscription synced:', syncData);
              toast.success(`🎉 Welcome to ${syncData.tier.charAt(0).toUpperCase() + syncData.tier.slice(1)}! Your subscription has been activated.`);
            } else {
              console.warn('⚠️ Sync failed, fetching current data anyway');
            }
          }
          
          // Then refresh the UI data
          const [subscriptionData, usageData] = await Promise.all([
            getUserSubscription(),
            getUserUsage()
          ]);
          
          setSubscription(subscriptionData);
          setUsage(usageData);
          
          // Auto-refresh the page to ensure UI is fully updated
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          
        } catch (error) {
          console.error('Error syncing subscription:', error);
          toast.error('Failed to sync subscription. Please try the refresh button.');
        }
      };
      
      refreshData();
    } else if (canceled === 'true') {
      toast.info('Checkout was canceled. You can upgrade anytime!');
    }

    // Clean up URL parameters after handling
    if (success || canceled) {
      window.history.replaceState({}, '', '/upgrade');
    }
  }, [searchParams, mounted]);

  const handleUpgradeToPro = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        toast.error('Please log in to upgrade your plan');
        return;
      }

      // Get the price ID for Pro plan from environment variables
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
      if (!priceId) {
        console.error('Missing NEXT_PUBLIC_STRIPE_PRO_PRICE_ID environment variable');
        toast.error('Pro plan pricing not configured. Please contact support.');
        return;
      }

      console.log('🚀 Starting upgrade process with price ID:', priceId);
      toast.info('Redirecting to checkout...');

      // Get Firebase auth token
      const token = await user.getIdToken();

      // Create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          tier: 'pro',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Checkout session creation failed:', data);
        throw new Error(data.error || 'Failed to create checkout session');
      }

      console.log('✅ Checkout session created:', data.sessionId);

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start upgrade process');
    }
  };

  const handleUpgradeToTeam = () => {
    toast.info('Team plan coming soon! Contact support for early access.');
  };

  const handleRefreshSubscription = async () => {
    setLoading(true);
    try {
      const [subscriptionData, usageData] = await Promise.all([
        getUserSubscription(),
        getUserUsage()
      ]);
      setSubscription(subscriptionData);
      setUsage(usageData);
      toast.success('Subscription status refreshed!');
    } catch (error) {
      console.error('Error refreshing subscription data:', error);
      toast.error('Failed to refresh subscription status');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state until component is mounted to prevent hydration mismatch
  if (!mounted || loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-pulse">Loading...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex sticky top-0 z-10 h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/home">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Upgrade</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex flex-1 flex-col gap-8 p-4 md:p-8 max-w-6xl mx-auto w-full">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Crown className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Unlock Your Full Potential</h1>
            </div>
                         <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
               Choose the plan that works best for your journaling journey. 
               Start free, upgrade when you&apos;re ready to do more.
             </p>
          </div>

          {/* Current Usage Banner */}
          {subscription && usage && (
            <div className="space-y-4">
              <UsageLimitBanner type="detailed" showUpgradeButton={false} />
              
              {/* Manual Refresh Button for Pro users who just upgraded */}
              {subscription?.tier === 'free' && (
                <div className="flex justify-center">
                  <Button 
                    onClick={handleRefreshSubscription}
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Refreshing...' : 'Refresh Subscription Status'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
            {/* Free Plan */}
            <Card className={`relative ${subscription?.tier === 'free' ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Free</CardTitle>
                  {subscription?.tier === 'free' && (
                    <Badge variant="default">Current Plan</Badge>
                  )}
                </div>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Up to {SUBSCRIPTION_TIERS.free.maxJournalEntries} journal entries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Up to {SUBSCRIPTION_TIERS.free.maxTemplates} custom templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Basic search</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Standard export</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={subscription?.tier === 'free'}
                >
                  {subscription?.tier === 'free' ? 'Current Plan' : 'Downgrade'}
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={`relative ${subscription?.tier === 'pro' ? 'ring-2 ring-primary' : 'ring-2 ring-primary/20'}`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge variant="default" className="bg-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Pro</CardTitle>
                  {subscription?.tier === 'pro' && (
                    <Badge variant="default">Current Plan</Badge>
                  )}
                </div>
                <CardDescription>For serious journalers</CardDescription>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${PRICING.pro.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Unlimited journal entries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Unlimited templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      <Zap className="h-3 w-3 inline mr-1" />
                      AI-powered insights
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Advanced search & export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Shared templates</span>
                  </li>
                </ul>
                <Button 
                  onClick={handleUpgradeToPro}
                  className="w-full"
                  disabled={subscription?.tier === 'pro'}
                >
                  {subscription?.tier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </Button>
              </CardContent>
            </Card>

            {/* Team Plan */}
            <Card className={`relative ${subscription?.tier === 'team' ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Team</CardTitle>
                  {subscription?.tier === 'team' && (
                    <Badge variant="default">Current Plan</Badge>
                  )}
                </div>
                <CardDescription>For families & teams</CardDescription>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${PRICING.team.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Everything in Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      <Users className="h-3 w-3 inline mr-1" />
                      Collaborative journaling
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Team templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Admin controls</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Advanced analytics</span>
                  </li>
                </ul>
                <Button 
                  onClick={handleUpgradeToTeam}
                  variant="outline"
                  className="w-full"
                  disabled={subscription?.tier === 'team'}
                >
                  {subscription?.tier === 'team' ? 'Current Plan' : 'Coming Soon'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="text-center space-y-4 pt-8 border-t">
            <h3 className="text-2xl font-semibold">Questions about upgrading?</h3>
            <p className="text-muted-foreground">
              You can upgrade or downgrade your plan at any time. 
              Your data is always safe and accessible across all plans.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" asChild>
                <Link href="/settings">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Settings
                </Link>
              </Button>
              <Button variant="outline" onClick={handleRefreshSubscription} disabled={loading}>
                Refresh Status
              </Button>
            </div>
          </div>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 