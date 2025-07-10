'use client';

// Import necessary dependencies for React and UI components
import { useRef, useEffect, useState, useCallback } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  BotIcon, 
  SendIcon, 
  ThermometerIcon, 
  ArrowRightLeft, 
  MicIcon, 
  MicOffIcon,
  Copy,
  RefreshCcw
} from "lucide-react";
import { useChat } from '@ai-sdk/react';
import { Message } from 'ai';
import { SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
// Import markdown renderer
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
    <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/10 rounded-lg border border-blue-100 dark:border-blue-900/50">
      <div className="w-6 h-6 rounded-full bg-blue-500/80 flex items-center justify-center">
        <BotIcon className="h-3 w-3 text-white" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
          Searching through your journal entries...
        </div>
        {/* Simple loading bar */}
        <div className="w-full bg-blue-100 dark:bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-blue-500/80 rounded-full animate-[progress_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  );
};

// Message loading animation
const MessageLoading = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="text-foreground"
    >
      <circle cx="4" cy="12" r="2" fill="currentColor">
        <animate
          id="spinner_qFRN"
          begin="0;spinner_OcgL.end+0.25s"
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
      <circle cx="12" cy="12" r="2" fill="currentColor">
        <animate
          begin="spinner_qFRN.begin+0.1s"
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
      <circle cx="20" cy="12" r="2" fill="currentColor">
        <animate
          id="spinner_OcgL"
          begin="spinner_qFRN.begin+0.2s"
          attributeName="cy"
          calcMode="spline"
          dur="0.6s"
          values="12;6;12"
          keySplines=".33,.66,.66,1;.33,0,.66,.33"
        />
      </circle>
    </svg>
  );
};

