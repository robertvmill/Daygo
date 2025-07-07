// This is the layout component for the account section of our website
// It provides a consistent structure for all account-related pages

// 'use client' tells Next.js this component runs in the browser, not on the server
'use client';

// We import the SidebarProvider component that manages the sidebar state
import { SidebarProvider } from "@/components/ui/sidebar";

// This is the main layout component that wraps all account pages
// It takes a special property called 'children' which represents the content of each page
export default function AccountLayout({
  children,
}: {
  // children is of type React.ReactNode, which means it can contain any valid React content
  children: React.ReactNode;
}) {
  // The component returns the page content wrapped in a SidebarProvider
  // defaultOpen={true} means the sidebar starts in an open state
  return (
    <SidebarProvider defaultOpen>
      {/* children represents where the actual page content will be displayed */}
      {children}
    </SidebarProvider>
  );
} 


// Let's explain why we need a layout for the account page:

// 1. Consistent User Interface
// The account layout provides a consistent structure and appearance across all account-related pages.
// This means elements like the sidebar, navigation, and overall page structure remain the same
// as users move between different account sections (settings, profile, etc.)

// 2. Code Reusability
// Instead of repeating the same layout code (like sidebar, header) in every account page,
// we define it once in this layout file. This follows the DRY principle (Don't Repeat Yourself)
// and makes maintenance much easier.

// 3. State Management
// The SidebarProvider we use here manages the sidebar state (open/closed) across all account pages.
// This shared state management would be more difficult without a common layout component.

// 4. Better User Experience
// Having a consistent layout helps users build a mental model of the application structure.
// They know where to find navigation elements and what to expect as they move through the account section.

// 5. Next.js Layout System
// This layout file is part of Next.js's built-in layout system, which allows for:
// - Nested layouts (layouts within layouts)
// - Persistent layout between page changes
// - Layout state preservation during navigation
// - Better performance through layout reuse
