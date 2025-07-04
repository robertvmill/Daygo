'use client';

// Import the SidebarProvider component for managing sidebar state
import { SidebarProvider } from "@/components/ui/sidebar";

/**
 * Layout component for the templates section of the app
 * Wraps all template-related pages with the SidebarProvider
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 */
export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Initialize SidebarProvider with sidebar open by default
    <SidebarProvider defaultOpen>
      {children}
    </SidebarProvider>
  );
} 