// Chat bubble component for consistent message styling
const ChatBubble = ({ 
  variant = "received", 
  children, 
  className = "" 
}: {
  variant?: "sent" | "received";
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`flex items-start gap-3 mb-6 ${
        variant === "sent" ? "flex-row-reverse" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};

// Chat bubble message component
const ChatBubbleMessage = ({ 
  variant = "received", 
  isLoading = false, 
  children, 
  className = "" 
}: {
  variant?: "sent" | "received";
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`rounded-lg p-4 max-w-[85%] ${
        variant === "sent" 
          ? "bg-primary/90 text-primary-foreground" 
          : "bg-muted/50 border border-border/30"
      } ${className}`}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <MessageLoading />
        </div>
      ) : (
        children
      )}
    </div>
  );
};

// Chat bubble actions component
const ChatBubbleActions = ({ children, className = "" }: { children: React.ReactNode; className?: string; }) => {
  return (
    <div className={`flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${className}`}>
      {children}
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
        
        CRITICAL INSTRUCTION: NEVER include any debug information, JSON objects, step indicators, or technical messages in your responses. Do not output anything that looks like:
        - {"type":"step-start"}
        - {"type":"anything"}
        - Any JSON-formatted debug messages
        - Step indicators or processing messages
        
        Only provide natural, conversational responses directly to the user. If you need to use tools, use them silently and only share the meaningful results with the user.
        
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
          <div key={index} className="border-l-2 border-primary/70 pl-3 py-1 mb-1 bg-primary/5 rounded-r-md">
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
      // Check if the part has tool result properties using safe type checking
      const unknownPart = part as unknown;
      return typeof unknownPart === 'object' && 
             unknownPart !== null &&
             'type' in unknownPart && 
             (unknownPart as { type: string }).type === 'tool-result' &&
             'toolResult' in unknownPart &&
             typeof (unknownPart as { toolResult: { toolName: string } }).toolResult === 'object' &&
             (unknownPart as { toolResult: { toolName: string } }).toolResult?.toolName === toolName;
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
                blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/50 pl-4 italic">{children}</blockquote>,
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
              <div className="w-4 h-4 rounded-full bg-blue-500/80 animate-pulse"></div>
              <span className="font-medium">Using {toolName}...</span>
            </div>
          </div>
        );
      case 'tool-result':
        const resultToolName = part.toolResult.toolName;
        try {
          const resultData = JSON.parse(part.toolResult.toolResultJSON);
          
          return (
            <div key={`${message.id}-${index}`} className="my-2">
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

  // Copy message to clipboard
  const copyMessageToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
  };

  // Layout structure with sidebar and main content area
  return (
    <div className="grid grid-cols-[auto_1fr] min-h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col w-full overflow-x-hidden">
        {/* Header with breadcrumb navigation */}
        <header className="flex sticky top-0 z-10 h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur-sm px-4 w-full">
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
        <main className="flex flex-1 flex-col gap-6 p-0 overflow-auto w-full max-w-full overflow-x-hidden">
          {/* Page title and description */}
          <div className="flex items-center justify-between w-full px-6 pt-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Talk to Daygo AI</h1>
              <p className="text-muted-foreground text-sm">
                Your personal AI assistant that knows your journal entries and can provide insights.
              </p>
            </div>
          </div>
          
          {/* Chat interface */}
          <div className="flex-1 flex flex-col px-4 md:px-6 pb-6">
            {/* Chat messages container */}
            <div className="flex-1 flex flex-col space-y-4 overflow-y-auto py-4">
              {/* Welcome message or chat history */}
              {messages.filter(m => m.role !== 'system').length === 0 ? (
                <ChatBubble variant="received">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-primary/20 text-primary">AI</AvatarFallback>
                  </Avatar>
                  <ChatBubbleMessage variant="received">
                    <p className="mb-2">Hello! I&apos;m Daygo AI, your personal journal assistant. How can I help you today?</p>
                    <p>You can ask me about your journal entries, reflect on your writing, or even get insights from your past reflections.</p>
                  </ChatBubbleMessage>
                </ChatBubble>
              ) : (
                messages.filter(m => m.role !== 'system').map((message) => (
                  <ChatBubble
                    key={message.id}
                    variant={message.role === 'user' ? 'sent' : 'received'}
                    className="group"
                  >
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-primary/20 text-primary'}>
                        {message.role === 'user' ? 'You' : 'AI'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 max-w-[85%]">
                      <ChatBubbleMessage
                        variant={message.role === 'user' ? 'sent' : 'received'}
                      >
                        {message.parts && Array.isArray(message.parts) 
                          ? message.parts.map((part, i) => renderMessagePart(message, part as MessagePart, i))
                          : message.content}
                      </ChatBubbleMessage>
                      
                      {message.role === 'assistant' && (
                        <ChatBubbleActions>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-full"
                            onClick={() => copyMessageToClipboard(message.content)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-full"
                            onClick={() => reload()}
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                          </Button>
                        </ChatBubbleActions>
                      )}
                    </div>
                  </ChatBubble>
                ))
              )}
              
              {/* Loading indicator */}
              {isLoading && (
                <ChatBubble variant="received">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-primary/20 text-primary">AI</AvatarFallback>
                  </Avatar>
                  <ChatBubbleMessage variant="received" isLoading />
                </ChatBubble>
              )}
              
              {/* Error display */}
              {error && (
                <div className="flex justify-center w-full my-4">
                  <div className="w-full max-w-[80%] rounded-lg px-4 py-3 bg-destructive/10 text-destructive border border-destructive/20">
                    <p className="font-medium">Error: {error.message || "Something went wrong. Please try again."}</p>
                    {error.cause ? (
                      <p className="text-xs mt-1">Details: {String(JSON.stringify(error.cause))}</p>
                    ) : null}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRetry} 
                      className="mt-2 border-destructive/30 hover:bg-destructive/10"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message input form with speech-to-text */}
            <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm pt-2 pb-4">
              <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                <div className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!isLoading && input.trim() && !isTranscribing) {
                          // Create a synthetic form submit event
                          const form = e.currentTarget.closest('form');
                          if (form) {
                            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                            form.dispatchEvent(submitEvent);
                          }
                        }
                      }
                    }}
                    disabled={isLoading || isTranscribing}
                    className={`min-h-[60px] max-h-[180px] resize-none rounded-lg bg-background border-0 p-3 pr-12 shadow-none focus-visible:ring-0 ${
                      isListening 
                        ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-950/20' 
                        : isTranscribing 
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : ''
                    }`}
                    rows={1}
                  />
                  <div className="absolute right-2 bottom-2 flex gap-2">
                    <Button 
                      type="button" 
                      variant={isListening ? "destructive" : "ghost"}
                      size="icon"
                      onClick={handleMicrophoneClick}
                      disabled={isLoading || isTranscribing}
                      className={`h-8 w-8 rounded-full ${isListening ? 'animate-pulse' : ''}`}
                    >
                      {isTranscribing ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isListening ? (
                        <MicOffIcon className="h-4 w-4" />
                      ) : (
                        <MicIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={isLoading || !input.trim() || isTranscribing}
                      className="h-8 w-8 rounded-full"
                    >
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Speech recognition status */}
                {isListening && (
                  <div className="text-xs text-center text-red-600 dark:text-red-400">
                    🎤 Recording... Click the microphone button to stop
                  </div>
                )}
                {isTranscribing && (
                  <div className="text-xs text-center text-blue-600 dark:text-blue-400">
                    🤖 Transcribing your audio with AI...
                  </div>
                )}
              </form>
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
} 