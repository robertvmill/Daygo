'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTemplates } from "@/services/templateService";
import { JournalTemplate } from "@/types/journal";
import { toast } from "sonner";
import { FileText, Plus, Camera } from "lucide-react";
import Link from "next/link";

export function TemplateSelector() {
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const fetchedTemplates = await getTemplates();
        setTemplates(fetchedTemplates);
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleUseTemplate = (templateId: string) => {
    router.push(`/journal/new?templateId=${templateId}`);
  };

  const handleSkipTemplate = () => {
    router.push('/journal/new');
  };

  const handlePhotoJournal = () => {
    router.push('/journal/new?type=photo');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-10">
            <p className="animate-pulse">Loading templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Select a Template</h2>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/prompts/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Template
            </Link>
          </Button>
          <Button variant="outline" onClick={handleSkipTemplate}>
            Quick Note (Simple)
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-10">
              <h3 className="text-lg font-medium">No templates available</h3>
              <p className="text-muted-foreground mt-1">Create a template first or use a basic entry</p>
              <div className="flex gap-4 justify-center mt-4">
                <Button asChild variant="outline">
                  <Link href="/prompts/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Link>
                </Button>
                <Button onClick={handleSkipTemplate}>
                  Basic Entry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className="overflow-hidden flex flex-col cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleUseTemplate(template.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-sm text-muted-foreground">
                  <p>{template.fields?.length || 0} fields</p>
                  <div className="mt-4 flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Created: {new Date(template.createdAt?.toDate()).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 pb-4">
                <Button className="w-full">
                  Use This Template
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {/* Photo Journal Card */}
          <Card 
            className="overflow-hidden flex flex-col cursor-pointer hover:border-primary transition-colors bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800"
            onClick={handlePhotoJournal}
          >
            <CardContent className="flex-1 flex flex-col items-center justify-center py-10">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                <Camera className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-medium">Photo Journal</h3>
              <p className="text-muted-foreground text-center mt-2">
                Scan or upload a photo of your handwritten journal
              </p>
            </CardContent>
            <CardFooter className="border-t pt-4 pb-4">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600">
                <Camera className="mr-2 h-4 w-4" />
                Start Photo Journal
              </Button>
            </CardFooter>
          </Card>
          
          {/* Create Template Card */}
          <Card 
            className="overflow-hidden flex flex-col border-dashed cursor-pointer hover:border-primary transition-colors"
          >
            <Link href="/prompts/new" className="h-full flex flex-col">
              <CardContent className="flex-1 flex flex-col items-center justify-center py-10">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium">Create New Template</h3>
                <p className="text-muted-foreground text-center mt-2">
                  Design a custom template for your journal entries
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
} 