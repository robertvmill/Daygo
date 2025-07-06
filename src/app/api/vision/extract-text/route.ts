import { NextRequest, NextResponse } from 'next/server';

/**
 * OCR Text Extraction API Route using OpenAI GPT-4 Vision
 * 
 * This endpoint receives base64 image data and extracts text using OpenAI's vision model
 * POST /api/vision/extract-text
 * Body: { imageData: string } (base64 encoded image)
 * Returns: { text: string, confidence: number }
 */

export async function POST(req: NextRequest) {
  try {
    const { imageData } = await req.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

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
                  url: `data:image/jpeg;base64,${imageData}`,
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
    
    return NextResponse.json(
      { 
        error: 'Failed to process image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 