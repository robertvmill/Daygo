'use client';

// Import necessary components and hooks
import { useState } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { signInWithEmail, signInWithGoogle } from "@/lib/authUtils";
import { FirebaseError } from 'firebase/app';
import { motion } from "framer-motion";
import { Calendar, CheckCircle, Clock, Eye, EyeOff, Sparkles } from "lucide-react";
import { DayGoLogo } from '@/components/DayGoLogo';

// Main login page component
// Designer: This is the main login page that handles both email and Google authentication
// It includes a split layout with app info on the left and login form on the right
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();

  // Handle email/password sign in
  // Designer: This handles form submission and displays appropriate error messages
  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);
      toast.success('Signed in successfully');
      
      // Use replace instead of push for smoother navigation
      router.replace('/home');
    } catch (error: unknown) {
      if (error instanceof FirebaseError) {
        // Handle Firebase errors
        switch (error.code) {
          case 'auth/invalid-email':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
            setError('Invalid email or password. Please try again.');
            break;
          default:
            setError('An error occurred. Please try again.');
        }
      } else {
        // Handle other errors
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google sign in
  // Designer: This provides a simple Google authentication flow
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await signInWithGoogle();
      toast.success('Signed in successfully');
      
      // Use replace instead of push for smoother navigation
      router.replace('/home');
    } catch (error: unknown) {
      if (error instanceof FirebaseError) {
        setError('Google sign-in failed');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navigation */}
      {/* Designer: Fixed navigation bar with enhanced blur effect and smooth entrance animation */}
      <motion.nav 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <DayGoLogo size={36} variant="system" />
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-primary hover:text-primary/90 transition-colors">
              Log in
            </Link>
            <Button asChild size="sm" className="rounded-full px-4 shadow-sm">
              <Link href="/register">Sign up</Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      <div className="flex flex-1 flex-col">
        {/* Main content - Login form first */}
        {/* Designer: Enhanced login form with improved styling and password visibility toggle */}
        <div className="w-full pt-28 pb-16 px-6 md:px-12 flex items-center justify-center bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Don&apos;t have an account yet?{" "}
                <Link href="/register" className="font-medium text-primary hover:text-primary/90 transition-colors">
                  Sign up now
                </Link>
              </p>
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20"
              >
                {error}
              </motion.div>
            )}
            
            <form className="mt-8 space-y-6" onSubmit={handleEmailSignIn}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="pl-3 pr-3 py-2 h-11 bg-background border-border focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 transition-all duration-200"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="text-sm">
                      <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/90 transition-colors">
                        Forgot password?
                      </Link>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="pl-3 pr-10 py-2 h-11 bg-background border-border focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 transition-all duration-200"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember-me" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label htmlFor="remember-me" className="text-sm text-muted-foreground">
                      Remember me
                    </Label>
                  </div>
                </div>
              </div>

              <div>
                <Button 
                  type="submit" 
                  className="w-full h-11 rounded-md font-medium shadow-sm transition-all duration-300 hover:shadow-md"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            </form>

            {/* Designer: Divider with "Or continue with" text */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-background px-4 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Designer: Enhanced Google sign in button with improved styling */}
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  className="w-full h-11 rounded-md font-medium border-border hover:bg-accent hover:text-accent-foreground transition-all duration-200"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Sign in with Google
                </Button>
              </div>
            </div>

            {/* Designer: Terms and privacy links with improved styling */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="font-medium text-primary hover:text-primary/90 transition-colors">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-primary hover:text-primary/90 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Marketing content moved below the form */}
        {/* Designer: Enhanced marketing content with card-style features and improved animations */}
        <div className="w-full bg-muted py-16 px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="text-center mb-12">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="inline-flex items-center bg-background rounded-full px-4 py-1.5 mb-6 shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-primary mr-2" />
                  <span className="text-sm font-medium">Journaling reimagined</span>
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                  Design your days with
                  <span className="relative ml-2">
                    intention
                    <motion.div
                      className="absolute -bottom-2 left-0 h-3 w-full bg-primary/20 -z-10"
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.8, delay: 0.8 }}
                    />
                  </span>
                </h2>

                <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
                  DayGo helps you create structured journal templates and daily rituals 
                  that lead to deeper self-awareness and enhanced productivity.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: <Calendar className="h-6 w-6" />,
                    title: "Custom templates",
                    description: "Create personalized journal templates that fit your unique needs and goals"
                  },
                  {
                    icon: <CheckCircle className="h-6 w-6" />,
                    title: "Track your progress",
                    description: "Monitor your growth and celebrate small wins with built-in tracking tools"
                  },
                  {
                    icon: <Clock className="h-6 w-6" />,
                    title: "Daily rituals",
                    description: "Build consistent habits and routines that transform your productivity"
                  }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + (i * 0.2) }}
                    className="bg-background border border-border/40 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="bg-primary/10 p-3 rounded-full text-primary">
                        {feature.icon}
                      </div>
                    </div>
                    <h3 className="font-semibold text-center mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm text-center">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 