'use client';

import { useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { EncryptionSettings } from "@/components/EncryptionSettings";

/**
 * Settings page for data encryption configuration
 * Shows users their current encryption status and provides information about data protection
 */
export default function EncryptionSettingsPage() {
  const router = useRouter();
  
  // Make sure user is authenticated before showing sensitive settings
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        // Redirect to login if user is not authenticated
        router.push('/login');
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="grid grid-cols-[auto_1fr] min-h-screen">
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        {/* Header with breadcrumbs */}
        <header className="flex sticky top-0 z-10 h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Data Encryption</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        {/* Main content area */}
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 overflow-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Data Encryption</h1>
              <p className="text-muted-foreground">
                Manage how your sensitive data is protected when stored in the cloud.
              </p>
            </div>
          </div>
          
          {/* Encryption settings component */}
          <EncryptionSettings />
        </main>
      </SidebarInset>
    </div>
  );
} 