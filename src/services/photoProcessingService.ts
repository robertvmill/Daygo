'use client';

/**
 * Photo Processing Service
 * 
 * This service handles photo journal text extraction:
 * 1. Convert image file to base64
 * 2. Extract text using OCR API (Google Vision)
 * 3. Return extracted text for journal use
 * 
 * No Firebase Storage required - images are processed directly in memory
 */

export interface PhotoProcessingResult {
  extractedText: string;
  confidence: number;
  processingTime: number;
}

// Firebase Storage functions removed - no longer needed
// Images are now processed directly in memory as base64 data

/**
 * Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Compress an image file to reduce its size while maintaining quality
 * This function helps prevent 413 "Request Too Large" errors
 */
function compressImageFile(file: File, maxSizeBytes: number = 4 * 1024 * 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    // If file is already small enough, return it as-is
    if (file.size <= maxSizeBytes) {
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions to reduce file size
      let { width, height } = img;
      const maxDimension = 2048; // Maximum dimension for good OCR results
      
      // Scale down if image is too large
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw the image with new dimensions
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to blob with compression
      // Start with good quality and reduce until size is acceptable
      let quality = 0.8;
      
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Check if compressed size is acceptable
            if (blob.size <= maxSizeBytes || quality <= 0.1) {
              // Create a new File object with the compressed data
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // Reduce quality and try again
              quality -= 0.1;
              tryCompress();
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      tryCompress();
    };
    
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Extract text from photo using OCR (no Firebase Storage needed)
 * We'll use Google Vision API through a Next.js API route with base64 data
 */
export async function extractTextFromPhoto(file: File): Promise<{ text: string; confidence: number }> {
  try {
    console.log('Extracting text from photo...');
    
    // Compress the image if it's too large to prevent 413 errors
    let processedFile = file;
    if (file.size > 4 * 1024 * 1024) { // 4MB threshold
      console.log('Image is large, compressing...');
      try {
        processedFile = await compressImageFile(file);
        console.log(`Compressed image from ${(file.size / 1024 / 1024).toFixed(1)}MB to ${(processedFile.size / 1024 / 1024).toFixed(1)}MB`);
      } catch (compressionError) {
        console.warn('Failed to compress image, proceeding with original:', compressionError);
        // Continue with original file if compression fails
      }
    }
    
    // Convert file to base64
    const base64Data = await fileToBase64(processedFile);
    
    const response = await fetch('/api/vision/extract-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageData: base64Data }),
    });

    if (!response.ok) {
      // Handle specific error responses from the API
      if (response.status === 413) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Image too large for processing');
      }
      
      throw new Error(`OCR processing failed (${response.status})`);
    }

    const result = await response.json();
    console.log('Text extraction completed');
    
    return {
      text: result.text || '',
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error('Error extracting text:', error);
    
    // Provide specific error messages for different types of failures
    if (error instanceof Error) {
      if (error.message.includes('too large')) {
        return {
          text: '[Image too large for processing - Please compress the image and try again]',
          confidence: 0,
        };
      }
      
      if (error.message.includes('413')) {
        return {
          text: '[Image size exceeds limit - Please reduce image size and try again]',
          confidence: 0,
        };
      }
    }
    
    // Fallback: return placeholder text if OCR fails
    return {
      text: '[Photo uploaded - OCR processing temporarily unavailable]',
      confidence: 0,
    };
  }
}

/**
 * Main function: Process photo journal entry (simplified - no storage needed)
 * 
 * This function extracts text directly from the image file:
 * 1. Convert image to base64
 * 2. Extract text using OCR API
 * 3. Return extracted text
 */
export async function processPhotoJournal(file: File): Promise<PhotoProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Extract text using OCR directly from the file
    const { text, confidence } = await extractTextFromPhoto(file);
    
    const processingTime = Date.now() - startTime;
    
    return {
      extractedText: text,
      confidence,
      processingTime,
    };
  } catch (error) {
    console.error('Photo processing failed:', error);
    throw error;
  }
}

/**
 * Validate photo file before processing
 */
export function validatePhotoFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }
  
  // Check file size (5MB limit for reliable processing)
  // 
  // TECHNICAL NOTE: This validation limits images to 5MB for reliable processing.
  // Here are the technical constraints:
  // 
  // 1. Base64 encoding increases file size by ~33%
  // 2. Server has 10MB limit for request bodies
  // 3. OpenAI Vision API works best with reasonably sized images
  // 4. Larger images may timeout or fail during processing
  // 
  // For optimal results:
  // - Keep images under 5MB original size
  // - Use JPEG format for photos (better compression)
  // - Consider reducing image dimensions for very large photos
  const maxSize = 5 * 1024 * 1024; // 5MB - realistic limit for reliable processing
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image must be smaller than 5MB for reliable processing. Please compress the image or reduce its dimensions.' };
  }
  
  // Check for supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return { isValid: false, error: 'Supported formats: JPEG, PNG, WebP' };
  }
  
  return { isValid: true };
} 