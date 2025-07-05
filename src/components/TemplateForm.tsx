'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { JournalTemplate, TemplateField } from "@/types/journal";
import { addTemplate, updateTemplate } from "@/services/templateService";

// Function to generate a valid field name from a display label
const generateFieldName = (label: string): string => {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_{2,}/g, '_')     // Replace multiple underscores with a single one
    .replace(/^_|_$/g, '')      // Remove leading/trailing underscores
    .substring(0, 50)           // Limit length
    || 'field';                 // Fallback if empty
};

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  fields: z.array(
    z.object({
      name: z.string().min(1, "Field name is required"),
      type: z.enum(["text", "textarea", "boolean", "mantra"]),
      label: z.string().min(1, "Field label is required"),
      placeholder: z.string().optional(),
      required: z.boolean().default(false),
    })
  ).min(1, "At least one field is required"),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface TemplateFormProps {
  template?: JournalTemplate;
  isEditing?: boolean;
}

export function TemplateForm({ template, isEditing = false }: TemplateFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultValues: TemplateFormValues = {
    name: template?.name || "",
    description: template?.description || "",
    fields: template?.fields?.map((field: TemplateField) => ({
      name: field.name,
      type: field.type,
      label: field.label,
      placeholder: field.placeholder || "",
      required: field.required || false,
    })) || [
      {
        name: generateFieldName("Your first field"),
        type: "text",
        label: "Your first field",
        placeholder: "Enter some text here",
        required: false,
      },
    ],
  };

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  // Auto-update field names when labels change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && name.startsWith('fields.') && name.endsWith('.label')) {
        const index = parseInt(name.split('.')[1]);
        const label = value.fields?.[index]?.label;
        
        if (label && typeof label === 'string') {
          const fieldName = generateFieldName(label);
          
          // Don't update the title field name
          if (fieldName !== 'title' && index > 0) {
            form.setValue(`fields.${index}.name`, fieldName);
          }
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: TemplateFormValues) => {
    setIsSubmitting(true);
    try {
      // Ensure all field names are valid
      const processedData = {
        ...data,
        fields: data.fields.map(field => ({
          ...field,
          name: field.name === 'title' ? 'title' : generateFieldName(field.label)
        }))
      };
      
      if (isEditing && template?.id) {
        await updateTemplate(template.id, processedData);
        toast.success("Template updated successfully");
      } else {
        await addTemplate(processedData);
        toast.success("Template created successfully");
      }
      router.push("/prompts");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(isEditing ? "Failed to update template" : "Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addField = () => {
    append({
      name: "",
      type: "text",
      label: "",
      placeholder: "",
      required: false,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Template Name</FormLabel>
                <FormControl>
                  <Input placeholder="Daily Journal" {...field} />
                </FormControl>
                <FormDescription>
                  Give your template a descriptive name
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="A template for daily journal entries"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Briefly describe the purpose of this template
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Template Fields</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addField}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Field
              </Button>
            </div>

            {fields.length === 0 && (
              <div className="text-center p-4 border rounded-md">
                <p className="text-muted-foreground">
                  No fields added. Click &quot;Add Field&quot; to create form fields.
                </p>
              </div>
            )}

            {fields.map((field, index) => (
              <Card key={field.id} className="overflow-visible">
                <CardContent className="pt-6 pb-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Hidden field name input - automatically generated from label */}
                    <input
                      type="hidden"
                      {...form.register(`fields.${index}.name`)}
                    />

                    <FormField
                      control={form.control}
                      name={`fields.${index}.label`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block mb-2">Field Label</FormLabel>
                          <FormControl>
                            <Input placeholder="How was your day?" {...field} className="h-10" />
                          </FormControl>
                          <FormDescription>
                            Label shown to the user
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`fields.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block mb-2">Field Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select field type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="text">Short Text</SelectItem>
                              <SelectItem value="textarea">Long Text</SelectItem>
                              <SelectItem value="boolean">Yes/No</SelectItem>
                              <SelectItem value="mantra">Mantra</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === "mantra" 
                              ? "A mantra field provides a larger text area with a completion checkbox"
                              : "Type of input for this field"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch(`fields.${index}.type`) !== "boolean" && (
                      <FormField
                        control={form.control}
                        name={`fields.${index}.placeholder`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {form.watch(`fields.${index}.type`) === "mantra" 
                                ? "Mantra Text" 
                                : "Placeholder"}
                            </FormLabel>
                            <FormControl>
                              {form.watch(`fields.${index}.type`) === "mantra" ? (
                                <Textarea
                                  placeholder="Enter the mantra text here..."
                                  className="min-h-[100px]"
                                  {...field}
                                />
                              ) : (
                                <Input
                                  placeholder="Enter placeholder text"
                                  {...field}
                                />
                              )}
                            </FormControl>
                            <FormDescription>
                              {form.watch(`fields.${index}.type`) === "mantra" 
                                ? "The actual mantra text that will be displayed to the user"
                                : "Helper text shown in the input"}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name={`fields.${index}.required`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Required Field</FormLabel>
                            <FormDescription>
                              Make this field mandatory
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Only show delete button if there's more than one field */}
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-4"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Field
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
                          onClick={() => router.push("/prompts")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
              ? "Update Template"
              : "Create Template"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 