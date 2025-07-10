'use client';

// Import necessary components and hooks
import { useState, useEffect, useRef } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, BarChart2, Book, Pencil, PenTool, Feather, Mail, CheckCircle } from "lucide-react"; 
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getAuth, onAuthStateChanged, sendSignInLinkToEmail } from "firebase/auth";
import { DayGoLogo } from '@/components/DayGoLogo';
import Image from "next/image";
import { toast } from "sonner";

// Journal sketch component for decorative elements
// Designer: Creates hand-drawn style decorative lines that look like sketches in a journal
const JournalSketch = ({ className = "", style = {} }) => {
  return (
    <svg 
      viewBox="0 0 200 100" 
      className={`opacity-70 ${className}`}
      style={style}
      aria-hidden="true"
    >
      {/* Hand-drawn style lines that look like doodles in a journal */}
      <path 
        d="M20,50 C30,40 50,80 80,50 S120,30 150,60 S180,40 190,50" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeLinecap="round"
        className="opacity-40"
        strokeDasharray="1,2"
      />
      <path 
        d="M30,30 C60,20 100,70 160,30" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeLinecap="round"
        className="opacity-30"
      />
      <path 
        d="M40,80 C70,90 120,60 170,80" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeLinecap="round"
        className="opacity-30"
      />
    </svg>
  );
};

