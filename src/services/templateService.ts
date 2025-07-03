'use client';

import { collection, addDoc, doc, updateDoc, serverTimestamp, query, orderBy, getDocs, where, deleteDoc, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { JournalTemplate } from "@/types/journal";

const COLLECTION_NAME = 'templates';

// Collection reference
const templatesRef = collection(db, COLLECTION_NAME);

// Add a new journal template
export async function addTemplate(template: Omit<JournalTemplate, "id" | "createdAt" | "userId"> & { isDefault?: boolean }) {
  try {
    if (!auth.currentUser) {
      throw new Error("User must be logged in to add templates");
    }

    // Check if user can create more templates (subscription limit check)
    const { canCreateTemplate, trackTemplateCreated } = await import('@/services/subscriptionService');
    const limitCheck = await canCreateTemplate();
    
    if (!limitCheck.canCreate) {
      throw new Error(limitCheck.message || 'Cannot create template: limit reached');
    }

    const userId = auth.currentUser.uid;
    
    // Log the template data before saving
    console.log("Template data to save:", template);
    console.log("Fields to save:", template.fields);
    
    // If this is the first template or marked as default, clear any existing defaults
    if (template.isDefault) {
      await clearDefaultTemplates();
    }
    
    // Ensure each field has a valid type and handle nested arrays
    const validatedFields = Array.isArray(template.fields) ? template.fields.map(field => {
      // Handle table fields - convert nested arrays to a compatible format
      if (field.type === 'table' && field.tableData) {
        return {
          ...field,
          name: field.name || '',
          type: field.type || 'text',
          label: field.label || '',
          placeholder: field.placeholder || '',
          required: field.required || false,
          tableData: {
            rows: field.tableData.rows || 3,
            columns: field.tableData.columns || 3,
            headers: field.tableData.headers || [],
            // Convert cells array to JSON string to avoid nested arrays
            cellsJson: JSON.stringify(field.tableData.cells || [])
          }
        };
      }
      // Handle regular fields
      return {
        ...field,
        name: field.name || '',
        type: field.type || 'text',
        label: field.label || '',
        placeholder: field.placeholder || '',
        required: field.required || false
      };
    }) : [];
    
    console.log("Validated fields to save:", validatedFields);
    
    const docRef = await addDoc(templatesRef, {
      ...template,
      fields: validatedFields,
      userId,
      createdAt: serverTimestamp()
    });
    
    // Track the template creation for usage limits
    trackTemplateCreated();
    
    return {
      id: docRef.id,
      ...template,
      fields: validatedFields,
      userId
    };
  } catch (error) {
    console.error("Error adding template:", error);
    throw error;
  }
}

// Save a community template to user's personal templates
export async function saveCommunityTemplate(template: {
  id: string | number;
  name: string;
  description: string;
  fields: Array<{
    name: string;
    type?: string;
    [key: string]: any;
  }>;
}) {
  try {
    if (!auth.currentUser) {
      throw new Error("User must be logged in to save templates");
    }

    // Extract the necessary fields from the community template
    const templateToSave = {
      name: template.name,
      description: template.description,
      fields: template.fields.map((field: {
        name: string;
        type?: string;
        [key: string]: any;
      }) => {
        // Ensure type is compatible with TemplateField
        let fieldType: 'text' | 'textarea' | 'boolean' | 'mantra' | 'table' = 'text';
        
        // Map external types to our internal types
        if (field.type) {
          if (['text', 'textarea', 'boolean', 'mantra', 'table'].includes(field.type)) {
            fieldType = field.type as 'text' | 'textarea' | 'boolean' | 'mantra' | 'table';
          } else if (field.type === 'longText') {
            fieldType = 'textarea';
          } else if (field.type === 'checkbox') {
            fieldType = 'boolean';
          }
        }
        
        return {
          name: field.name,
          type: fieldType,
          label: field.name, // Use the name as the label
          placeholder: '',
          required: false
        };
      }),
      source: 'community',
      sourceId: template.id
    };
    
    // Save the template using the existing addTemplate function
    return await addTemplate(templateToSave);
  } catch (error) {
    console.error("Error saving community template:", error);
    throw error;
  }
}

// Update a journal template
export async function updateTemplate(id: string, template: Partial<JournalTemplate> & { isDefault?: boolean }) {
  try {
    if (!auth.currentUser) {
      throw new Error("User must be logged in to update templates");
    }

    console.log("Updating template:", id, template);

    // If this template is being set as default, clear other defaults
    if (template.isDefault) {
      await clearDefaultTemplates();
    }
    
    // Ensure fields are properly formatted if present
    const updatedTemplate = {...template};
    if (template.fields) {
      const validatedFields = Array.isArray(template.fields) ? template.fields.map(field => {
        // Handle table fields - convert nested arrays to compatible format
        if (field.type === 'table' && field.tableData) {
          return {
            ...field,
            name: field.name || '',
            type: field.type || 'text',
            label: field.label || '',
            placeholder: field.placeholder || '',
            required: field.required || false,
            tableData: {
              rows: field.tableData.rows || 3,
              columns: field.tableData.columns || 3,
              headers: field.tableData.headers || [],
              // Convert cells array to JSON string to avoid nested arrays
              cellsJson: JSON.stringify(field.tableData.cells || [])
            }
          };
        }
        // Handle regular fields
        return {
          ...field,
          name: field.name || '',
          type: field.type || 'text',
          label: field.label || '',
          placeholder: field.placeholder || '',
          required: field.required || false
        };
      }) : [];
      
      console.log("Validated fields for update:", validatedFields);
      updatedTemplate.fields = validatedFields;
    }
    
    const templateRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(templateRef, {
      ...updatedTemplate,
      updatedAt: serverTimestamp()
    });
    
    return {
      id,
      ...updatedTemplate
    };
  } catch (error) {
    console.error("Error updating template:", error);
    throw error;
  }
}

// Delete a journal template
export async function deleteTemplate(id: string) {
  try {
    if (!auth.currentUser) {
      throw new Error("User must be logged in to delete templates");
    }
    
    const templateRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(templateRef);
    
    // Track the template deletion for usage limits
    const { trackTemplateDeleted } = await import('@/services/subscriptionService');
    trackTemplateDeleted();
    
    return { id };
  } catch (error) {
    console.error("Error deleting template:", error);
    throw error;
  }
}

// Get a single template by ID
export async function getTemplate(id: string) {
  try {
    if (!auth.currentUser) {
      throw new Error("User must be logged in to get templates");
    }
    
    console.log("Fetching template with ID:", id);
    
    const templateSnap = await getDocs(query(collection(db, COLLECTION_NAME), where('__name__', '==', id), where('userId', '==', auth.currentUser.uid)));
    
    if (templateSnap.empty) {
      console.error("Template not found or no permission");
      throw new Error("Template not found or you do not have permission to access it");
    }
    
    const data = templateSnap.docs[0].data();
    console.log("Raw template data from Firebase:", data);
    console.log("Template fields from Firebase:", data.fields);
    
    // Ensure fields are correctly formatted
    const parsedFields = Array.isArray(data.fields) ? data.fields.map(field => {
      // Debug logging for table fields
      if (field.type === 'table') {
        console.log("Found table field:", field.name);
        console.log("Table data:", field.tableData);
        
        // Convert cellsJson back to cells array if present
        if (field.tableData && field.tableData.cellsJson) {
          try {
            const cells = JSON.parse(field.tableData.cellsJson);
            return {
              ...field,
              name: field.name || '',
              type: field.type || 'text',
              label: field.label || '',
              placeholder: field.placeholder || '',
              required: field.required || false,
              tableData: {
                rows: field.tableData.rows || 3,
                columns: field.tableData.columns || 3,
                headers: field.tableData.headers || [],
                cells: cells
              }
            };
          } catch (e) {
            console.error("Error parsing cellsJson:", e);
          }
        }
      }
      
      return {
        ...field,
        name: field.name || '',
        type: field.type || 'text',
        label: field.label || '',
        placeholder: field.placeholder || '',
        required: field.required || false,
        // Ensure tableData is properly preserved if it exists
        ...(field.type === 'table' && field.tableData ? {
          tableData: {
            rows: field.tableData.rows || 3,
            columns: field.tableData.columns || 3,
            headers: field.tableData.headers || [],
            cells: field.tableData.cells || []
          }
        } : {})
      };
    }) : [];
    console.log("Parsed fields:", parsedFields);
    
    return {
      id: templateSnap.docs[0].id,
      name: data.name,
      description: data.description,
      fields: parsedFields,
      userId: data.userId,
      createdAt: data.createdAt,
    } as JournalTemplate;
  } catch (error) {
    console.error("Error getting template:", error);
    throw error;
  }
}

// Get all templates for the current user
export async function getTemplates(): Promise<JournalTemplate[]> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to access templates');
    }

    const q = query(templatesRef, where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    const templates: JournalTemplate[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        fields: data.fields || [],
        userId: data.userId,
        createdAt: data.createdAt,
      });
    });
    
    return templates;
  } catch (error) {
    console.error('Error getting templates:', error);
    throw error;
  }
}

