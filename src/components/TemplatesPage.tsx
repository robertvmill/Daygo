"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JournalTemplate } from "@/types/journal";
import { getTemplates, deleteTemplate } from "@/services/templateService";
import { toast } from "sonner";
import { Edit, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { AppSidebar } from "./AppSidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AITemplateGenerator } from "@/components/AITemplateGenerator";
import { UsageLimitBanner } from "./UsageLimitBanner";

export function TemplatesPage() {
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
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

  const handleEditTemplate = (templateId: string) => {
    router.push(`/prompts/edit/${templateId}`);
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/journal/new?templateId=${templateId}`);
  };

  const openDeleteDialog = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      await deleteTemplate(templateToDelete);
      setTemplates(templates.filter(template => template.id !== templateToDelete));
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
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
                <BreadcrumbPage>Templates</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
          {/* Usage limit banner for subscription management */}
          <UsageLimitBanner type="compact" className="mb-4" />
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Journal Templates</h1>
            <div className="flex gap-2">
              <AITemplateGenerator />
              <Button asChild>
                <Link href="/prompts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Template
                </Link>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse">Loading templates...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-10 border rounded-lg">
              <h3 className="text-lg font-medium">No templates yet</h3>
              <p className="text-muted-foreground mt-1">Create your first journal template to get started</p>
              <div className="flex justify-center gap-2 mt-4">
                <AITemplateGenerator />
                <Button asChild>
                  <Link href="/prompts/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {templates.map(template => (
                <Card 
                  key={template.id} 
                  className="overflow-hidden flex flex-col"
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
                  <CardFooter className="flex justify-between border-t pt-4 pb-4">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditTemplate(template.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => openDeleteDialog(template.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                    <Button 
                      onClick={() => handleUseTemplate(template.id)}
                    >
                      Use
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>
      </SidebarInset>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
} 