// Decorative paper corner fold
// Designer: Creates a realistic folded paper corner effect like pages in a journal
const PaperCorner = ({ position = "top-right", className = "" }: { position?: "top-right" | "top-left" | "bottom-right" | "bottom-left", className?: string }) => {
  const positionClasses = {
    "top-right": "top-0 right-0 origin-top-right",
    "top-left": "top-0 left-0 origin-top-left rotate-90",
    "bottom-right": "bottom-0 right-0 origin-bottom-right -rotate-90",
    "bottom-left": "bottom-0 left-0 origin-bottom-left rotate-180"
  };

  return (
    <div className={`absolute w-12 h-12 ${positionClasses[position]} ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path 
          d="M0,0 L100,0 L100,100 Z" 
          fill="currentColor" 
          className="opacity-10"
        />
        <path 
          d="M100,0 L100,100 L0,0 Z" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          className="opacity-30"
        />
      </svg>
    </div>
  );
};

// Email Signup Modal Component
// Designer: Simple modal that only asks for email, no password needed
const EmailSignupModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Handle email signup with magic link
  // Designer: This sends a magic link to the user's email for passwordless authentication
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const auth = getAuth();
      
      // Configure email link settings
      const actionCodeSettings = {
        // URL user will be redirected to after clicking the email link
        url: `${window.location.origin}/auth/verify-email`,
        handleCodeInApp: true,
      };

      // Send magic link to user's email
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save email locally to complete sign-in when they return
      window.localStorage.setItem('emailForSignIn', email);
      
      setIsSuccess(true);
      toast.success('Magic link sent! Check your email to complete signup.');
    } catch (error) {
      console.error('Error sending email link:', error);
      setError('Failed to send magic link. Please try again.');
      toast.error('Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when modal closes
  const handleClose = () => {
    setEmail('');
    setError('');
    setIsSuccess(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Feather className="h-5 w-5 text-primary" />
            {isSuccess ? 'Check your email!' : 'Start your journaling journey'}
          </DialogTitle>
          <DialogDescription>
            {isSuccess 
              ? 'We\'ve sent you a magic link to sign in. Click the link in your email to get started!'
              : 'Enter your email address and we\'ll send you a magic link to get started - no password needed!'
            }
          </DialogDescription>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="flex flex-col items-center py-6 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Magic link sent!</h3>
              <p className="text-sm text-muted-foreground">
                Check your email at <span className="font-medium">{email}</span> and click the link to sign in.
              </p>
            </div>
            <Button onClick={handleClose} variant="outline" className="w-full">
              Got it
            </Button>
          </div>
        ) : (
          <form onSubmit={handleEmailSignup} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Feather className="mr-2 h-4 w-4" />
                    Send magic link
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-foreground">Terms</Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Main landing page component
// Designer: This is the main landing page that users see when not logged in
// It includes a hero section, features section, CTA section and footer with journal theming
export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sketch effect for canvas - creates journal paper lines
  // Designer: This draws ruled lines like you'd see in a real journal or notebook
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
      
      // Draw subtle grid lines like journal paper
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'currentColor';
      ctx.lineWidth = 0.2;
      
      // Horizontal lines - like the ruled lines in a notebook
      for (let y = 40; y < window.innerHeight; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(window.innerWidth, y);
        ctx.globalAlpha = 0.07;
        ctx.stroke();
      }
      
      // Vertical line (margin) - like the red margin line in school notebooks
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.lineTo(40, window.innerHeight);
      ctx.globalAlpha = 0.1;
      ctx.stroke();
    };
    
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Check authentication status on mount
  // Designer: This handles redirecting logged in users to their dashboard
  useEffect(() => {
    // Skip authentication check if already redirecting
    if (isRedirecting) return;

    const auth = getAuth();
    
    // Check if user is already authenticated when component mounts
    const currentUser = auth.currentUser;
    if (currentUser) {
      setIsAuthenticated(true);
      setIsLoading(false);
      
      // Use direct window.location for reliable redirects
      console.log("User already authenticated, redirecting via window.location");
      window.location.href = '/home';
      return;
    }
    
    // Otherwise, set up the auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isUserAuthenticated = !!user;
      setIsAuthenticated(isUserAuthenticated);
      setIsLoading(false);
      
      // Redirect authenticated users to home dashboard
      if (isUserAuthenticated && pathname === '/') {
        console.log('User authenticated, redirecting to /home');
        setIsRedirecting(true);
        router.replace('/home');
      }
    });
    
    return () => unsubscribe();
  }, [router, pathname, isRedirecting]);

  // Navigation handlers
  const handleLogin = () => {
    router.push("/login");
  };

  const handleSignUp = () => {
    router.push("/register");
  };

  // Handle start journaling - opens email modal instead of going to register page
  // Designer: This opens the simple email signup modal for faster onboarding
  const handleStartJournaling = () => {
    setShowEmailModal(true);
  };

  // Handle loading state
  // Designer: Show a simple loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // For authenticated users, we redirect in the useEffect hook
  // Designer: This is a fallback loading state while redirect happens
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Redirecting to your dashboard...</div>
      </div>
    );
  }

  // Main landing page for non-authenticated users
  // Designer: The main landing page layout starts here with journal theming
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Journal paper background effect */}
      {/* Designer: Creates subtle ruled lines like you'd see in a real journal */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-40"
        aria-hidden="true"
      />
      
      {/* Navigation */}
      {/* Designer: Fixed navigation bar with blur effect and journal-themed elements */}
      <header className="fixed w-full top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <DayGoLogo size={36} variant="system" />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleLogin}>
              Log in
            </Button>
            <Button variant="default" onClick={handleSignUp} className="group">
              Sign up
              <PenTool className="ml-2 h-4 w-4 transition-transform group-hover:rotate-12" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {/* Designer: Main hero section with journal sketches and hand-drawn underlines */}
      <div className="w-full px-4 pt-32 pb-24 flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Decorative journal sketches - like doodles in margins */}
        <JournalSketch 
          className="absolute top-20 left-10 w-40 h-20 text-primary/30 z-10 rotate-12" 
        />
        <JournalSketch 
          className="absolute bottom-20 right-10 w-40 h-20 text-primary/30 z-10 -rotate-12" 
        />
        
        <div className="container mx-auto relative">
          <div className="inline-flex items-center justify-center px-4 py-2 mb-8 rounded-full border border-border gap-2 bg-secondary/70 backdrop-blur-sm relative z-10">
            <span className="bg-primary h-2 w-2 rounded-full"></span>
            <span className="text-sm font-medium">Journaling reimagined</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight max-w-3xl mx-auto relative z-10 text-foreground">
            Design your days with <span className="text-primary relative">
              intention
              {/* Hand-drawn style underline */}
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" aria-hidden="true">
                <path 
                  d="M0,5 C20,0 40,10 60,5 S80,0 100,5" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  className="text-primary/50"
                />
              </svg>
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto relative z-10">
            DayGo helps you create structured journal templates and daily rituals
            that lead to deeper self-awareness and enhanced productivity.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center relative z-10">
            <Button 
              size="lg" 
              className="px-8 py-6 text-lg bg-primary/90 backdrop-blur-sm hover:bg-primary group" 
              onClick={handleStartJournaling}
            >
              Start your journaling journey
              <Feather className="ml-2 h-5 w-5 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-8 py-6 text-lg backdrop-blur-sm bg-background/50" 
              onClick={handleLogin}
            >
              Log in
            </Button>
          </div>
          
          {/* Decorative paper corner - like a folded page */}
          <PaperCorner position="bottom-right" className="z-10 text-primary" />
        </div>
      </div>
      
      {/* Features Section */}
      {/* Designer: Three column feature grid with paper corner effects on hover */}
      <div className="bg-muted/80 backdrop-blur-sm py-24 relative z-10">
        <div className="container mx-auto px-4 relative">
          {/* Decorative elements - like compass or journal decoration */}
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 opacity-30">
            <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" />
              <path d="M30,50 L70,50 M50,30 L50,70" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-background/70 backdrop-blur-sm border-background/20 relative group overflow-hidden">
              <PaperCorner position="top-right" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader>
                <Book className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-xl">Custom templates</CardTitle>
                <CardDescription>
                  Create personalized journal templates that fit your unique needs and goals
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-background/70 backdrop-blur-sm border-background/20 relative group overflow-hidden">
              <PaperCorner position="top-right" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader>
                <BarChart2 className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-xl">Track your progress</CardTitle>
                <CardDescription>
                  Monitor your growth and celebrate small wins with built-in tracking tools
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-background/70 backdrop-blur-sm border-background/20 relative group overflow-hidden">
              <PaperCorner position="top-right" className="opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader>
                <CalendarDays className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="text-xl">Daily rituals</CardTitle>
                <CardDescription>
                  Build consistent habits and routines that transform your productivity
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Journal Inspiration Section */}
      {/* Designer: New section showcasing actual journaling with handwritten-style elements */}
      <div className="w-full px-4 py-24 relative z-10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-1/2 relative">
              <div className="relative rounded-lg overflow-hidden border border-border shadow-lg">
                <Image 
                  src="/journal_books.png" 
                  alt="Journal example" 
                  width={600} 
                  height={400}
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-sm italic text-foreground/80">&ldquo;Today I reflected on my goals for the quarter...&rdquo;</p>
                </div>
              </div>
              
              {/* Decorative elements - like margin doodles */}
              <div className="absolute -bottom-6 -right-6 w-20 h-20 text-primary/30 transform rotate-12">
                <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
                  <path 
                    d="M20,50 C40,30 60,70 80,50" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M20,30 C40,50 60,10 80,30" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                  <path 
                    d="M20,70 C40,90 60,50 80,70" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            
            <div className="w-full md:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 relative inline-block">
                Your thoughts, <span className="text-primary">beautifully captured</span>
                {/* Hand-drawn style underline */}
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" aria-hidden="true">
                  <path 
                    d="M0,5 C30,10 70,0 100,5" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    className="text-primary/40"
                  />
                </svg>
              </h2>
              
              <p className="text-lg text-muted-foreground mb-6">
                DayGo provides the perfect canvas for your thoughts, dreams, and reflections. 
                Our intuitive interface makes journaling a delightful part of your daily routine.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <Pencil className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-foreground/80">
                    <span className="font-medium">Distraction-free writing</span> - Focus on your thoughts without clutter
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <Pencil className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-foreground/80">
                    <span className="font-medium">Rich formatting options</span> - Express yourself with style
                  </p>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center mt-1">
                    <Pencil className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-foreground/80">
                    <span className="font-medium">Secure and private</span> - Your thoughts remain yours alone
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Separator with sketch style */}
      {/* Designer: Subtle divider between sections */}
      <div className="container mx-auto px-4 py-8">
        <Separator className="opacity-30" />
      </div>
      
      {/* CTA Section */}
      {/* Designer: Secondary call-to-action section with journal sketches and hand-drawn underlines */}
      <div className="w-full px-4 py-24 text-center relative z-10">
        <div className="container mx-auto relative">
          {/* Decorative elements - like margin doodles */}
          <JournalSketch 
            className="absolute -top-10 left-10 w-40 h-20 text-primary/30 z-0 rotate-6" 
          />
          <JournalSketch 
            className="absolute -bottom-10 right-10 w-40 h-20 text-primary/30 z-0 -rotate-6" 
          />
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 relative inline-block">
            Start your journaling journey today
            {/* Hand-drawn style underline with dashes */}
            <svg className="absolute -bottom-3 left-0 w-full" viewBox="0 0 100 10" aria-hidden="true">
              <path 
                d="M0,5 C20,10 40,0 60,10 S80,0 100,5" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeDasharray="1,3"
                className="text-primary/60"
              />
            </svg>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Join thousands of users who have transformed their lives through intentional journaling with Daygo.
          </p>
          <Button 
            size="lg" 
            className="px-8 py-6 text-lg bg-primary/90 backdrop-blur-sm hover:bg-primary group" 
            onClick={handleStartJournaling}
          >
            Sign up for free
            <Feather className="ml-2 h-5 w-5 transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
          </Button>
        </div>
      </div>
      
      {/* Footer */}
      {/* Designer: Simple footer with logo and copyright */}
      <footer className="bg-muted/90 backdrop-blur-sm py-12 text-center text-muted-foreground relative z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center mb-6">
            <DayGoLogo size={48} variant="system" />
          </div>
          <p>&copy; {new Date().getFullYear()} Daygo. All rights reserved.</p>
        </div>
      </footer>

      {/* Email Signup Modal */}
      {/* Designer: Simple email-only signup modal for faster onboarding */}
      <EmailSignupModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} />
    </div>
  );
}
