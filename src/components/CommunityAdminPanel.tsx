'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Star, Eye, Trash2, Award, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { 
  getPublicTemplates, 
  featureTemplate, 
  unfeatureTemplate, 
  removeTemplateFromPublic 
} from "@/services/templateService";
import { JournalTemplate } from "@/types/journal";

interface CommunityAdminPanelProps {
  onTemplatesChange: () => void;
}

export function CommunityAdminPanel({ onTemplatesChange }: CommunityAdminPanelProps) {
  const [templates, setTemplates] = useState<JournalTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const publicTemplates = await getPublicTemplates();
      setTemplates(publicTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = async (templateId: string, shouldFeature: boolean) => {
    try {
      setActionLoading(templateId);
      
      if (shouldFeature) {
        await featureTemplate(templateId);
        toast.success("Template featured!");
      } else {
        await unfeatureTemplate(templateId);
        toast.success("Template unfeatured");
      }
      
      // Reload templates and notify parent
      await loadTemplates();
      onTemplatesChange();
    } catch (error) {
      console.error("Error toggling feature:", error);
      toast.error("Failed to update template");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to remove "${templateName}" from the community? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setActionLoading(templateId);
      await removeTemplateFromPublic(templateId);
      
      // Reload templates and notify parent
      await loadTemplates();
      onTemplatesChange();
      toast.success("Template removed from community");
    } catch (error) {
      console.error("Error removing template:", error);
      toast.error("Failed to remove template");
    } finally {
      setActionLoading(null);
    }
  };

  const getStats = () => {
    const totalTemplates = templates.length;
    const featuredTemplates = templates.filter(t => t.featured).length;
    const totalLikes = templates.reduce((sum, t) => sum + (t.likes || 0), 0);
    const categories = [...new Set(templates.map(t => t.category).filter(Boolean))].length;
    
    return { totalTemplates, featuredTemplates, totalLikes, categories };
  };

  const stats = getStats();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Admin Panel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Community Templates Admin Panel
          </DialogTitle>
          <DialogDescription>
            Manage community templates, feature content, and moderate submissions.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalTemplates}</p>
                  <p className="text-xs text-muted-foreground">Total Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.featuredTemplates}</p>
                  <p className="text-xs text-muted-foreground">Featured</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalLikes}</p>
                  <p className="text-xs text-muted-foreground">Total Likes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.categories}</p>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Public Templates</CardTitle>
            <CardDescription>
              Manage featuring and moderation for community templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading templates...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {template.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{template.authorName || 'Anonymous'}</p>
                          <p className="text-xs text-muted-foreground">{template.authorEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.category && (
                          <Badge variant="outline">{template.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{template.likes || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {template.featured && (
                            <Badge variant="secondary" className="text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Public
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant={template.featured ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleFeatureToggle(template.id, !template.featured)}
                            disabled={actionLoading === template.id}
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveTemplate(template.id, template.name)}
                            disabled={actionLoading === template.id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {!loading && templates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No public templates found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
} 