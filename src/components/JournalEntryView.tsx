"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { JournalEntry, TemplateField } from "@/types/journal";
import { getJournalEntry, deleteJournalEntry } from "@/services/journalService";
import { getTemplate } from "@/services/templateService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function JournalEntryView() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [template, setTemplate] = useState<{ fields: TemplateField[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEntry = async () => {
      const id = params?.id;
      if (!id || typeof id !== "string") {
        toast.error("Invalid journal entry ID");
        router.push("/journal");
        return;
      }

      try {
        setLoading(true);
        const data = await getJournalEntry(id);
        setEntry(data);
        
        // If the entry has a template, load it
        if (data.templateId) {
          try {
            const templateData = await getTemplate(data.templateId);
            setTemplate(templateData);
          } catch (err) {
            console.error("Error loading template:", err);
            // Don't fail the whole page if template loading fails
          }
        }
      } catch (error) {
        console.error("Error fetching journal entry:", error);
        toast.error("Failed to load journal entry");
        router.push("/journal");
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [params, router]);

  useEffect(() => {
    if (entry && template) {
      // Prepare editData from entry fields
      const initial: Record<string, any> = {};
      template.fields.forEach(field => {
        if (field.type === 'fillable_table') {
          // Parse JSON string to 2D array
          try {
            initial[field.name] = {
              ...field.tableData,
              cells: entry.templateFields?.[field.name]
                ? JSON.parse(entry.templateFields[field.name] as string)
                : (field.tableData?.cells || [])
            };
          } catch {
            initial[field.name] = { ...field.tableData, cells: [] };
          }
        } else {
          initial[field.name] = entry.templateFields?.[field.name] || '';
        }
      });
      setEditData(initial);
    }
  }, [entry, template]);

  const handleDelete = async () => {
    if (!entry) return;
    
    try {
      setIsDeleting(true);
      await deleteJournalEntry(entry.id);
      toast.success("Journal entry deleted successfully");
      router.push("/journal");
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      toast.error("Failed to delete journal entry");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp: Timestamp | Date | undefined | null) => {
    if (!timestamp) return "";
    
    let date: Date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      // Fallback for other cases
      return "";
    }
    
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };
  
  const handleEditField = (name: string, value: any) => {
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleTableCellChange = (fieldName: string, rowIdx: number, colIdx: number, value: string) => {
    setEditData(prev => {
      const table = { ...prev[fieldName] };
      const cells = table.cells.map((row: string[], r: number) =>
        r === rowIdx ? row.map((cell: string, c: number) => c === colIdx ? value : cell) : row
      );
      return { ...prev, [fieldName]: { ...table, cells } };
    });
  };

  const handleAddTableRow = (fieldName: string) => {
    setEditData(prev => {
      const table = { ...prev[fieldName] };
      const newRow = Array(table.columns).fill('');
      return {
        ...prev,
        [fieldName]: {
          ...table,
          cells: [...table.cells, newRow],
          rows: table.rows + 1
        }
      };
    });
  };

  const handleSave = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      // Prepare templateFields for update
      const templateFields: Record<string, string | undefined> = {};
      template?.fields.forEach(field => {
        if (field.type === 'fillable_table') {
          templateFields[field.name] = JSON.stringify(editData[field.name].cells);
        } else if (typeof editData[field.name] === 'boolean') {
          templateFields[field.name] = editData[field.name] ? 'true' : 'false';
        } else {
          templateFields[field.name] = editData[field.name];
        }
      });
      await updateJournalEntry(entry.id, { templateFields });
      toast.success('Journal entry updated');
      setEditMode(false);
      // Optionally, reload entry
      router.refresh();
    } catch (err) {
      toast.error('Failed to update journal entry');
    } finally {
      setSaving(false);
    }
  };

  // Render a template field based on its type
  const renderField = (field: TemplateField) => {
    if (editMode) {
      // Editable mode
      switch (field.type) {
        case 'text':
          return (
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-1">{field.label}</h3>
              <Input
                value={editData[field.name] || ''}
                onChange={e => handleEditField(field.name, e.target.value)}
              />
            </div>
          );
        case 'textarea':
          return (
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-1">{field.label}</h3>
              <Textarea
                value={editData[field.name] || ''}
                onChange={e => handleEditField(field.name, e.target.value)}
              />
            </div>
          );
        case 'boolean':
          return (
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-1">{field.label}</h3>
              <input
                type="checkbox"
                checked={editData[field.name] === 'true' || editData[field.name] === true}
                onChange={e => handleEditField(field.name, e.target.checked)}
              />
            </div>
          );
        case 'fillable_table': {
          const table = editData[field.name];
          if (!table) return null;
          return (
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-1">{field.label}</h3>
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors">
                      {table.headers.map((header: string, idx: number) => (
                        <th key={idx} className="h-10 px-2 text-left align-middle font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {table.cells.map((row: string[], rowIdx: number) => (
                      <tr key={rowIdx} className="border-b transition-colors hover:bg-muted/50">
                        {row.map((cell: string, colIdx: number) => (
                          <td key={colIdx} className="p-2 align-middle">
                            <Input
                              value={cell}
                              onChange={e => handleTableCellChange(field.name, rowIdx, colIdx, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end p-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => handleAddTableRow(field.name)}>
                    + Add Row
                  </Button>
                </div>
              </div>
            </div>
          );
        }
        default:
          return null;
      }
    }
    if (!entry?.templateFields) return null;
    const value = entry.templateFields[field.name];
    
    switch (field.type) {
      case 'text':
      case 'textarea':
        return value ? (
          <div className="mb-4">
            <h3 className="text-base font-semibold mb-1">{field.label}</h3>
            <div className="whitespace-pre-wrap">{value}</div>
          </div>
        ) : null;
      
      case 'boolean':
        return (
          <div className="mb-4">
            <h3 className="text-base font-semibold mb-1">{field.label}</h3>
            <div>{value === 'true' ? '✓ Yes' : '✗ No'}</div>
          </div>
        );
      
      case 'mantra':
        return (
          <div className="mb-4">
            <h3 className="text-base font-semibold mb-1">{field.label}</h3>
            <div className="p-4 border rounded-md bg-card shadow-sm">
              <p className="font-medium whitespace-pre-wrap">{field.placeholder || ""}</p>
            </div>
            <div className="mt-1">
              {value === 'true' ? '✓ Reflected on this mantra' : '✗ Not reflected on'}
            </div>
          </div>
        );
        
      case 'table':
        return field.tableData?.headers && field.tableData?.cells ? (
          <div className="mb-4">
            <h3 className="text-base font-semibold mb-1">{field.label}</h3>
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors">
                    {field.tableData.headers.map((header, index) => (
                      <th key={`${field.name}-header-${index}`} className="h-10 px-2 text-left align-middle font-medium">
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
          </div>
        ) : null;
      
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
                <BreadcrumbPage>Entry</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-8">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse">Loading journal entry...</div>
            </div>
          ) : entry ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{entry.title}</CardTitle>
                <CardDescription>
                  {formatDate(entry.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {template && template.fields && template.fields.length > 0 && (
                  <div className="mb-6">
                    {template.fields.map((field, index) => (
                      <div key={`field-${index}`}>{renderField(field)}</div>
                    ))}
                    <div className="my-4 border-t border-border"></div>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{entry.content}</div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="flex gap-2">
                  {!editMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                  {editMode && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditMode(false); setEditData({}); }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete
                          your journal entry.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <Button variant="outline" onClick={() => router.push("/journal")}>
                  Back
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="text-center py-10">
              <p>Journal entry not found.</p>
              <Button className="mt-4" onClick={() => router.push("/journal")}>
                Back to Journal
              </Button>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
} 