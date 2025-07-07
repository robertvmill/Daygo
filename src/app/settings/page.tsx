'use client';

import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { 
  Settings, 
  Database, 
  Key, 
  Bell, 
  User, 
  ChevronRight,
  CloudUpload,
  Shield
} from "lucide-react";
import Link from 'next/link';

type SettingsItem = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  highlight?: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  
  // Make sure user is authenticated
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login');
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  const settingsItems: SettingsItem[] = [
    {
      title: 'Account Settings',
      description: 'Manage your account details and preferences',
      icon: <User className="h-5 w-5" />,
      href: '/settings/account'
    },
    {
      title: 'Data Encryption',
      description: 'View and manage your data encryption settings',
      icon: <Shield className="h-5 w-5" />,
      href: '/settings/encryption',
      highlight: true
    },
    {
      title: 'API Keys',
      description: 'Manage API keys for external services',
      icon: <Key className="h-5 w-5" />,
      href: '/settings/api-keys'
    },
    {
      title: 'Notifications',
      description: 'Configure your notification preferences',
      icon: <Bell className="h-5 w-5" />,
      href: '/settings/notifications'
    },
    {
      title: 'Pinecone Index',
      description: 'Manage your journal entry vector database',
      icon: <Database className="h-5 w-5" />,
      href: '/settings/pinecone-index'
    },
    {
      title: 'Data Backup',
      description: 'Export and back up your journal data',
      icon: <CloudUpload className="h-5 w-5" />,
      href: '/settings/backup'
    }
  ];
  
  return (
    <div className="grid grid-cols-[auto_1fr] min-h-screen">
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <header className="flex sticky top-0 z-10 h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 overflow-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Manage your application preferences and configurations.
              </p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {settingsItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className={`h-full cursor-pointer transition-all hover:shadow-md ${item.highlight ? 'border-primary/50 bg-primary/5' : ''}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-md font-medium">
                      {item.title}
                    </CardTitle>
                    <div className={`rounded-full p-1 ${item.highlight ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                      {item.icon}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="ghost" size="sm" className="px-0">
                      <span>Configure</span>
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
} 