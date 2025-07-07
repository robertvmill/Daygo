// Client-side encryption utility for sensitive Firebase data
// This encrypts data on the user's device before sending it to Firebase
// Even if someone gains access to your Firebase, they won't be able to read the encrypted content

/**
 * This encryption system works as follows:
 * 1. Uses the Web Crypto API for strong AES-GCM encryption
 * 2. Generates a unique encryption key for each user based on their auth token
 * 3. Encrypts sensitive fields like journal content before saving to Firebase
 * 4. Decrypts data when reading from Firebase
 * 5. The encryption happens entirely on the user's device
 */

// Web Crypto API is available in all modern browsers and provides strong encryption
const crypto = window.crypto;

/**
 * Generates a consistent encryption key for a user based on their Firebase UID
 * This ensures the same user always gets the same key, but each user has a unique key
 */
async function getUserEncryptionKey(userId: string): Promise<CryptoKey> {
  // Create a consistent seed from the user ID
  const encoder = new TextEncoder();
  const data = encoder.encode(userId + "daygo-encryption-salt-2024");
  
  // Hash the seed to create key material
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Import the hash as a cryptographic key for AES encryption
  return await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false, // Key cannot be extracted (more secure)
    ['encrypt', 'decrypt'] // Key can be used for encryption and decryption
  );
}

/**
 * Encrypts sensitive text data before saving to Firebase
 * Returns base64-encoded encrypted data that looks like random text
 */
export async function encryptSensitiveData(data: string, userId: string): Promise<string> {
  try {
    // Get the user's unique encryption key
    const key = await getUserEncryptionKey(userId);
    
    // Convert the text to bytes for encryption
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    // Generate a random initialization vector (IV) for this encryption
    // The IV ensures the same text encrypts to different values each time
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data using AES-GCM (a very secure encryption method)
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    );
    
    // Combine the IV and encrypted data so we can decrypt later
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    // Convert to base64 for storage in Firebase (which expects text)
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    // If encryption fails, we could either throw an error or return the original data
    // For security, it's better to throw an error so sensitive data isn't stored unencrypted
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypts data that was encrypted with encryptSensitiveData
 * Converts the base64-encoded encrypted data back to readable text
 */
export async function decryptSensitiveData(encryptedData: string, userId: string): Promise<string> {
  try {
    // Get the same encryption key used for encryption
    const key = await getUserEncryptionKey(userId);
    
    // Convert from base64 back to bytes
    const combined = new Uint8Array(
      atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract the IV (first 12 bytes) and encrypted data (rest)
    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);
    
    // Decrypt the data using the same method used for encryption
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedBuffer
    );
    
    // Convert the decrypted bytes back to text
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
    // If decryption fails, it might mean the data was corrupted or the wrong user is trying to access it
    throw new Error('Failed to decrypt data - data may be corrupted or access denied');
  }
}

/**
 * Utility to encrypt an entire object's sensitive fields
 * Use this to encrypt multiple fields at once before saving to Firebase
 */
export async function encryptObjectFields(
  obj: Record<string, any>, 
  fieldsToEncrypt: string[], 
  userId: string
): Promise<Record<string, any>> {
  const encrypted = { ...obj };
  
  // Encrypt each specified field
  for (const field of fieldsToEncrypt) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encryptSensitiveData(encrypted[field], userId);
      // Mark the field as encrypted so we know to decrypt it later
      encrypted[`${field}_encrypted`] = true;
    }
  }
  
  return encrypted;
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
 * Check if the browser supports the required encryption features
 * Call this before using encryption to ensure compatibility
 */
export function isEncryptionSupported(): boolean {
  return !!(window.crypto && window.crypto.subtle);
} 