// Get the default template
export async function getDefaultTemplate() {
  try {
    if (!auth.currentUser) {
      throw new Error("User must be logged in to get templates");
    }

    const userId = auth.currentUser.uid;
    
    // Query for the default template
    const q = query(
      templatesRef, 
      where("userId", "==", userId),
      where("isDefault", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Return the most recently created template if no default exists
      const recentQ = query(
        templatesRef, 
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      
      const recentSnapshot = await getDocs(recentQ);
      
      if (recentSnapshot.empty) {
        return null;
      }
      
      return {
        id: recentSnapshot.docs[0].id,
        ...recentSnapshot.docs[0].data()
      } as JournalTemplate;
    }
    
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as JournalTemplate;
  } catch (error) {
    console.error("Error getting default template:", error);
    throw error;
  }
}

// Clear all default templates
async function clearDefaultTemplates() {
  if (!auth.currentUser) {
    return;
  }

  const userId = auth.currentUser.uid;
  
  const q = query(
    templatesRef, 
    where("userId", "==", userId),
    where("isDefault", "==", true)
  );
  
  const querySnapshot = await getDocs(q);
  
  const updatePromises = querySnapshot.docs.map(doc => 
    updateDoc(doc.ref, { isDefault: false })
  );
  
  await Promise.all(updatePromises);
} 