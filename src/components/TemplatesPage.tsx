"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JournalTemplate } from "@/types/journal";
import { getTemplates, deleteTemplate, makeTemplatePublic, makeTemplatePrivate } from "@/services/templateService";
import { toast } from "sonner";
import { Edit, FileText, Plus, Trash2, Globe, Lock } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TemplatesPage() {
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [publicDialogOpen, setPublicDialogOpen] = useState(false);
  const [templateToMakePublic, setTemplateToMakePublic] = useState<JournalTemplate | null>(null);
  const [publicCategory, setPublicCategory] = useState("");
  const [publicTags, setPublicTags] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();

  // Available categories for public templates
  const categories = [
    "Mindfulness",
    "Productivity", 
    "Mental Health",
    "Self-Improvement",
    "Planning",
    "Health & Wellness",
    "Creativity",
    "Learning",
    "Other"
  ];

  // This useEffect hook fetches data from Firebase when the component mounts
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        // getTemplates() makes a call to Firebase to fetch template data
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

  // This function deletes a template from Firebase
  const confirmDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      // deleteTemplate() makes a call to Firebase to delete the template
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

  const handleMakePublic = (template: JournalTemplate) => {
    setTemplateToMakePublic(template);
    setPublicCategory(template.category || "");
    setPublicTags(template.tags?.join(", ") || "");
    setPublicDialogOpen(true);
  };

  // This function updates a template's visibility to public in Firebase
  const confirmMakePublic = async () => {
    if (!templateToMakePublic) return;
    
    try {
      setActionLoading(templateToMakePublic.id);
      
      const tags = publicTags
        .split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);
      
      // makeTemplatePublic() makes a call to Firebase to update the template
      await makeTemplatePublic(templateToMakePublic.id, publicCategory, tags);
      
      // Reload templates from Firebase
      const fetchedTemplates = await getTemplates();
      setTemplates(fetchedTemplates);
      
      toast.success("Template is now public and available in the community!");
      setPublicDialogOpen(false);
      setTemplateToMakePublic(null);
      setPublicCategory("");
      setPublicTags("");
    } catch (error) {
      console.error('Error making template public:', error);
      toast.error('Failed to make template public');
    } finally {
      setActionLoading(null);
    }
  };

  // This function updates a template's visibility to private in Firebase
  const handleMakePrivate = async (templateId: string) => {
    try {
      setActionLoading(templateId);
      // makeTemplatePrivate() makes a call to Firebase to update the template
      await makeTemplatePrivate(templateId);
      
      // Reload templates from Firebase
      const fetchedTemplates = await getTemplates();
      setTemplates(fetchedTemplates);
      
      toast.success("Template is now private");
    } catch (error) {
      console.error('Error making template private:', error);
      toast.error('Failed to make template private');
    } finally {
      setActionLoading(null);
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
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{template.name}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {template.isPublic ? (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Private
                          </Badge>
                        )}
                        {template.isPublic && template.likes && (
                          <Badge variant="outline" className="text-xs">
                            {template.likes} likes
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="text-sm text-muted-foreground">
                      <p>{template.fields?.length || 0} fields</p>
                      {template.category && (
                        <p className="mt-1">Category: {template.category}</p>
                      )}
                      <div className="mt-4 flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>Created: {new Date(template.createdAt?.toDate()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t pt-4 pb-4">
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditTemplate(template.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      {template.isPublic ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleMakePrivate(template.id)}
                          disabled={actionLoading === template.id}
                        >
                          <Lock className="h-4 w-4 mr-1" />
                          Make Private
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleMakePublic(template)}
                          disabled={actionLoading === template.id}
                        >
                          <Globe className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      )}
                      
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

      {/* Make Public Dialog */}
      <Dialog open={publicDialogOpen} onOpenChange={setPublicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Template with Community</DialogTitle>
            <DialogDescription>
              Make your template available to all Daygo users. You can update these details later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={publicCategory} onValueChange={setPublicCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., gratitude, morning, habits"
                value={publicTags}
                onChange={(e) => setPublicTags(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Help users discover your template with relevant tags
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPublicDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmMakePublic}
              disabled={!publicCategory || actionLoading === templateToMakePublic?.id}
            >
              {actionLoading === templateToMakePublic?.id ? "Sharing..." : "Share Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Existing Delete Dialog */}
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