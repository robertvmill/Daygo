'use client';

// Import necessary components and hooks
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, AlertCircle, Loader2 } from "lucide-react";
import { DayGoLogo } from '@/components/DayGoLogo';
import { toast } from "sonner";
import Link from 'next/link';

// Email verification page component
// Designer: This page handles completing the magic link sign-in process
export default function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle email verification when component mounts
  // Designer: This completes the magic link authentication process
  useEffect(() => {
    const auth = getAuth();
    const url = window.location.href;

    // Check if this is a valid email link
    if (isSignInWithEmailLink(auth, url)) {
      // Try to get email from localStorage first
      let savedEmail = window.localStorage.getItem('emailForSignIn');
      
      if (!savedEmail) {
        // If no saved email, we need to ask the user for it
        setNeedsEmail(true);
        setIsLoading(false);
        return;
      }

      // Complete the sign-in process
      completeSignIn(savedEmail, url);
    } else {
      // Invalid link
      setError('Invalid or expired magic link. Please request a new one.');
      setIsLoading(false);
    }
  }, []);

  // Complete the sign-in process with email and magic link
  // Designer: This function finalizes the authentication
  const completeSignIn = async (userEmail: string, url: string) => {
    setIsLoading(true);
    setError('');

    try {
      const auth = getAuth();
      
      // Sign in with the email link
      const result = await signInWithEmailLink(auth, userEmail, url);
      
      // Clear the email from storage
      window.localStorage.removeItem('emailForSignIn');
      
      setIsSuccess(true);
      toast.success('Successfully signed in! Welcome to DayGo!');
      
      // Redirect to home after a short delay
      setTimeout(() => {
        router.replace('/home');
      }, 2000);
      
    } catch (error) {
      console.error('Error completing sign-in:', error);
      setError('Failed to complete sign-in. Please try requesting a new magic link.');
      toast.error('Failed to complete sign-in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual email submission if needed
  // Designer: This allows users to manually enter their email if it wasn't saved
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      completeSignIn(email, window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <DayGoLogo size={36} variant="system" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-md mt-16">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {isLoading ? (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : isSuccess ? (
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              ) : error ? (
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              )}
            </div>
            
            <CardTitle>
              {isLoading ? 'Completing sign-in...' : 
               isSuccess ? 'Welcome to DayGo!' :
               error ? 'Sign-in failed' :
               'Complete your sign-in'}
            </CardTitle>
            
            <CardDescription>
              {isLoading ? 'Please wait while we verify your magic link.' :
               isSuccess ? 'You\'ve been successfully signed in! Redirecting to your dashboard...' :
               error ? error :
               'Enter your email address to complete the sign-in process.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {needsEmail && !isLoading && !isSuccess && !error && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={!email}>
                  Complete sign-in
                </Button>
              </form>
            )}

            {(error || isSuccess) && (
              <div className="space-y-4">
                {error && (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      You can request a new magic link from the homepage.
                    </p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/">
                        Return to homepage
                      </Link>
                    </Button>
                  </div>
                )}
                
                {isSuccess && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Redirecting you to your dashboard...
                    </p>
                    <Button asChild className="w-full">
                      <Link href="/home">
                        Go to dashboard
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isLoading && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  This may take a few moments...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <Link href="/" className="text-primary hover:text-primary/90 underline">
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 