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


