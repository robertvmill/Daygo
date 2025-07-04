import { NextRequest, NextResponse } from 'next/server';

/**
 * OCR Text Extraction API Route
 * 
 * This endpoint receives base64 image data and extracts text using Google Vision API
 * POST /api/vision/extract-text
 * Body: { imageData: string } (base64 encoded image)
 * Returns: { text: string, confidence: number }
 */

// Vision API response types
interface TextAnnotation {
  description?: string;
  confidence?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { imageData } = await req.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Try multiple authentication methods
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    let visionResponse;
    
    // Method 1: Try API Key authentication
    if (apiKey) {
      console.log('Using API Key authentication');
      visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imageData,
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 1,
                  },
                ],
              },
            ],
          }),
        }
      );
    }
    // Method 2: Try Service Account authentication
    else if (serviceAccountKey) {
      console.log('Using Service Account authentication');
      
      // Import Google Auth Library
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-vision'],
      });
      
      const authClient = await auth.getClient();
      const accessToken = await authClient.getAccessToken();
      
      if (!accessToken.token) {
        throw new Error('Failed to get access token');
      }
      
      visionResponse = await fetch(
        'https://vision.googleapis.com/v1/images:annotate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken.token}`,
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: imageData,
                },
                features: [
                  {
                    type: 'TEXT_DETECTION',
                    maxResults: 1,
                  },
                ],
              },
            ],
          }),
        }
      );
    }
    // Method 3: No authentication configured
    else {
      console.warn('No Google Vision API authentication configured');
      
      return NextResponse.json({
        text: '[Photo uploaded - OCR processing temporarily unavailable]',
        confidence: 0,
        note: 'Vision API not configured. Please set GOOGLE_VISION_API_KEY or GOOGLE_APPLICATION_CREDENTIALS'
      });
    }

    if (!visionResponse.ok) {
      const errorData = await visionResponse.text();
      console.error(`Vision API error ${visionResponse.status}:`, errorData);
      
      // Handle specific error cases
      if (visionResponse.status === 403) {
        return NextResponse.json({
          text: '[Photo uploaded - OCR processing temporarily unavailable]',
          confidence: 0,
          note: 'Vision API access denied - API key may need configuration'
        });
      }
      
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    
    // Extract text from Vision API response
    const textAnnotations = visionData.responses?.[0]?.textAnnotations;
    
    if (!textAnnotations || textAnnotations.length === 0) {
      return NextResponse.json({
        text: '[No text detected in image]',
        confidence: 0,
      });
    }

    // The first annotation contains all detected text
    const extractedText = textAnnotations[0].description || '';
    
    // Calculate average confidence from all detections
    const confidenceScores = textAnnotations
      .filter((annotation: TextAnnotation) => annotation.confidence !== undefined)
      .map((annotation: TextAnnotation) => annotation.confidence);
    
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum: number, conf: number) => sum + conf, 0) / confidenceScores.length
      : 0.5; // Default confidence if not provided

    console.log(`OCR extracted ${extractedText.length} characters with ${(averageConfidence * 100).toFixed(1)}% confidence`);

    return NextResponse.json({
      text: extractedText,
      confidence: averageConfidence,
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 