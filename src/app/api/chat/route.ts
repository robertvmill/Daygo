import { openai } from '@ai-sdk/openai';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
// Import the real search function
import { searchJournalEmbeddings } from '@/services/journalEmbeddingService';
// We'll still keep Firebase Admin imports commented until you set up the credentials
// import { getAdminFirestore } from '@/lib/firebase-admin';
// import { initAdmin } from '@/lib/firebase-admin';

// Initialize Firebase Admin (commented out for now)
// initAdmin();

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Type definitions for Pinecone results
interface PineconeMetadata {
  userId: string;
  title?: string;
  createdAt?: string;
  snippet?: string;
  templateId?: string | null;
  [key: string]: any; // Allow for additional properties
}

interface PineconeMatch {
  id: string;
  score?: number;
  metadata?: PineconeMetadata;
}

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date?: string;
  score?: number;
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, userId, model = 'openai/gpt-4o' } = await req.json();
    
    // Check if API key is configured - try OpenRouter first, then fall back to OpenAI
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const openAIApiKey = process.env.OPENAI_API_KEY;
    
    if (!openRouterApiKey && (!openAIApiKey || openAIApiKey.includes('your_') || openAIApiKey === 'your-api-key-here')) {
      console.warn('No valid API key found. Using fallback response mode.');
      
      // Create a fallback assistant message that acknowledges the missing API key
      return new Response(
        JSON.stringify({
          id: 'fallback-response',
          object: 'chat.completion',
          created: Date.now(),
          model: 'fallback-model',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: `I'd like to respond to your message, but there seems to be a configuration issue. The API key is missing or invalid. Please check your environment configuration and try again later.`
            },
            finish_reason: 'stop'
          }]
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Validate userId if provided
    if (userId && typeof userId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid userId format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use messages as-is since filtering is handled in frontend
    const cleanMessages = messages;

    // For now, use OpenAI directly since OpenRouter requires credits
    // TODO: Re-enable OpenRouter once credits are added or free models are confirmed
    const aiModel = openai(model);

    const result = streamText({
      model: aiModel,
      messages: cleanMessages,
      tools: {
        weather: tool({
          description: 'Get the weather in a location (fahrenheit)',
          parameters: z.object({
            location: z.string().describe('The location to get the weather for'),
          }),
          execute: async ({ location }) => {
            const temperature = Math.round(Math.random() * (90 - 32) + 32);
            return {
              location,
              temperature,
            };
          },
        }),
        convertFahrenheitToCelsius: tool({
          description: 'Convert a temperature in fahrenheit to celsius',
          parameters: z.object({
            temperature: z
              .number()
              .describe('The temperature in fahrenheit to convert'),
          }),
          execute: async ({ temperature }) => {
            const celsius = Math.round((temperature - 32) * (5 / 9));
            return {
              celsius,
            };
          },
        }),
        searchJournalEntries: tool({
          description: 'Search for relevant journal entries based on a query',
          parameters: z.object({
            query: z.string().describe('The search query to find relevant journal entries'),
            limit: z.number().optional().describe('Maximum number of entries to return (default: 3)'),
          }),
          execute: async ({ query, limit = 3 }) => {
            // Skip if no userId is provided
            if (!userId) {
              return {
                entries: [],
                error: 'User not authenticated'
              };
            }
            
            try {
              console.log(`Searching journal entries for query: "${query}" with limit: ${limit}`);
              
              // Add special handling for travel-related queries to enhance search results
              const isTravel = /travel|trip|vacation|destination|journey|visit|mexico/i.test(query);
              if (isTravel) {
                console.log('Detected travel-related query, enhancing search');
              }
              
              // Search for entries using vector search
              const searchResults = await searchJournalEmbeddings(query, userId, limit);
              
              if (!searchResults || searchResults.length === 0) {
                return { 
                  entries: [],
                  message: 'No relevant journal entries found' 
                };
              }
              
              console.log(`Found ${searchResults.length} entries for query "${query}"`);
              
              // Since we don't have Firebase Admin configured yet, we'll extract data from Pinecone metadata
              const journalEntries = searchResults.map((result: PineconeMatch) => {
                const metadata = result.metadata || {} as PineconeMetadata;
                return {
                  id: result.id,
                  title: metadata.title || 'Untitled Entry',
                  content: metadata.snippet || 'No content available',
                  date: metadata.createdAt ? new Date(metadata.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : '',
                  score: result.score
                };
              });
              
              // Filter out null entries and sort by relevance score
              const validEntries = journalEntries
                .filter((entry: JournalEntry | null) => entry !== null)
                .sort((a: JournalEntry, b: JournalEntry) => (b.score || 0) - (a.score || 0));
              
              return {
                entries: validEntries,
                count: validEntries.length
              };
            } catch (error) {
              console.error('Error searching journal entries:', error);
              
              // If vector search fails or in development mode without proper config, use mock data
              if (isDevelopment) {
                console.log("Development mode: Falling back to mock data");
                
                // Create a mock response based on the query
                if (query.toLowerCase().includes('wins') || query.toLowerCase().includes('win')) {
                  return {
                    entries: [
                      {
                        id: 'hwFku45ONiDWj5wGabDE',
                        title: 'Three Small Wins - 5/17/2025',
                        content: 'win_1: family\n\nwin_2: apps\n\nwin_3: walking',
                        date: 'May 17, 2025',
                        score: 0.98
                      }
                    ],
                    count: 1
                  };
                } else if (query.toLowerCase().includes('walk') || query.toLowerCase().includes('walking')) {
                  return {
                    entries: [
                      {
                        id: 'hwFku45ONiDWj5wGabDE',
                        title: 'Three Small Wins - 5/17/2025',
                        content: 'win_1: family\n\nwin_2: apps\n\nwin_3: walking',
                        date: 'May 17, 2025',
                        score: 0.89
                      }
                    ],
                    count: 1
                  };
                } else if (query.toLowerCase().includes('family')) {
                  return {
                    entries: [
                      {
                        id: 'hwFku45ONiDWj5wGabDE',
                        title: 'Three Small Wins - 5/17/2025',
                        content: 'win_1: family\n\nwin_2: apps\n\nwin_3: walking',
                        date: 'May 17, 2025',
                        score: 0.94
                      }
                    ],
                    count: 1
                  };
                }
              }
              
              return {
                entries: [],
                error: 'Failed to search journal entries'
              };
            }
          },
        }),
      },
      onError: (error) => {
        console.error('Streaming error:', error);
      }
    });

    return result.toDataStreamResponse({
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        'x-yellow-trace': 'chat-api'
      }
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 