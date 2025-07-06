'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Bookmark, Heart, Calendar, CheckCircle, List, Award, TrendingUp, Star, Shield, X, PenTool, Eye } from "lucide-react";
import { toast } from "sonner";
import { 
  saveCommunityTemplate, 
  getPublicTemplates, 
  likeTemplate, 
  isAdmin, 
  featureTemplate, 
  unfeatureTemplate, 
  removeTemplateFromPublic 
} from "@/services/templateService";
import { useRouter } from "next/navigation";
import { JournalTemplate } from "@/types/journal";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { CommunityAdminPanel } from "@/components/CommunityAdminPanel";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CommunityPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [likingTemplateId, setLikingTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const router = useRouter();

  // Check if user is admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setUserIsAdmin(isAdmin());
    });
    return () => unsubscribe();
  }, []);

  // Load public templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const publicTemplates = await getPublicTemplates();
        setTemplates(publicTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
        toast.error('Failed to load community templates');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);
  
  const filteredTemplates = templates.filter(template => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.authorName?.toLowerCase().includes(query) ||
        template.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    if (activeCategory === 'featured') return template.featured;
    if (activeCategory === 'popular') return (template.likes || 0) > 5; // Consider 5+ likes as popular
    if (activeCategory !== 'all') return template.category?.toLowerCase() === activeCategory.toLowerCase();
    return true;
  });

  const handleUseTemplate = (templateId: string) => {
    // Find the template
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    // Redirect to create a new journal entry with this template
    router.push(`/journal/new?communityTemplate=${JSON.stringify({
      id: template.id,
      name: template.name,
      description: template.description,
      fields: template.fields
    })}`);
  };

  const handleSaveTemplate = async (templateId: string) => {
    try {
      setSavingTemplateId(templateId);
      
      // Find the template
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        toast.error("Template not found");
        return;
      }
      
      // Save to user's collection
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
      toast.error("Failed to save template. Please make sure you're logged in.");
    } finally {
      setSavingTemplateId(null);
    }
  };

  const handleLikeTemplate = async (templateId: string) => {
    try {
      setLikingTemplateId(templateId);
      await likeTemplate(templateId);
      
      // Update local state to reflect the like
      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { ...template, likes: (template.likes || 0) + 1 }
          : template
      ));
      
      toast.success("Template liked!");
    } catch (error) {
      console.error("Error liking template:", error);
      toast.error("Failed to like template. Please make sure you're logged in.");
    } finally {
      setLikingTemplateId(null);
    }
  };

  const handleFeatureTemplate = async (templateId: string, shouldFeature: boolean) => {
    try {
      if (shouldFeature) {
        await featureTemplate(templateId);
        toast.success("Template featured!");
      } else {
        await unfeatureTemplate(templateId);
        toast.success("Template unfeatured");
      }
      
      // Update local state
      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { ...template, featured: shouldFeature }
          : template
      ));
    } catch (error) {
      console.error("Error featuring template:", error);
      toast.error("Failed to feature template");
    }
  };

  const handleRemoveTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to remove this template from the community? This action cannot be undone.")) {
      return;
    }
    
    try {
      await removeTemplateFromPublic(templateId);
      
      // Remove from local state
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      toast.success("Template removed from community");
    } catch (error) {
      console.error("Error removing template:", error);
      toast.error("Failed to remove template");
    }
  };

  // Get unique categories from templates
  const categories = [...new Set(templates.map(t => t.category).filter((cat): cat is string => Boolean(cat)))];

  if (loading) {
    return (
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="w-full p-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading community templates...</p>
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
        <div className="w-full p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Community Templates</h1>
              <p className="text-muted-foreground mt-1">
                Discover journal templates created by the community. Click any template to see details, then add it to your collection!
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  <span>Click any template to see all prompts</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bookmark className="h-4 w-4" />
                  <span>Add templates to use in your journal</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
              {userIsAdmin && (
                <CommunityAdminPanel onTemplatesChange={() => {
                  // Reload templates when admin makes changes
                  const loadTemplates = async () => {
                    try {
                      setLoading(true);
                      const publicTemplates = await getPublicTemplates();
                      setTemplates(publicTemplates);
                    } catch (error) {
                      console.error('Error loading templates:', error);
                      toast.error('Failed to load community templates');
                    } finally {
                      setLoading(false);
                    }
                  };
                  loadTemplates();
                }} />
              )}
              
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search templates..." 
                  className="pl-9 w-full sm:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Tabs defaultValue="all" onValueChange={setActiveCategory} className="mb-8">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="featured">Featured</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              {categories.slice(0, 3).map(category => (
                <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    onSave={handleSaveTemplate}
                    onLike={handleLikeTemplate}
                    onFeature={handleFeatureTemplate}
                    onRemove={handleRemoveTemplate}
                    isSaving={savingTemplateId === template.id}
                    isLiking={likingTemplateId === template.id}
                    isAdmin={userIsAdmin}
                    router={router}
                  />
                ))}
              </div>
              
              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {templates.length === 0 
                      ? "No public templates available yet. Be the first to share one!" 
                      : "No templates found matching your search"}
                  </p>
                </div>
              )}
            </TabsContent>
            
            {['featured', 'popular', ...categories].map((category) => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <TemplateCard 
                      key={template.id} 
                      template={template} 
                      onSave={handleSaveTemplate}
                      onLike={handleLikeTemplate}
                      onFeature={handleFeatureTemplate}
                      onRemove={handleRemoveTemplate}
                      isSaving={savingTemplateId === template.id}
                      isLiking={likingTemplateId === template.id}
                      isAdmin={userIsAdmin}
                      router={router}
                    />
                  ))}
                </div>
                
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No templates found in this category</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
    </div>
  );
}

