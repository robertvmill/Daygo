/**
 * This is the root layout component for the Daygo app. Here's what it does:
 * 1. Sets up the basic HTML structure with appropriate metadata
 * 2. Provides the AuthProvider for Firebase authentication throughout the app
 * 3. Applies global styles and Tailwind CSS
 * 4. Sets up theme provider for light/dark mode
 * 5. Initializes the Toaster component for notifications
 */

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import { FirebaseAnalyticsProvider } from "@/components/FirebaseAnalyticsProvider";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Daygo - Your Personal Journal",
  description: "Track your thoughts, reflections, and growth with Daygo's flexible journal system.",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseAnalyticsProvider>
            <Navbar />
            {children}
            <Toaster position="bottom-right" />
          </FirebaseAnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
