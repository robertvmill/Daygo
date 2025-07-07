'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function InitUsersPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleInitUsers = async () => {
    if (!confirm('This will initialize ALL users in Firebase Auth with free subscriptions. Are you sure?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/init-all-users', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success(`Successfully initialized ${data.processedUsers} users!`);
      } else {
        throw new Error(data.error || 'Failed to initialize users');
      }
    } catch (error) {
      console.error('Initialization error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Initialize All Users</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Initialization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              This will create documents in both the <code>users</code> and <code>subscriptions</code> collections 
              for ALL users in Firebase Auth, setting them to 'free' tier by default.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="font-semibold">What this does:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Fetches all users from Firebase Authentication</li>
              <li>Creates a document in <code>subscriptions/{userId}</code> with tier: 'free'</li>
              <li>Creates a document in <code>users/{userId}</code> with subscriptionTier: 'free'</li>
              <li>Uses merge: true to avoid overwriting existing data</li>
              <li>Processes users in batches for performance</li>
            </ul>
          </div>

          <Button 
            onClick={handleInitUsers} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Initializing Users...' : 'Initialize All Users'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Initialization Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Total Users Found:</strong> {result.totalUsers}</p>
              <p><strong>Successfully Processed:</strong> {result.processedUsers}</p>
              <p><strong>Errors:</strong> {result.errors}</p>
              <p><strong>Message:</strong> {result.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}