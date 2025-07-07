import { NextRequest, NextResponse } from 'next/server';

/**
 * OCR Text Extraction API Route using OpenAI GPT-4 Vision
 * 
 * This endpoint receives base64 image data and extracts text using OpenAI's vision model
 * POST /api/vision/extract-text
 * Body: { imageData: string } (base64 encoded image)
 * Returns: { text: string, confidence: number }
 */

// Maximum request size in bytes (10MB for base64 encoded image)
const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
// Maximum base64 image size (approximately 7.5MB original image after base64 encoding)
const MAX_BASE64_SIZE = 7.5 * 1024 * 1024; // 7.5MB

/**
 * Note: Client-side image compression would be implemented here if needed
 * For now, we rely on server-side validation and client-side file size limits
 */

/**
 * Server-side image compression using Canvas API (Node.js environment)
 * This is a simplified version that just validates and truncates if needed
 */
function serverSideImageValidation(base64Data: string): { isValid: boolean; error?: string; compressedData?: string } {
  try {
    // Calculate approximate size of base64 data
    const sizeBytes = (base64Data.length * 3) / 4;
    
    if (sizeBytes > MAX_BASE64_SIZE) {
      return {
        isValid: false,
        error: `Image too large (${(sizeBytes / 1024 / 1024).toFixed(1)}MB). Maximum size is ${(MAX_BASE64_SIZE / 1024 / 1024).toFixed(1)}MB. Please compress the image before uploading.`
      };
    }
    
    return { isValid: true, compressedData: base64Data };
  } catch {
    return {
      isValid: false,
      error: 'Failed to validate image data'
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check request size before processing
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { 
          error: 'Request too large',
          message: `Image size exceeds maximum limit of ${(MAX_REQUEST_SIZE / 1024 / 1024).toFixed(1)}MB. Please compress the image before uploading.`,
          suggestion: 'Try reducing image quality or dimensions before uploading.'
        },
        { status: 413 }
      );
    }

    const { imageData } = await req.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Validate and potentially compress the image data
    const validation = serverSideImageValidation(imageData);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Image too large',
          message: validation.error,
          suggestion: 'Please compress the image or reduce its dimensions before uploading.'
        },
        { status: 413 }
      );
    }

    const processedImageData = validation.compressedData || imageData;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured');
      return NextResponse.json({
        text: '[Photo uploaded - OCR processing temporarily unavailable]',
        confidence: 0,
        note: 'OpenAI API not configured. Please set OPENAI_API_KEY environment variable'
      });
    }

    // Call OpenAI GPT-4 Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Use the latest vision model
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please extract ALL text from this image exactly as it appears. 
                
Instructions:
- Extract every word, sentence, and paragraph
- Maintain the original formatting and line breaks where possible
- Include all text, even if it's small or partially obscured
- If there are multiple columns, read from left to right, top to bottom
- Do not summarize or paraphrase - extract the exact text
- If no text is visible, respond with "No text detected"

Return only the extracted text, nothing else.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${processedImageData}`,
                  detail: 'high' // Use high detail for better OCR
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0, // Use deterministic output for consistent OCR
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API error ${response.status}:`, errorData);
      
      if (response.status === 401) {
        return NextResponse.json({
          text: '[Photo uploaded - OCR processing temporarily unavailable]',
          confidence: 0,
          note: 'OpenAI API key is invalid or expired'
        });
      }
      
      if (response.status === 429) {
        return NextResponse.json({
          text: '[Photo uploaded - OCR processing temporarily unavailable]',
          confidence: 0,
          note: 'OpenAI API rate limit exceeded'
        });
      }
      
      // Handle case where OpenAI also returns 413 for large images
      if (response.status === 413) {
        return NextResponse.json({
          text: '[Photo uploaded - Image too large for processing]',
          confidence: 0,
          note: 'Image is too large for OpenAI Vision API. Please compress the image and try again.'
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    const extractedText = data.choices?.[0]?.message?.content || '';
    
    if (!extractedText || extractedText.trim() === 'No text detected') {
      return NextResponse.json({
        text: '[No text detected in image]',
        confidence: 0,
      });
    }

    // OpenAI doesn't provide confidence scores, so we'll use a high confidence
    // since GPT-4 Vision is generally very accurate at OCR
    const confidence = 0.95;

    console.log(`OCR extracted ${extractedText.length} characters using OpenAI GPT-4 Vision`);

    return NextResponse.json({
      text: extractedText,
      confidence: confidence,
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Handle specific 413 errors
    if (error instanceof Error && error.message.includes('413')) {
      return NextResponse.json(
        { 
          error: 'Image too large',
          message: 'The uploaded image is too large to process. Please compress the image or reduce its dimensions.',
          suggestion: 'Try reducing the image quality or size before uploading.'
        },
        { status: 413 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 