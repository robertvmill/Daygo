'use client';

import { useState } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerUser } from "@/lib/authUtils";
import { FirebaseError } from 'firebase/app';
import { motion } from "framer-motion";
import { Calendar, CheckCircle, Clock, Sparkles } from "lucide-react";
import { DayGoLogo } from '@/components/DayGoLogo';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords don&apos;t match");
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await registerUser(name, email, password);
      toast.success('Account created successfully');
      router.replace('/home');
    } catch (error: unknown) {
      if (error instanceof FirebaseError) {
        // Handle Firebase errors
        switch (error.code) {
          case 'auth/email-already-in-use':
            setError('Email is already in use');
            break;
          case 'auth/invalid-email':
            setError('Invalid email address');
            break;
          case 'auth/weak-password':
            setError('Password is too weak');
            break;
          default:
            setError('An error occurred during registration');
        }
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <DayGoLogo size={36} variant="system" />
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Button asChild size="sm" className="rounded-full px-4">
              <Link href="/register">Sign up</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 flex-col">
        {/* Main content - Registration form first */}
        <div className="w-full pt-24 pb-16 px-6 md:px-12 flex items-center justify-center bg-background">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-bold tracking-tight">Create your account</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:text-primary/90">
                  Sign in
                </Link>
              </p>
            </div>
            
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            
            <form className="mt-8 space-y-6" onSubmit={handleRegister}>
              <div className="space-y-4 rounded-md">
                <div>
                  <Label htmlFor="name" className="block text-sm font-medium">
                    Full name
                  </Label>
                  <div className="mt-1">
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      className="block w-full"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="block text-sm font-medium">
                    Email address
                  </Label>
                  <div className="mt-1">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="block w-full"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="block text-sm font-medium">
                    Password
                  </Label>
                  <div className="mt-1">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="block w-full"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="block text-sm font-medium">
                    Confirm password
                  </Label>
                  <div className="mt-1">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="block w-full"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Button type="submit" className="w-full h-12 rounded-md" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
              </div>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              By registering, you agree to our{" "}
              <Link href="/terms" className="font-medium text-primary hover:text-primary/90">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-primary hover:text-primary/90">
                Privacy Policy
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Marketing content moved below the form */}
        <div className="w-full bg-muted py-16 px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <div className="text-center mb-12">
                <div className="inline-flex items-center bg-background rounded-full px-4 py-1 mb-6">
                  <Sparkles className="w-4 h-4 text-primary mr-2" />
                  <span className="text-sm font-medium">Journaling reimagined</span>
                </div>

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
                    className="text-center"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="bg-background p-3 rounded-full text-primary">
                        {feature.icon}
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
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