interface TemplateCardProps {
  template: JournalTemplate;
  onSave: (id: string) => void;
  onLike: (id: string) => void;
  onFeature: (id: string, shouldFeature: boolean) => void;
  onRemove: (id: string) => void;
  isSaving: boolean;
  isLiking: boolean;
  isAdmin: boolean;
  router: ReturnType<typeof useRouter>;
}

function TemplateCard({ 
  template, 
  onSave, 
  onLike, 
  onFeature, 
  onRemove, 
  isSaving, 
  isLiking, 
  isAdmin,
  router 
}: TemplateCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
      case 'boolean': return 'Yes/No';
      case 'mantra': return 'Reflection';
      case 'table': return 'Table';
      case 'fillable_table': return 'Fillable Table';
      default: return 'Text';
    }
  };

  return (
    <Card 
      className="overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => router.push(`/community/${template.id}`)}
    >
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {template.category && (
              <Badge variant="outline" className="flex items-center gap-1 font-normal">
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
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onLike(template.id);
              }}
              disabled={isLiking}
              className="h-8 w-8"
            >
              <Heart className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onFeature(template.id, !template.featured);
                  }}
                  title={template.featured ? "Unfeature" : "Feature"}
                  className="h-8 w-8"
                >
                  <Shield className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(template.id);
                  }}
                  title="Remove from community"
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <CardTitle className="mt-2 group-hover:text-primary transition-colors">
          {template.name}
        </CardTitle>
        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="space-y-3">
          {/* Quick field preview */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {template.fields.length} Journal Prompts:
            </p>
            {template.fields.slice(0, 2).map((field, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium break-words">
                    {field.label || field.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getFieldTypeDisplay(field.type)}
                  </p>
                </div>
              </div>
            ))}
            {template.fields.length > 2 && (
              <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:underline">
                    <Eye className="h-3 w-3 mr-1" />
                    View all {template.fields.length} prompts
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <PenTool className="h-5 w-5" />
                      {template.name} Preview
                    </DialogTitle>
                    <DialogDescription>
                      Here&apos;s what you&apos;ll be prompted to write about when you start journaling with this template
                    </DialogDescription>
                  </DialogHeader>
                  
                  <ScrollArea className="max-h-96 pr-4">
                    <div className="space-y-4">
                      {template.fields.map((field, idx) => (
                        <div key={idx} className="p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">
                              {idx + 1}. {field.label || field.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {getFieldTypeDisplay(field.type)}
                            </Badge>
                          </div>
                          
                                                     {field.placeholder && (
                             <p className="text-xs text-muted-foreground italic">
                               &quot;{field.placeholder}&quot;
                             </p>
                           )}
                          
                          {field.type === 'textarea' && (
                            <div className="mt-2 p-2 bg-background border rounded text-xs text-muted-foreground">
                              Large text area for detailed writing
                            </div>
                          )}
                          
                          {field.type === 'boolean' && (
                            <div className="mt-2 flex gap-2">
                              <div className="px-2 py-1 bg-background border rounded text-xs">Yes</div>
                              <div className="px-2 py-1 bg-background border rounded text-xs">No</div>
                            </div>
                          )}
                          
                          {field.type === 'mantra' && (
                            <div className="mt-2 p-2 bg-background border rounded text-xs">
                              <p className="text-muted-foreground">Reflection prompt with checkbox</p>
                              <div className="mt-1 flex items-center gap-1">
                                <div className="w-3 h-3 border rounded-sm"></div>
                                <span className="text-xs">I have reflected on this</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button onClick={() => setPreviewOpen(false)}>
                      Close Preview
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between gap-2 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={""} />
            <AvatarFallback className="text-xs">{getInitials(template.authorName)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{template.authorName || 'Anonymous'}</span>
            <span className="text-xs text-muted-foreground">{template.likes || 0} likes</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onLike(template.id);
            }}
            disabled={isLiking}
            className="h-8"
          >
            <Heart className="h-3 w-3 mr-1" />
            {isLiking ? "..." : "Like"}
          </Button>
          <Button 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onSave(template.id);
            }}
            disabled={isSaving}
            className="h-8 bg-primary hover:bg-primary/90"
          >
            <Bookmark className="h-3 w-3 mr-1" />
            {isSaving ? "..." : "Add"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 