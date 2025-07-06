'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { initializeAnalytics } from '@/lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Pages that don't require authentication
const publicPages = ['/login', '/register', '/forgot-password', '/'];

export function FirebaseAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by ensuring component is mounted before showing dynamic content
  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to force redirect using window.location if needed
  const forceRedirect = (path: string) => {
    console.log(`Redirecting to ${path}`);
    
    // Use window.location.href directly for critical redirects
    // This bypasses Next.js's router completely, avoiding fetch errors
    window.location.href = path;
  };

  useEffect(() => {
    if (!mounted) return;
    
    // Initialize Firebase Analytics
    const analytics = initializeAnalytics();
    
    // Log page view
    if (analytics) {
      console.log('Firebase Analytics initialized');
    }

    // Prefetch common routes to improve navigation speed
    router.prefetch('/home');
    router.prefetch('/login');
    router.prefetch('/journal');
    
    // Handle authentication
    const auth = getAuth();
    
    // First check if user is already authenticated synchronously
    console.log('Current path:', pathname);
    console.log('Current auth status:', !!auth.currentUser);
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      setAuthChecked(true);
      
      // If on a public page and already authenticated, redirect to home
      if (publicPages.includes(pathname)) {
        console.log('User is authenticated on public page, redirecting to /home');
        forceRedirect('/home');
        return;
      }
    } else if (publicPages.includes(pathname)) {
      // If on a public page and not authenticated, allow access without waiting
      setAuthChecked(true);
    }
    
    // Set up auth state listener for changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthChecked(true);
      console.log('Auth state changed, user:', !!user);
      
      // If on a public page and already authenticated, redirect to home
      if (user && publicPages.includes(pathname)) {
        console.log('Auth changed: User is authenticated on public page, redirecting to /home');
        forceRedirect('/home');
        return;
      }

      // If no user on public pages, allow access without redirect
      if (!user && publicPages.includes(pathname)) {
        return;
      }
      
      // If no user on a protected page, redirect to login
      if (!user && !publicPages.includes(pathname)) {
        console.log('No user detected, redirecting to login page');
        forceRedirect('/login');
        return;
      }
      
      // Log user info if authenticated
      if (user) {
        console.log('User authenticated:', user.uid, user.isAnonymous ? '(anonymous)' : '');
      }
    });

    return () => unsubscribe();
  }, [pathname, router, mounted]);

  // Show loading indicator only for protected pages and only briefly
  // Also prevent hydration mismatch by not showing different content until mounted
  if (!mounted || (!authChecked && !publicPages.includes(pathname))) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
} 