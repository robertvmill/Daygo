'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

interface NetworkStatusProps {
  showLabel?: boolean;
  variant?: 'badge' | 'icon' | 'full';
}

export function NetworkStatus({ showLabel = false, variant = 'badge' }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (variant === 'icon') {
    return isOnline ? (
      <Wifi className="h-4 w-4 text-green-500" />
    ) : (
      <WifiOff className="h-4 w-4 text-red-500" />
    );
  }

  if (variant === 'full') {
    return (
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <Badge variant={isOnline ? 'default' : 'destructive'}>
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
        {showLabel && (
          <span className="text-sm text-muted-foreground">
            {isOnline ? 'Connected' : 'No internet connection'}
          </span>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <Badge variant={isOnline ? 'default' : 'destructive'}>
      {isOnline ? 'Online' : 'Offline'}
    </Badge>
  );
} 