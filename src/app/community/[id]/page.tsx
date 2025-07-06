'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Heart, Bookmark, Calendar, CheckCircle, List, Award, TrendingUp, Star, Users, Eye } from "lucide-react";
import { toast } from "sonner";
import { 
  getPublicTemplates,
  saveCommunityTemplate, 
  likeTemplate
} from "@/services/templateService";
import { JournalTemplate } from "@/types/journal";

export default function TemplateDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  
  const [template, setTemplate] = useState<JournalTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Load template details
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        const publicTemplates = await getPublicTemplates();
        const foundTemplate = publicTemplates.find(t => t.id === templateId);
        
        if (!foundTemplate) {
          toast.error("Template not found");
          router.push('/community');
          return;
        }
        
        setTemplate(foundTemplate);
      } catch (error) {
        console.error('Error loading template:', error);
        toast.error('Failed to load template');
        router.push('/community');
      } finally {
        setLoading(false);
      }
    };

    if (templateId) {
      loadTemplate();
    }
  }, [templateId, router]);



  const handleSaveTemplate = async () => {
    if (!template) return;
    
    try {
      setIsSaving(true);
      await saveCommunityTemplate({
        id: template.id,
        name: template.name,
        description: template.description,
        fields: template.fields
      });
      toast.success("Template added to your collection!");
      
      // Redirect to templates page after a short delay
      setTimeout(() => {
        router.push('/prompts');
      }, 1500);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to add template. Please make sure you're logged in.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLikeTemplate = async () => {
    if (!template) return;
    
    try {
      setIsLiking(true);
      await likeTemplate(template.id);
      
      // Update local state
      setTemplate(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
      toast.success("Template liked!");
    } catch (error) {
      console.error("Error liking template:", error);
      toast.error("Failed to like template. Please make sure you're logged in.");
    } finally {
      setIsLiking(false);
    }
  };

  const getCategoryIcon = (category: string | undefined) => {
    switch (category?.toLowerCase()) {
      case 'mindfulness':
        return <CheckCircle className="h-4 w-4" />;
      case 'productivity':
        return <List className="h-4 w-4" />;
      case 'self-improvement':
        return <TrendingUp className="h-4 w-4" />;
      case 'mental health':
        return <Heart className="h-4 w-4" />;
      case 'planning':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getFieldTypeDisplay = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return 'Short Answer';
      case 'textarea': return 'Long Text';
      case 'boolean': return 'Yes/No Choice';
      case 'mantra': return 'Reflection';
      case 'table': return 'Table';
      case 'fillable_table': return 'Fillable Table';
      default: return 'Text Input';
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="w-full p-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading template details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="w-full p-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Template not found</p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/community')}
                className="mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Community
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="w-full max-w-4xl mx-auto p-6">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/community')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Community
            </Button>
          </div>

          {/* Template Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    {template.category && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getCategoryIcon(template.category)}
                        {template.category}
                      </Badge>
                    )}
                    {template.featured && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  
                  <CardTitle className="text-2xl mb-2">{template.name}</CardTitle>
                  <CardDescription className="text-base">{template.description}</CardDescription>
                  
                  {/* Template Stats */}
                  <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{template.fields.length} prompts</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{template.likes || 0} likes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>Public template</span>
                    </div>
                  </div>
                </div>

                                 {/* Action Buttons */}
                 <div className="flex gap-2 ml-4">
                   <Button 
                     variant="outline" 
                     onClick={handleLikeTemplate}
                     disabled={isLiking}
                   >
                     <Heart className="h-4 w-4 mr-2" />
                     {isLiking ? "..." : "Like"}
                   </Button>
                   
                   <Button 
                     onClick={handleSaveTemplate}
                     disabled={isSaving}
                     className="bg-primary hover:bg-primary/90"
                   >
                     <Bookmark className="h-4 w-4 mr-2" />
                     {isSaving ? "Adding..." : "Add Template"}
                   </Button>
                 </div>
              </div>
            </CardHeader>
          </Card>

          {/* Author Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Created by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(template.authorName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{template.authorName || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">Community contributor</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Journal Prompts Preview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Journal Prompts ({template.fields.length})</CardTitle>
              <CardDescription>
                Here&apos;s what you&apos;ll be prompted to write about when you start journaling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {template.fields.map((field, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">
                        {idx + 1}. {field.label || field.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {getFieldTypeDisplay(field.type)}
                      </Badge>
                    </div>
                    
                    {field.placeholder && (
                      <p className="text-sm text-muted-foreground italic mb-3">
                        &quot;{field.placeholder}&quot;
                      </p>
                    )}
                    
                    {/* Field Type Preview */}
                    <div className="mt-2">
                      {field.type === 'textarea' && (
                        <div className="p-3 bg-background border rounded text-sm text-muted-foreground">
                          <p>📝 Large text area for detailed writing</p>
                        </div>
                      )}
                      
                      {field.type === 'text' && (
                        <div className="p-2 bg-background border rounded text-sm text-muted-foreground">
                          Single line text input
                        </div>
                      )}
                      
                      {field.type === 'boolean' && (
                        <div className="flex gap-2">
                          <div className="px-3 py-2 bg-background border rounded text-sm">Yes</div>
                          <div className="px-3 py-2 bg-background border rounded text-sm">No</div>
                        </div>
                      )}
                      
                      {field.type === 'mantra' && (
                        <div className="p-3 bg-background border rounded">
                          <p className="text-sm text-muted-foreground mb-2">🧘 Reflection prompt with completion checkbox</p>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border rounded-sm"></div>
                            <span className="text-sm">I have read and reflected on this</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Add this template to your collection</h3>
                <p className="text-muted-foreground mb-4">
                  Save this template with {template.fields.length} thoughtful prompts to your personal templates, then use it anytime
                </p>
                <div className="flex justify-center gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleLikeTemplate}
                    disabled={isLiking}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    {isLiking ? "..." : "Like Template"}
                  </Button>
                  <Button 
                    onClick={handleSaveTemplate}
                    size="lg"
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    {isSaving ? "Adding..." : "Add to My Templates"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 