'use client';

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { addJournalEntry } from "@/services/journalService";
import { countWords } from "@/services/journalStatsService";
import { toast } from "sonner";
import { JournalTemplate } from "@/types/journal";
import { getTemplate } from "@/services/templateService";
import { FileText, Type } from "lucide-react";

// Common schema for both standard and template forms
const formSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  fields: z.record(z.string().optional()).optional(),
});

// Type for form values
type FormValues = z.infer<typeof formSchema>;

export function JournalEntryForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [template, setTemplate] = useState<JournalTemplate | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("templateId");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      fields: {},
    },
  });

  // Update word count when content changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      const content = value.content || '';
      setWordCount(countWords(content));
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    if (templateId) {
      console.log("Loading template with ID:", templateId);
      setIsLoadingTemplate(true);
      getTemplate(templateId)
        .then((templateData) => {
          console.log("Template loaded:", templateData);
          console.log("Template fields:", templateData.fields);
          
          if (!templateData.fields || !Array.isArray(templateData.fields) || templateData.fields.length === 0) {
            console.error("Template has no fields or fields are not in the correct format");
            toast.error("Template data is invalid. Please select another template.");
            setIsLoadingTemplate(false);
            return;
          }
          
          setTemplate(templateData);
          
          // Initialize form fields with empty values for all template fields
          const initialFields: Record<string, string> = {};
          templateData.fields.forEach(field => {
            console.log(`Initializing field: ${field.name}, type: ${field.type}`);
            // Don't initialize boolean fields with 'false' - leave them undefined so validation works
            if (field.type !== 'boolean') {
              initialFields[field.name] = '';
            }
          });
          
          console.log("Initial fields:", initialFields);
          
          form.reset({
            title: "",
            content: "",
            fields: initialFields,
          });
        })
        .catch((error) => {
          console.error("Error loading template:", error);
          toast.error("Failed to load the selected template");
        })
        .finally(() => {
          setIsLoadingTemplate(false);
        });
    }
  }, [templateId, form]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Form submitted");
    
    try {
      setIsSubmitting(true);
      
      // Get form values directly
      const values = form.getValues();
      console.log("Form values:", values);
      
      let titleToSave = "";
      let contentToSave = "";
      
      // Handle template-based entry
      if (template && values.fields) {
        // Always use template name and date as the title
        titleToSave = `${template.name} - ${new Date().toLocaleDateString()}`;
        
        // Check for required fields
        const missingRequiredFields = template.fields
          .filter(field => {
            if (!field.required) return false;
            
            // For boolean fields, check if a selection was made (not undefined)
            if (field.type === 'boolean') {
              return typeof values.fields?.[field.name] === 'undefined';
            }
            
            // For other fields, check if they exist and are not empty
            return (typeof values.fields?.[field.name] === 'undefined' || 
                    values.fields[field.name]?.trim() === '');
          })
          .map(field => field.name);

        if (missingRequiredFields.length > 0) {
          // Set errors for each missing required field
          missingRequiredFields.forEach(fieldName => {
            const field = template.fields.find(f => f.name === fieldName);
            form.setError(`fields.${fieldName}`, { 
              type: "required", 
              message: `${field?.label || 'This field'} is required` 
            });
          });
          setIsSubmitting(false);
          return;
        }
        
        // Generate formatted content from template fields
        contentToSave = Object.entries(values.fields)
          .map(([key, value]) => {
            const field = template.fields.find(f => f.name === key);
            if (field) {
              if (field.type === 'boolean') {
                return `${field.label}: ${value === 'true' ? 'Yes' : 'No'}`;
              }
              if (field.type === 'mantra') {
                return `${field.label}: ${field.placeholder || 'Your daily mantra'}\nRecited: ${value === 'completed' ? 'Yes' : 'No'}`;
              }
              return `${field.label}: ${value || ''}`;
            }
            return '';
          })
          .filter(Boolean)
          .join('\n\n');
        
        console.log("Saving template entry:", {
          title: titleToSave,
          content: contentToSave,
          templateId: template.id
        });
        
        await addJournalEntry({
          title: titleToSave,
          content: contentToSave,
          templateId: template.id,
          templateFields: values.fields,
        });
      } 
      // Handle standard entry
      else {
        titleToSave = values.title || "";
        contentToSave = values.content || "";
        
        if (!contentToSave || contentToSave.length < 10) {
          form.setError("content", { 
            type: "manual", 
            message: "Content should be at least 10 characters long" 
          });
          setIsSubmitting(false);
          return;
        }
        
        console.log("Saving standard entry:", {
          title: titleToSave,
          content: contentToSave
        });
        
        await addJournalEntry({
          title: titleToSave,
          content: contentToSave,
        });
      }
      
      toast.success("Journal entry saved successfully!");
      form.reset();
      router.push("/journal");
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast.error("Failed to save journal entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeTemplate = () => {
    router.push("/journal/select-template");
  };

  if (isLoadingTemplate) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-10">
            <p className="animate-pulse">Loading template...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (template) {
    console.log("Template being rendered:", template);
    console.log("Number of fields:", template.fields.length);
    console.log("Field types:", template.fields.map(f => f.type).join(', '));
    
    // Ensure template fields are valid
    if (!template.fields || !Array.isArray(template.fields) || template.fields.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-10">
              <p className="text-red-500 mb-4">Template data is invalid</p>
              <Button variant="outline" onClick={() => router.push("/journal/select-template")}>
                Select Another Template
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>New Journal Entry with {template.name}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <FileText className="h-3 w-3 mr-1" />
                {template.fields.length} fields
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleChangeTemplate}>
              Change Template
            </Button>
          </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 pt-4 pb-10">
              {/* Render all template fields without special handling for title */}
              {template.fields.map((templateField) => {
                // Skip any field called 'title' if it exists in the template
                if (templateField.name === 'title') return null;
                
                console.log("Rendering field:", templateField.name, templateField.type, templateField.label);
                return (
                <FormField
                  key={templateField.name}
                  control={form.control}
                  name={`fields.${templateField.name}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {templateField.label}
                        {!templateField.required && <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
                      </FormLabel>
                      <FormControl>
                        {templateField.type === "textarea" ? (
                          <Textarea
                            placeholder={templateField.placeholder}
                            {...field}
                            value={field.value || ""}
                            required={templateField.required}
                          />
                        ) : templateField.type === "boolean" ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={field.value === "true" ? "default" : "outline"}
                              size="sm"
                              onClick={() => field.onChange("true")}
                              className="min-w-[60px]"
                            >
                              Y
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === "false" ? "default" : "outline"}
                              size="sm"
                              onClick={() => field.onChange("false")}
                              className="min-w-[60px]"
                            >
                              N
                            </Button>
                          </div>
                        ) : templateField.type === "mantra" ? (
                          <div className="space-y-4">
                            <div className="bg-muted p-6 rounded-lg border border-muted-foreground/20">
                              <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap">
                                {templateField.placeholder || "Your daily mantra"}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Checkbox
                                id={`mantra-completed-${templateField.name}`}
                                checked={field.value === "completed"}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked ? "completed" : "");
                                }}
                                required={templateField.required}
                              />
                              <label
                                htmlFor={`mantra-completed-${templateField.name}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                I have recited this mantra
                              </label>
                            </div>
                          </div>
                        ) : (
                          <Input
                            placeholder={templateField.placeholder}
                            {...field}
                            value={field.value || ""}
                            required={templateField.required}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                );
              })}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/journal")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Entry"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    );
  }

  // Default form without template
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>New Journal Entry</CardTitle>
          <Button variant="outline" size="sm" onClick={handleChangeTemplate}>
            Use Template
          </Button>
        </div>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter a title (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your thoughts here..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="flex items-center justify-between">
                    <span>Express your thoughts, ideas, or reflections</span>
                    <span className="flex items-center gap-1 text-xs">
                      <Type className="h-3 w-3" />
                      {wordCount} words
                    </span>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/journal")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Entry"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 