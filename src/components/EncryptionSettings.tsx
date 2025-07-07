"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, Info, AlertTriangle } from 'lucide-react';
import { isEncryptionSupported } from '@/lib/encryption';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Component that shows users information about their data encryption status
 * and provides controls for managing encryption settings.
 * 
 * This helps users understand:
 * - Whether their data is being encrypted
 * - What encryption means for their privacy
 * - Browser compatibility status
 * - How to ensure maximum data protection
 */
export function EncryptionSettings() {
  // Check if the user's browser supports encryption
  const [browserSupportsEncryption, setBrowserSupportsEncryption] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check encryption support when component loads
  useEffect(() => {
    // This needs to run on the client side since it uses browser APIs
    if (typeof window !== 'undefined') {
      try {
        const supported = isEncryptionSupported();
        setBrowserSupportsEncryption(supported);
      } catch (error) {
        console.error('Error checking encryption support:', error);
        setBrowserSupportsEncryption(false);
      }
    }
    setIsLoading(false);
  }, []);

  // Show loading state while checking browser support
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Encryption Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Checking browser compatibility...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Encryption Settings
          </CardTitle>
          <CardDescription>
            Control how your sensitive data is protected when stored in the cloud
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Protection Level</h3>
            
            {browserSupportsEncryption ? (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Client-Side Encryption Active
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-yellow-600" />
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Firebase-Only Encryption
                </Badge>
              </div>
            )}
          </div>

          {/* Encryption Explanation */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">What this means:</h3>
            
            {browserSupportsEncryption ? (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>✅ Maximum Privacy:</strong> Your journal content is encrypted on your device before being sent to our servers.</p>
                    <p><strong>✅ Zero-Knowledge:</strong> Even if someone gains access to our database, they cannot read your encrypted content.</p>
                    <p><strong>✅ User-Only Access:</strong> Only you have the encryption key to decrypt your data.</p>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p><strong>⚠️ Browser Limitation:</strong> Your browser doesn't support modern encryption features.</p>
                    <p><strong>🔒 Firebase Protection:</strong> Your data is still encrypted by Google's Firebase with enterprise-grade security.</p>
                    <p><strong>💡 Suggestion:</strong> For maximum privacy, use a modern browser like Chrome, Firefox, or Safari.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Firebase Security Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Firebase Security (Always Active)</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Data encrypted in transit (TLS/SSL)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Data encrypted at rest (AES-256)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>User-based access controls</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Google's enterprise security infrastructure</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {!browserSupportsEncryption && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recommendations for Maximum Security</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Update to a modern browser for client-side encryption</p>
                <p>• Use strong, unique passwords for your account</p>
                <p>• Enable two-factor authentication if available</p>
                <p>• Keep your browser and device updated</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Technical Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <div>
              <strong>Encryption Method:</strong> {browserSupportsEncryption ? 'AES-GCM 256-bit + Firebase AES-256' : 'Firebase AES-256 only'}
            </div>
            <div>
              <strong>Key Management:</strong> {browserSupportsEncryption ? 'User-derived keys (client-side)' : 'Google-managed keys'}
            </div>
            <div>
              <strong>Browser Support:</strong> {browserSupportsEncryption ? 'Full Web Crypto API support' : 'Limited or no Web Crypto API'}
            </div>
            <div>
              <strong>Data Location:</strong> Google Firebase (US servers with global distribution)
            </div>
          </div>
          
          {browserSupportsEncryption && (
            <div className="text-xs text-muted-foreground mt-3">
              <p><strong>How it works:</strong> When you save journal entries, the content is encrypted using your unique user key before being sent to Firebase. When you read entries, they are decrypted on your device. This happens automatically and transparently.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 