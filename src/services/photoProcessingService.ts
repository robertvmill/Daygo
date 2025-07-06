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
 * Extract text from photo using OCR (no Firebase Storage needed)
 * We'll use Google Vision API through a Next.js API route with base64 data
 */
export async function extractTextFromPhoto(file: File): Promise<{ text: string; confidence: number }> {
  try {
    console.log('Extracting text from photo...');
    
    // Convert file to base64
    const base64Data = await fileToBase64(file);
    
    const response = await fetch('/api/vision/extract-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageData: base64Data }),
    });

    if (!response.ok) {
      throw new Error('OCR processing failed');
    }

    const result = await response.json();
    console.log('Text extraction completed');
    
    return {
      text: result.text || '',
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error('Error extracting text:', error);
    
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
  
  // Check file size (25MB limit)
  // 
  // TECHNICAL NOTE: This validation allows up to 25MB image files.
  // However, there are important platform constraints to be aware of:
  // 
  // 1. Vercel Functions have a 4.5MB request body limit
  // 2. Images are converted to base64 encoding (+33% size increase) 
  // 3. Effective limit on Vercel is ~3.4MB original file size
  // 4. Google Vision API supports up to 20MB files, but has 10MB JSON request limit
  // 
  // Users may still encounter errors with large files due to these platform limitations.
  // For files larger than ~3-4MB, consider implementing:
  // - Direct cloud storage uploads with pre-signed URLs
  // - Client-side image compression before upload
  // - Chunked/streaming upload mechanisms
  const maxSize = 25 * 1024 * 1024; // 25MB - increased from 10MB per user request
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image must be smaller than 25MB' };
  }
  
  // Check for supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return { isValid: false, error: 'Supported formats: JPEG, PNG, WebP' };
  }
  
  return { isValid: true };
} 