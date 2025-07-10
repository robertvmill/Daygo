// Server-side encryption utility for sensitive Firebase data
// This is the Node.js compatible version of the client-side encryption
// Must be compatible with the client-side encryption format

import crypto from 'crypto';

/**
 * Generates a consistent encryption key for a user based on their Firebase UID
 * This ensures the same user always gets the same key, but each user has a unique key
 * Must match the client-side key generation exactly
 */
async function getUserEncryptionKey(userId: string): Promise<Buffer> {
  // Create a consistent seed from the user ID (matches client-side)
  const data = userId + "daygo-encryption-salt-2024";
  
  // Hash the seed to create key material (matches client-side SHA-256)
  const hash = crypto.createHash('sha256');
  hash.update(data, 'utf8');
  return hash.digest();
}

/**
 * Decrypts data that was encrypted with the client-side encryptSensitiveData
 * Converts the base64-encoded encrypted data back to readable text
 */
export async function decryptSensitiveData(encryptedData: string, userId: string): Promise<string> {
  try {
    // Get the same encryption key used for encryption
    const key = await getUserEncryptionKey(userId);
    
    // Convert from base64 back to bytes (matches client-side)
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract the IV (first 12 bytes) and encrypted data (rest)
    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);
    
    // Decrypt the data using AES-GCM (matches client-side)
    // Note: Web Crypto API includes the auth tag in the encrypted buffer automatically
    // For compatibility, we need to decrypt the entire buffer as-is
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key);
    decipher.setIV(iv);
    
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    // Convert the decrypted bytes back to text
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Server-side decryption failed:', error);
    // If decryption fails, it might mean the data was corrupted or the wrong user is trying to access it
    throw new Error('Failed to decrypt data - data may be corrupted or access denied');
  }
}

/**
 * Utility to decrypt an entire object's encrypted fields
 * Use this after reading data from Firebase to decrypt the sensitive content
 */
export async function decryptObjectFields(
  obj: Record<string, any>, 
  fieldsToDecrypt: string[], 
  userId: string
): Promise<Record<string, any>> {
  const decrypted = { ...obj };
  
  // Decrypt each field that was marked as encrypted
  for (const field of fieldsToDecrypt) {
    if (decrypted[`${field}_encrypted`] === true && decrypted[field]) {
      try {
        decrypted[field] = await decryptSensitiveData(decrypted[field], userId);
        // Remove the encryption marker
        delete decrypted[`${field}_encrypted`];
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error);
        // Keep the encrypted data rather than losing it
      }
    }
  }
  
  return decrypted;
}

/**
 * Encrypts sensitive text data (server-side version)
 * Returns base64-encoded encrypted data that matches client-side format
 */
export async function encryptSensitiveData(data: string, userId: string): Promise<string> {
  try {
    // Get the user's unique encryption key
    const key = await getUserEncryptionKey(userId);
    
    // Generate a random initialization vector (IV) for this encryption
    const iv = crypto.randomBytes(12);
    
    // Encrypt the data using AES-GCM
    const cipher = crypto.createCipherGCM('aes-256-gcm', key);
    cipher.setIV(iv);
    
    let encrypted = cipher.update(data, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag (matches client-side format)
    const combined = Buffer.concat([iv, encrypted, authTag]);
    
    // Convert to base64 for storage in Firebase (matches client-side)
    return combined.toString('base64');
  } catch (error) {
    console.error('Server-side encryption failed:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}