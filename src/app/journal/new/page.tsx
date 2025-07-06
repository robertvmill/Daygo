'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { getTemplate } from '@/services/templateService';
import { addJournalEntry, generateContentFromTemplateFields } from '@/services/journalService';
import { countWords } from '@/services/journalStatsService';
import { JournalTemplate, TemplateField } from '@/types/journal';
import Link from 'next/link';
import { ArrowLeft, Save, Camera, Upload, X, Mic, Square, Type } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { extractTextFromPhoto, validatePhotoFile } from '@/services/photoProcessingService';

type TableFormData = {
  cells: string[][];
  headers: string[];
  rows: number;
  columns: number;
};

type JournalFormData = {
  title: string;
  [key: string]: string | boolean | TableFormData | undefined;
}; // This defines the end of the JournalFormData type interface
   // JournalFormData is used to store form data for journal entries with:
   // - title: A required string field for the journal entry title
   // - Dynamic key-value pairs where values can be:
   //   * string: For text input fields
   //   * boolean: For checkbox fields
   //   * TableFormData: For table input data
   //   * undefined: For optional fields

export default function NewJournalEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');
  const communityTemplateParam = searchParams.get('communityTemplate');
  const journalType = searchParams.get('type');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [template, setTemplate] = useState<JournalTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<JournalFormData>({
    title: '',
  });
  
  // Photo journal specific states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [textExtractionComplete, setTextExtractionComplete] = useState(false);
  
  // Drag and drop states
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragAccept, setIsDragAccept] = useState(false);
  const [isDragReject, setIsDragReject] = useState(false);

  // Speech-to-text states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingFor, setRecordingFor] = useState<string | null>(null); // Track which field is being recorded for
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load template data (either from user templates, community template, or photo journal)
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);

        // Check if this is a photo journal
        if (journalType === 'photo') {
          const serverTimestamp = Timestamp.now();
          setTemplate({
            id: 'photo-journal',
            name: 'Photo Journal',
            description: 'Upload a photo of your handwritten journal with optional caption',
            fields: [
              {
                name: 'photo',
                type: 'file',
                label: 'Journal Photo',
                placeholder: 'Upload or capture a photo of your journal',
                required: true,
              },
              {
                name: 'caption',
                type: 'textarea',
                label: 'Caption (Optional)',
                placeholder: 'Add any thoughts or context about this journal entry...',
                required: false,
              },
            ],
            userId: 'system',
            createdAt: serverTimestamp
          });
          setFormData(prev => ({ ...prev, title: `Photo Journal - ${new Date().toLocaleDateString()}` }));
        }
        // Check if using a community template
        else if (communityTemplateParam) {
          try {
            const parsedTemplate = JSON.parse(communityTemplateParam);
            
            // Convert community template format to our app's format
            const serverTimestamp = Timestamp.now();
            const formattedTemplate: JournalTemplate = {
              id: parsedTemplate.id.toString(),
              name: parsedTemplate.name,
              description: parsedTemplate.description,
              fields: parsedTemplate.fields.map((field: TemplateField) => ({
                            name: field.name,
            type: field.type || 'text',
            label: field.label || field.name,
                placeholder: '',
                required: false,
                // Preserve tableData if present
                ...(field.tableData ? { tableData: field.tableData } : {})
              })),
              userId: 'community',
              createdAt: serverTimestamp
            };
            
            setTemplate(formattedTemplate);
            setFormData(prev => ({ ...prev, title: `${formattedTemplate.name} - ${new Date().toLocaleDateString()}` }));
          } catch (error) {
            console.error('Error parsing community template:', error);
            toast.error('Invalid template data');
            router.push('/journal/select-template');
          }
        } 
        // Using user's saved template
        else if (templateId) {
          const fetchedTemplate = await getTemplate(templateId);
          console.log("Loaded template:", fetchedTemplate);
          
          // Log table fields specifically for debugging
          if (fetchedTemplate.fields) {
            const tableFields = fetchedTemplate.fields.filter(f => f.type === 'table');
            console.log(`Found ${tableFields.length} table fields:`, tableFields);
          }
          
          setTemplate(fetchedTemplate);
          setFormData(prev => ({ ...prev, title: `${fetchedTemplate.name} - ${new Date().toLocaleDateString()}` }));
        } 
        // Basic entry without template
        else {
          // Create a basic template with proper Timestamp
          const serverTimestamp = Timestamp.now();
          setTemplate({
            id: 'basic',
            name: 'Quick Note (Simple)',
            description: 'Write your thoughts or upload a photo of your handwritten journal',
            fields: [
              {
                name: 'content',
                type: 'textarea',
                label: 'Journal Content',
                placeholder: 'Write your thoughts here...',
                required: false,
              },
              {
                name: 'photo',
                type: 'file',
                label: 'Upload Photo (Optional)',
                placeholder: 'Upload a photo of your handwritten journal for automatic text extraction',
                required: false,
              },
            ],
            userId: 'system',
            createdAt: serverTimestamp
          });
        }
      } catch (error) {
        console.error('Error loading template:', error);
        toast.error('Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, communityTemplateParam, journalType, router]);

  // Handle file selection for photo upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file using the photo processing service
      const validation = validatePhotoFile(file);
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid file');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture (opens camera on mobile)
  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  // Handle file upload button
  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setExtractedText('');
    setTextExtractionComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Extract text from uploaded photo
  const handleExtractText = async () => {
    if (!selectedImage) return;

    setIsExtractingText(true);
    try {
      const extractedResult = await extractTextFromPhoto(selectedImage);
      if (extractedResult.text) {
        setExtractedText(extractedResult.text);
        setTextExtractionComplete(true);
        toast.success('Text extracted successfully!');
      } else {
        toast.error('No text could be extracted from the image');
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      toast.error('Failed to extract text from image');
    } finally {
      setIsExtractingText(false);
    }
  };

  // Speech-to-text functions
  // This function starts recording audio from the user's microphone
  // It uses the browser's MediaRecorder API to capture audio
  const startRecording = async (fieldName: string) => {
    try {
      // Request microphone permission from the user
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create a MediaRecorder to record the audio stream
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Set up event handler for when audio data is available
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      // Set up event handler for when recording stops
      mediaRecorder.onstop = async () => {
        // Combine all audio chunks into one blob
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Send audio to speech-to-text API
        await transcribeAudio(audioBlob, fieldName);
        
        // Clean up - stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingFor(fieldName);
      toast.success('Recording started! Speak clearly.');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  // This function stops the current audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingFor(null);
      toast.info('Recording stopped. Processing...');
    }
  };

  // This function sends the recorded audio to OpenAI's Whisper API for transcription
  const transcribeAudio = async (audioBlob: Blob, fieldName: string) => {
    setIsTranscribing(true);
    try {
      // Create form data to send audio file to our API
      const audioFormData = new FormData();
      audioFormData.append('audio', audioBlob, 'recording.webm');
      
      // Send to our speech-to-text API endpoint
      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: audioFormData,
      });
      
      const result = await response.json();
      
      if (response.ok && result.text) {
        // Update the appropriate form field with transcribed text
        if (fieldName === 'title') {
          handleInputChange('title', result.text);
        } else {
          // For content fields, append or set the transcribed text
          const currentValue = (typeof formData[fieldName] === 'string' ? formData[fieldName] as string : '') || '';
          const newValue = currentValue ? `${currentValue} ${result.text}` : result.text;
          handleInputChange(fieldName, newValue);
        }
        toast.success('Speech transcribed successfully!');
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast.error('Failed to transcribe speech. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
    
    // Check if the dragged item contains files
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0];
      if (item.type.startsWith('image/')) {
        setIsDragAccept(true);
        setIsDragReject(false);
      } else {
        setIsDragAccept(false);
        setIsDragReject(true);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only remove drag state if we're leaving the drop zone entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragActive(false);
      setIsDragAccept(false);
      setIsDragReject(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragActive(false);
    setIsDragAccept(false);
    setIsDragReject(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      
      // Validate file using the photo processing service
      const validation = validatePhotoFile(file);
      if (!validation.isValid) {
        toast.error(validation.error || 'Invalid file');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (fieldName: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!template) return;

    // Basic validation
    if (!formData.title.trim()) {
      toast.error('Please enter a title for your journal entry');
      return;
    }

    // Special validation for photo journal
    if (template.id === 'photo-journal') {
      if (!selectedImage) {
        toast.error('Please select a photo for your journal entry');
        return;
      }
    }

    // Validate required fields
    const requiredFields = template.fields.filter(field => field.required);
    for (const field of requiredFields) {
      if (field.type === 'file' && !selectedImage) {
        toast.error(`Please upload a photo for: ${field.label}`);
        return;
      }
      if (field.type === 'boolean') {
        // For boolean fields, check if a selection was made (not undefined)
        if (formData[field.name] === undefined) {
          toast.error(`Please fill in the required field: ${field.label}`);
          return;
        }
      } else if (field.type !== 'file' && !formData[field.name]) {
        toast.error(`Please fill in the required field: ${field.label}`);
        return;
      }
    }

    // Special validation for Quick Note - user must provide either photo OR text content
    if (template.id === 'basic' && template.name === 'Quick Note (Simple)') {
      const hasPhoto = selectedImage;
      const hasTextContent = formData['content'] && (formData['content'] as string).trim();
      
      if (!hasPhoto && !hasTextContent) {
        toast.error('Please either write content or upload a photo for your journal entry');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Prepare the data
      const templateFields: Record<string, string | undefined> = {};
      
      // Handle photo journal with pre-extracted text
      if (template.id === 'photo-journal' && selectedImage) {
        if (!textExtractionComplete || !extractedText) {
          toast.error('Please extract text from the image first using the "Extract Text" button');
          setIsSubmitting(false);
          return;
        }
        
        // Use the pre-extracted and potentially edited text
        templateFields['extractedText'] = extractedText;
        templateFields['caption'] = (formData['caption'] as string) || '';
      } 
      // Handle Quick Note with photo, combine extracted text with any typed content
      else if (template.id === 'basic' && selectedImage) {
        if (!textExtractionComplete || !extractedText) {
          toast.error('Please extract text from the image first using the "Extract Text" button');
          setIsSubmitting(false);
          return;
        }
        
        // Use the pre-extracted and potentially edited text
        templateFields['extractedText'] = extractedText;
        templateFields['content'] = (formData['content'] as string) || '';
      } else {
        // Handle regular template fields
        Object.entries(formData).forEach(([key, value]) => {
          if (key === 'title') return; // Skip title
          // Serialize table/filled table cells as JSON string
          if (typeof value === 'object' && value && 'cells' in value) {
            templateFields[key] = JSON.stringify((value as { cells: string[][] }).cells);
          } else if (typeof value === 'boolean') {
            templateFields[key] = value ? 'true' : 'false';
          } else if (typeof value === 'string') {
            templateFields[key] = value;
          }
        });
      }
      
      // Generate content from template fields
      let content = '';
      
      // For Photo Journal, create content from extracted text
      if (template.id === 'photo-journal') {
        content = templateFields['extractedText'] || '';
        if (templateFields['caption']) {
          content += `\n\n--- Caption ---\n${templateFields['caption']}`;
        }
        if (templateFields['confidence']) {
          const confidence = parseFloat(templateFields['confidence']) * 100;
          content += `\n\n--- Processing Info ---\nOCR Confidence: ${confidence.toFixed(1)}%`;
        }
      }
      // For Quick Note with photo, combine extracted text with any typed content
      else if (template.id === 'basic' && templateFields['extractedText']) {
        const extractedText = templateFields['extractedText'] || '';
        const typedContent = templateFields['content'] || '';
        
        // Combine both sources of content
        if (extractedText && typedContent) {
          content = `${extractedText}\n\n--- Additional Notes ---\n${typedContent}`;
        } else if (extractedText) {
          content = extractedText;
        } else {
          content = typedContent;
        }
        
        // Add confidence info if available
        if (templateFields['confidence']) {
          const confidence = parseFloat(templateFields['confidence']) * 100;
          content += `\n\n--- OCR Info ---\nText extracted from photo (${confidence.toFixed(1)}% confidence)`;
        }
      }
      // For Quick Note (Simple), ensure we use the content directly
      else if (template.id === 'basic' && template.name === 'Quick Note (Simple)') {
        content = templateFields['content'] || '';
        
        // Log detailed info about the quick note for debugging
        console.log('Quick Note (Simple) details:');
        console.log('- Content length:', content.length);
        console.log('- Template ID:', template.id);
        console.log('- Title:', formData.title);
        console.log('- Content preview:', content ? `${content.substring(0, 50)}...` : 'Empty content');
        
        // Sanity check for empty content
        if (!content.trim()) {
          console.warn('Warning: Empty content for Quick Note');
        }
      } else {
        // For regular templates, generate formatted content
        content = generateContentFromTemplateFields(templateFields);
      }

      // Prepare data for submission
      const submissionData: {
        title: string;
        content: string;
        templateId?: string;
        templateFields: Record<string, string | undefined>;
      } = {
        title: formData.title as string,
        content,
        templateFields,
      };
      
      // Special handling for Quick Notes - ensure content is properly saved
      if (template.id === 'basic' && template.name === 'Quick Note (Simple)') {
        // Make absolutely sure content is populated properly for Quick Notes
        if (!content.trim() && templateFields['content']) {
          submissionData.content = templateFields['content'];
          console.log('Corrected empty content for Quick Note:', 
            submissionData.content ? submissionData.content.substring(0, 50) + '...' : 'still empty');
        }
      }
      
      // Only add templateId for non-basic templates (but include photo-journal)
      if (template.id !== 'basic') {
        submissionData.templateId = template.id;
      }

      // Create the entry
      const entryId = await addJournalEntry(submissionData);

      toast.success('Journal entry saved successfully');
      
      // Check if there was a successful embedding (look for success message in console)
      // Note: This is a hacky way to check, but we can't directly access the embedding status
      // We could improve this with a proper API response later
      setTimeout(() => {
        const journalUrl = `/journal/${entryId}`;
        router.push(journalUrl);
      }, 500); // Small delay to show the success toast
    } catch (error) {
      console.error('Error saving journal entry:', error);
      toast.error('Failed to save journal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render a field based on its type
  const renderField = (field: TemplateField) => {
    switch (field.type) {
      case 'file':
        return (
          <div key={field.name} className="space-y-4">
            <Label htmlFor={field.name}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Image preview and text extraction */}
            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Journal preview" 
                    className="w-full max-w-md rounded-lg border shadow-sm"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Extract Text Button */}
                {!textExtractionComplete ? (
                  <Button
                    type="button"
                    onClick={handleExtractText}
                    disabled={isExtractingText}
                    className="w-full"
                  >
                    {isExtractingText ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Extracting Text...
                      </>
                    ) : (
                      'Extract Text from Image'
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="extracted-text">Extracted Text (Editable)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTextExtractionComplete(false);
                          setExtractedText('');
                        }}
                      >
                        Extract Again
                      </Button>
                    </div>
                    <Textarea
                      id="extracted-text"
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      placeholder="Edit the extracted text here..."
                      className="min-h-32"
                    />
                    <p className="text-sm text-muted-foreground">
                      ✅ Text extracted successfully! You can edit it above before saving your journal entry.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Upload buttons with drag and drop */
              <div className="space-y-3">
                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`
                    border-2 border-dashed rounded-lg p-6 transition-all duration-200 cursor-pointer
                    ${isDragActive 
                      ? isDragAccept 
                        ? 'border-green-400 bg-green-50 dark:bg-green-950/20' 
                        : isDragReject 
                          ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
                          : 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }
                  `}
                  onClick={handleFileUpload}
                >
                  <div className="text-center">
                    <Upload className={`mx-auto h-12 w-12 mb-4 ${
                      isDragActive 
                        ? isDragAccept 
                          ? 'text-green-500' 
                          : isDragReject 
                            ? 'text-red-500'
                            : 'text-blue-500'
                        : 'text-gray-400'
                    }`} />
                    <div className="space-y-2">
                      {isDragActive ? (
                        isDragAccept ? (
                          <p className="text-green-600 dark:text-green-400 font-medium">
                            Drop your image here
                          </p>
                        ) : isDragReject ? (
                          <p className="text-red-600 dark:text-red-400 font-medium">
                            Only image files are allowed
                          </p>
                        ) : (
                          <p className="text-blue-600 dark:text-blue-400 font-medium">
                            Drop files here
                          </p>
                        )
                      ) : (
                        <>
                          <p className="text-lg font-medium text-foreground">
                            Drag & drop an image here
                          </p>
                          <p className="text-sm text-muted-foreground">
                            or click to browse files
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Alternative buttons */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or use these options
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCameraCapture}
                    className="h-16 flex flex-col gap-2"
                  >
                    <Camera className="h-5 w-5" />
                    <span>Take Photo</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFileUpload}
                    className="h-16 flex flex-col gap-2"
                  >
                    <Upload className="h-5 w-5" />
                    <span>Browse Files</span>
                  </Button>
                </div>
                
                <p className="text-sm text-muted-foreground text-center">
                  {field.placeholder}
                </p>
              </div>
            )}
          </div>
        );
      
      case 'text':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <div className="relative">
              <Input
                id={field.name}
                placeholder={field.placeholder}
                value={typeof formData[field.name] === 'string' ? formData[field.name] as string : ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                className="pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 ${
                  isRecording && recordingFor === field.name 
                    ? 'text-red-500 animate-pulse' 
                    : isTranscribing 
                    ? 'text-blue-500' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  if (isRecording && recordingFor === field.name) {
                    stopRecording();
                  } else if (!isRecording && !isTranscribing) {
                    startRecording(field.name);
                  }
                }}
                disabled={isTranscribing || (isRecording && recordingFor !== field.name)}
                title={
                  isRecording && recordingFor === field.name 
                    ? 'Stop recording' 
                    : isTranscribing 
                    ? 'Processing...' 
                    : 'Record with voice'
                }
              >
                {isRecording && recordingFor === field.name ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        );
      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.name}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 px-3 gap-2 ${
                  isRecording && recordingFor === field.name 
                    ? 'text-red-500 border-red-500 animate-pulse' 
                    : isTranscribing 
                    ? 'text-blue-500 border-blue-500' 
                    : ''
                }`}
                onClick={() => {
                  if (isRecording && recordingFor === field.name) {
                    stopRecording();
                  } else if (!isRecording && !isTranscribing) {
                    startRecording(field.name);
                  }
                }}
                disabled={isTranscribing || (isRecording && recordingFor !== field.name)}
                title={
                  isRecording && recordingFor === field.name 
                    ? 'Stop recording' 
                    : isTranscribing 
                    ? 'Processing...' 
                    : 'Record with voice'
                }
              >
                {isRecording && recordingFor === field.name ? (
                  <>
                    <Square className="h-3 w-3" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="h-3 w-3" />
                    {isTranscribing ? 'Processing...' : 'Voice'}
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              value={typeof formData[field.name] === 'string' ? formData[field.name] as string : ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className="min-h-32"
            />
            <div className="flex justify-end">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Type className="h-3 w-3" />
                {countWords(typeof formData[field.name] === 'string' ? formData[field.name] as string : '')} words
              </span>
            </div>
          </div>
        );
      case 'boolean':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData[field.name] === true ? "default" : "outline"}
                size="sm"
                onClick={() => handleInputChange(field.name, true)}
                className="min-w-[60px]"
              >
                Y
              </Button>
              <Button
                type="button"
                variant={formData[field.name] === false ? "default" : "outline"}
                size="sm"
                onClick={() => handleInputChange(field.name, false)}
                className="min-w-[60px]"
              >
                N
              </Button>
            </div>
          </div>
        );
      case 'mantra':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            <div className="p-4 border rounded-md bg-card shadow-sm">
              <p className="font-medium text-foreground whitespace-pre-wrap">{field.placeholder || "No mantra text provided"}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id={`${field.name}_completed`}
                checked={!!formData[field.name]}
                onCheckedChange={(checked) => handleInputChange(field.name, checked as boolean)}
              />
              <Label htmlFor={`${field.name}_completed`} className="cursor-pointer">
                I have read and reflected on this mantra
              </Label>
            </div>
          </div>
        );
      case 'table':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            {field.tableData?.headers && field.tableData?.cells ? (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors">
                      {field.tableData.headers.map((header, index) => (
                        <th key={`${field.name}-header-${index}`} className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {field.tableData.cells.map((row, rowIndex) => (
                      <tr key={`${field.name}-row-${rowIndex}`} className="border-b transition-colors hover:bg-muted/50">
                        {row.map((cell, cellIndex) => (
                          <td key={`${field.name}-cell-${rowIndex}-${cellIndex}`} className="p-2 align-middle">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 border rounded-md bg-muted/50 text-muted-foreground">Table data not available</div>
            )}
          </div>
        );
      case 'fillable_table':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
            {field.tableData && field.tableData.headers && field.tableData.rows ? (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors">
                      {field.tableData.headers.map((header, index) => (
                        <th key={`${field.name}-header-${index}`} className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {((formData[field.name] && typeof formData[field.name] === 'object' && (formData[field.name] as TableFormData).cells) || (field.tableData && field.tableData.cells) || (field.tableData && Array(field.tableData.rows || 0).fill(null).map(() => Array(field.tableData?.columns || 0).fill('')))).map((row: string[], rowIndex: number) => (
                      <tr key={`${field.name}-row-${rowIndex}`} className="border-b transition-colors hover:bg-muted/50">
                        {row.map((cell: string, cellIndex: number) => (
                          <td key={`${field.name}-cell-${rowIndex}-${cellIndex}`} className="p-2 align-middle">
                            <Input
                              value={typeof cell === 'string' ? cell : ''}
                              onChange={e => {
                                if (!field.tableData) return;
                                const newTable = (formData[field.name] && typeof formData[field.name] === 'object' && (formData[field.name] as TableFormData).cells)
                                  ? (formData[field.name] as TableFormData).cells.map((r: string[], i: number) => i === rowIndex ? r.map((c, j) => j === cellIndex ? e.target.value : c) : r)
                                  : (field.tableData.cells ? field.tableData.cells.map(r => [...r]) : Array(field.tableData?.rows || 0).fill(null).map(() => Array(field.tableData?.columns || 0).fill('')));
                                newTable[rowIndex][cellIndex] = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  [field.name]: {
                                    ...(prev[field.name] as TableFormData),
                                    cells: newTable,
                                    headers: field.tableData?.headers || [],
                                    rows: newTable.length,
                                    columns: field.tableData?.columns || 0
                                  }
                                }));
                              }}
                              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-1 h-auto"
                              placeholder={`Cell ${rowIndex+1},${cellIndex+1}`}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end p-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!field.tableData) return;
                      const current = (formData[field.name] && typeof formData[field.name] === 'object' && (formData[field.name] as TableFormData).cells) || field.tableData.cells || Array(field.tableData?.rows || 0).fill(null).map(() => Array(field.tableData?.columns || 0).fill(''));
                      const newRow = Array(field.tableData?.columns || 0).fill('');
                      const newTable = [...current, newRow];
                      setFormData((prev) => ({
                        ...prev,
                        [field.name]: {
                          ...(prev[field.name] as TableFormData),
                          cells: newTable,
                          headers: field.tableData?.headers || [],
                          rows: newTable.length,
                          columns: field.tableData?.columns || 0
                        }
                      }));
                    }}
                  >
                    + Add Row
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-md bg-muted/50 text-muted-foreground">Table data not available</div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex sticky top-0 z-10 h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/journal">Journal</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>New Entry</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="ml-auto flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || loading}
              className="gap-1"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse">Loading template...</div>
            </div>
          ) : template ? (
            <>
              <h1 className="text-3xl font-bold">New Journal Entry</h1>
              
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Template: {template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
              </Card>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Entry Title <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      id="title"
                      placeholder="Enter a title for your journal entry"
                      value={formData.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 ${
                        isRecording && recordingFor === 'title' 
                          ? 'text-red-500 animate-pulse' 
                          : isTranscribing 
                          ? 'text-blue-500' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => {
                        if (isRecording && recordingFor === 'title') {
                          stopRecording();
                        } else if (!isRecording && !isTranscribing) {
                          startRecording('title');
                        }
                      }}
                      disabled={isTranscribing || (isRecording && recordingFor !== 'title')}
                      title={
                        isRecording && recordingFor === 'title' 
                          ? 'Stop recording' 
                          : isTranscribing 
                          ? 'Processing...' 
                          : 'Start recording'
                      }
                    >
                      {isRecording && recordingFor === 'title' ? (
                        <Square className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {template.fields.map(field => renderField(field))}
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    size="lg"
                    className="gap-1"
                  >
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Save Journal Entry'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex justify-center py-10">
              <p>Template not found. <Link href="/journal/select-template" className="text-primary underline">Select a different template</Link></p>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 