'use client';

// Import necessary dependencies for React and UI components
import { useRef, useEffect, useState, useCallback } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BotIcon, SendIcon, ThermometerIcon, ArrowRightLeft, MicIcon, MicOffIcon } from "lucide-react";
import { useChat } from '@ai-sdk/react';
import { Message } from 'ai';
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
// Import markdown renderer
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Type definitions for message parts and tool results
interface ToolInvocation {
  toolName: string;
  toolParameters: Record<string, unknown>;
}

interface ToolInvocationPart {
  type: 'tool-invocation';
  toolInvocation: ToolInvocation;
}

interface ToolResult {
  toolName: string;
  toolResultJSON: string;
}

interface ToolResultPart {
  type: 'tool-result';
  toolResult: ToolResult;
}

interface TextPart {
  type: 'text';
  text: string;
}

interface WeatherResult {
  location: string;
  temperature: number;
}

interface TempConversionResult {
  celsius: number;
}

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date?: string;
  score?: number;
}

interface JournalSearchResult {
  entries: JournalEntry[];
  count: number;
  message?: string;
  error?: string;
}

type MessagePart = TextPart | ToolInvocationPart | ToolResultPart;

// Beautiful animated loading component for journal search
const JournalSearchAnimation = () => {
  return (
    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
        <BotIcon className="h-3 w-3 text-white" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
          Searching through your journal entries...
        </div>
        {/* Simple loading bar */}
        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full animate-[progress_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  );
};

// Speech recognition hook using OpenAI Whisper API
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startListening = useCallback(async () => {
    try {
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Audio recording is not supported in this browser');
        return;
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop the microphone stream
        stream.getTracks().forEach(track => track.stop());
        
        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // Send to our API for transcription
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
      setError(null);
      toast.success('Recording started - speak now!');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording');
      toast.error('Failed to start recording. Please check microphone permissions.');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true);
      
      // Create FormData to send audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      // Send to our API endpoint
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setTranscript(data.text);
      toast.success('Audio transcribed successfully!');
    } catch (err) {
      console.error('Transcription error:', err);
      setError('Failed to transcribe audio');
      toast.error('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    isListening,
    transcript,
    error,
    isTranscribing,
    startListening,
    stopListening,
    resetTranscript: () => setTranscript('')
  };
};

// Helper function to format weather data
const formatWeatherResult = (result: WeatherResult) => {
  if (!result) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <ThermometerIcon className="h-4 w-4" />
        <span>
          {result.location}: {result.temperature}°F
        </span>
      </div>
    </div>
  );
};

// Helper function to format temperature conversion
const formatTempConversion = (result: TempConversionResult) => {
  if (!result) return null;
  return (
    <div className="flex items-center gap-1">
      <ArrowRightLeft className="h-4 w-4" />
      <span>Converted to {result.celsius}°C</span>
    </div>
  );
};

// Main chat page component
export default function AiChatPage() {
  // Get current user from Firebase
  const [userId, setUserId] = useState<string | null>(null);
  
  // Speech recognition hook
  const { isListening, transcript, startListening, stopListening, resetTranscript, isTranscribing } = useSpeechRecognition();
  
  // Effect to get the current user's ID
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Initialize chat functionality with useChat hook
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, reload, setInput } = useChat({
    // Set initial system message to define AI assistant's role and capabilities
    initialMessages: [
      {
        id: 'system-1',
        role: 'system',
        content: `You are Daygo AI, a specialized assistant for the Daygo journaling app.
        Your purpose is to help users gain insights from their journal entries, reflect on patterns in their writing,
        and provide thoughtful responses to help users with their personal growth and self-awareness.
        Be supportive, thoughtful, and personalized in your responses.
        
        IMPORTANT: Never include debug information, JSON objects, or technical messages like {"type":"step-start"} in your responses. Only provide natural, conversational responses to users.
        
        You have access to the following tools:
        1. A weather tool that you can use to get the current weather in a specific location (in Fahrenheit).
        2. A temperature conversion tool that can convert Fahrenheit to Celsius.
        3. A journal search tool that can find relevant journal entries based on a query.
        
        Use these tools when appropriate. When users ask about their journal entries or past experiences, use the
        searchJournalEntries tool to find and reference their actual journal content.
        
        For journal queries, first use the search tool and then craft your response based on the content of their
        entries. If no entries are found, acknowledge this and offer to help them journal about the topic.
        
        Always respond in a natural, human-like manner without any debug output or technical information.`
      }
    ],
    maxSteps: 5,
    body: {
      userId: userId, // Pass the user ID to the API
    },
    onError: (err) => {
      console.error("Chat error occurred:", err);
      toast.error("Error connecting to AI chat service");
    },
    onFinish: (message) => {
      console.log("Chat finished with message:", message);
    }
  });
  
  // Effect to update input when speech transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript, setInput]);
  
  // Handle microphone button click
  const handleMicrophoneClick = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };
  
  // Ref for auto-scrolling to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Error logging effect
  useEffect(() => {
    if (error) {
      console.error('AI Chat Error:', error);
    }
  }, [error]);

  // Retry handler for error recovery
  const handleRetry = () => {
    if (error) {
      console.log("Retrying last message");
      reload();
    }
  };

  // Format journal entries search results
  const formatJournalResults = (result: JournalSearchResult) => {
    if (!result || !result.entries || result.entries.length === 0) {
      return (
        <div className="text-sm italic">
          {result?.message || "No journal entries found matching your query."}
        </div>
      );
    }
    
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">Found {result.entries.length} relevant journal entries:</div>
        {result.entries.map((entry: JournalEntry, index: number) => (
          <div key={index} className="border-l-2 border-primary pl-2 mb-1">
            <div className="font-medium text-sm">{entry.title} {entry.date && `(${entry.date})`}</div>
            <div className="text-sm line-clamp-3">{entry.content}</div>
          </div>
        ))}
      </div>
    );
  };

  // Helper function to check if a tool invocation has a corresponding result
  const hasToolResult = (message: Message, toolName: string) => {
    if (!message.parts || !Array.isArray(message.parts)) return false;
    return message.parts.some(part => {
      const resultPart = part as ToolResultPart;
      return resultPart.type === 'tool-result' && 
             resultPart.toolResult?.toolName === toolName;
    });
  };

  // Helper function to check if message is complete (has final text response)
  const isMessageComplete = (message: Message) => {
    if (!message.parts || !Array.isArray(message.parts)) return false;
    
    // Check if there's substantive text content (not just debug info)
    const hasRealContent = message.parts.some(part => {
      if (part.type !== 'text') return false;
      const text = (part as TextPart).text.trim();
      
      // Filter out debug/step messages with enhanced filtering
      if (
        text.includes('"type":"step-start"') ||
        text === '{"type":"step-start"}' ||
        text.includes('step-start') ||
        text.startsWith('{"type":') ||
        text === '' ||
        text.startsWith('{') && text.endsWith('}') && text.includes('"type"') ||
        /^\s*\{"type":\s*"[^"]*"\}\s*$/.test(text) ||
        /^\s*\{"type":\s*"step-start"\}\s*$/.test(text)
      ) {
        return false;
      }
      
      return text.length > 0;
    });
    
    return hasRealContent;
  };

  // Render different types of message parts (text, tool invocations, tool results)
  const renderMessagePart = (message: Message, part: MessagePart, index: number) => {
    switch (part.type) {
      case 'text':
        // Filter out debug text that shouldn't be shown to users
        const text = part.text.trim();
        if (
          text.includes('"type":"step-start"') || 
          text === '{"type":"step-start"}' ||
          text.includes('step-start') ||
          text.startsWith('{"type":') ||
          text === '' ||
          text.startsWith('{') && text.endsWith('}') && text.includes('"type"') ||
          /^\s*\{"type":\s*"[^"]*"\}\s*$/.test(text) ||
          /^\s*\{"type":\s*"step-start"\}\s*$/.test(text)
        ) {
          return null;
        }
        
        // Render text with proper markdown formatting
        return (
          <div key={`${message.id}-${index}`} className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Customize markdown components for better styling
                p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-medium mb-1">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-sm">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 italic">{children}</blockquote>,
              }}
            >
              {part.text}
            </ReactMarkdown>
          </div>
        );
      case 'tool-invocation':
        // Only show loading animation if there's no corresponding tool result yet AND message isn't complete
        const toolName = part.toolInvocation.toolName;
        if (hasToolResult(message, toolName) || isMessageComplete(message)) {
          return null; // Don't show loading if result already exists or message is complete
        }
        
        // Show beautiful animated loading state for journal search
        if (toolName === 'searchJournalEntries') {
          return (
            <div key={`${message.id}-${index}`} className="my-3">
              <JournalSearchAnimation />
            </div>
          );
        }
        // For other tools, show a simpler loading state
        return (
          <div key={`${message.id}-${index}`} className="bg-muted/30 p-3 rounded-md my-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></div>
              <span className="font-medium">Using {toolName}...</span>
            </div>
          </div>
        );
      case 'tool-result':
        const resultToolName = part.toolResult.toolName;
        try {
          const resultData = JSON.parse(part.toolResult.toolResultJSON);
          
          return (
            <div key={`${message.id}-${index}`} className="bg-muted/20 p-2 rounded-md my-2">
              {resultToolName === 'weather' && formatWeatherResult(resultData as WeatherResult)}
              {resultToolName === 'convertFahrenheitToCelsius' && formatTempConversion(resultData as TempConversionResult)}
              {resultToolName === 'searchJournalEntries' && formatJournalResults(resultData as JournalSearchResult)}
            </div>
          );
        } catch {
          return (
            <div key={`${message.id}-${index}`} className="text-xs bg-muted/20 p-2 rounded-md my-2">
              Tool result: {part.toolResult.toolResultJSON}
            </div>
          );
        }
      default:
        return <div key={`${message.id}-${index}`}>{JSON.stringify(part)}</div>;
    }
  };

  // Layout structure with sidebar and main content area
  return (
    <div className="grid grid-cols-[auto_1fr] min-h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col w-full overflow-x-hidden">
        {/* Header with breadcrumb navigation */}
        <header className="flex sticky top-0 z-10 h-16 shrink-0 items-center gap-2 border-b bg-background px-4 w-full">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Talk to Daygo AI</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        {/* Main content area */}
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 overflow-auto w-full max-w-full overflow-x-hidden">
          {/* Page title and description */}
          <div className="flex items-center justify-between w-full">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Talk to Daygo AI</h1>
              <p className="text-muted-foreground">
                Your personal AI assistant that knows your journal entries and can provide insights.
              </p>
            </div>
          </div>
          
          {/* Chat interface card */}
          <div className="grid gap-6 w-full max-w-full">
            <Card className="w-full max-w-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center">
                  <BotIcon className="mr-2 h-5 w-5" />
                  Chat with Daygo AI
                </CardTitle>
                <CardDescription>
                  Ask questions about your journal entries, get insights, or just chat about your day.
                  Try asking &quot;What have I written about productivity?&quot; or &quot;Find entries where I discussed my goals.&quot;
                </CardDescription>
              </CardHeader>
              <CardContent className="w-full">
                <div className="flex flex-col gap-4 w-full">
                  {/* Chat messages container */}
                  <div className="flex flex-col gap-3 h-[400px] overflow-y-auto border rounded-md p-4 w-full overflow-x-hidden">
                    {/* Welcome message or chat history */}
                    {messages.filter(m => m.role !== 'system').length === 0 ? (
                      <div className="flex justify-start w-full">
                        <div className="w-full max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                          Hello! I&apos;m Daygo AI, your personal journal assistant. How can I help you today? 
                          You can ask me about your journal entries, reflect on your writing, or even get insights from your past reflections.
                        </div>
                      </div>
                    ) : (
                      messages.filter(m => m.role !== 'system').map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          } w-full`}
                        >
                          <div
                            className={`w-full max-w-[80%] rounded-lg px-4 py-2 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.parts && Array.isArray(message.parts) 
                              ? message.parts.map((part, i) => renderMessagePart(message, part as MessagePart, i))
                              : message.content}
                          </div>
                        </div>
                      ))
                    )}
                    {/* Loading indicator */}
                    {isLoading && (
                      <div className="flex justify-start w-full">
                        <div className="w-full max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-current animate-bounce" />
                            <div className="h-2 w-2 rounded-full bg-current animate-bounce delay-75" />
                            <div className="h-2 w-2 rounded-full bg-current animate-bounce delay-150" />
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Error display */}
                    {error && (
                      <div className="flex justify-center w-full">
                        <div className="w-full max-w-[80%] rounded-lg px-4 py-2 bg-destructive text-destructive-foreground">
                          <p className="font-medium">Error: {error.message || "Something went wrong. Please try again."}</p>
                          {error.cause ? (
                            <p className="text-xs mt-1">Details: {String(JSON.stringify(error.cause))}</p>
                          ) : null}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleRetry} 
                            className="mt-2 bg-background/10 hover:bg-background/20 text-white"
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Message input form with speech-to-text */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                    <Textarea
                      placeholder={
                        isTranscribing 
                          ? "Transcribing audio..." 
                          : isListening 
                            ? "Recording... Click mic to stop" 
                            : "Type your message... (e.g., 'What have I written about productivity?')"
                      }
                      value={input}
                      onChange={handleInputChange}
                      disabled={isLoading || isTranscribing}
                      className={`resize-none ${
                        isListening 
                          ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20' 
                          : isTranscribing 
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20'
                            : ''
                      }`}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant={isListening ? "destructive" : "outline"}
                        size="default"
                        onClick={handleMicrophoneClick}
                        disabled={isLoading || isTranscribing}
                        className={`${isListening ? 'animate-pulse' : ''}`}
                      >
                        {isTranscribing ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isListening ? (
                          <MicOffIcon className="h-4 w-4" />
                        ) : (
                          <MicIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Button type="submit" disabled={isLoading || !input.trim() || isTranscribing} className="flex-1">
                        <SendIcon className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </form>
                  
                  {/* Speech recognition status */}
                  {isListening && (
                    <div className="text-sm text-center text-red-600 dark:text-red-400">
                      🎤 Recording... Click the microphone button to stop
                    </div>
                  )}
                  {isTranscribing && (
                    <div className="text-sm text-center text-blue-600 dark:text-blue-400">
                      🤖 Transcribing your audio with AI...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
} 