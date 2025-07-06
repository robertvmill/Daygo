"use client";

import { db } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  deleteDoc, 
  updateDoc, 
  getDoc,
  orderBy,
  serverTimestamp 
} from "firebase/firestore";
import { JournalEntry } from "@/types/journal";
import { toast } from "sonner";

// Collection references - ensure we use the same collection name consistently
// The app is using "journalEntries" in some places and "journal" in others
const journalCollection = () => collection(db, "journalEntries");

// Get current user ID
const getCurrentUser = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be authenticated");
  }
  return user;
};

type JournalEntryInput = {
  title: string;
  content: string;
  templateId?: string;
  templateFields?: Record<string, string | undefined>;
};

// Add a new journal entry
export const addJournalEntry = async (journalData: JournalEntryInput) => {
  console.log("Adding journal entry:", journalData);
  
  try {
    // First, check if user can create more journal entries (subscription limit check)
    const { canCreateJournalEntry, trackJournalEntryCreated } = await import('@/services/subscriptionService');
    const limitCheck = await canCreateJournalEntry();
    
    if (!limitCheck.canCreate) {
      throw new Error(limitCheck.message || 'Cannot create journal entry: limit reached');
    }
    
    const user = getCurrentUser();
    console.log("Current user:", user.uid);
    
    // Create journal entry with required user data and remove undefined fields
    const entryData: Record<string, any> = {
      title: journalData.title,
      content: journalData.content,
      userId: user.uid,
      createdAt: serverTimestamp()
    };
    
    // Only add templateId if it's defined
    if (journalData.templateId) {
      entryData.templateId = journalData.templateId;
    }
    
    // Add templateFields if they exist
    if (journalData.templateFields) {
      entryData.templateFields = journalData.templateFields;
    }
    
    console.log("Entry data to save:", entryData);
    
    const docRef = await addDoc(journalCollection(), entryData);
    console.log("Journal entry added with ID:", docRef.id);
    
    // Track the journal entry creation for usage limits
    trackJournalEntryCreated();
    
    // Sync with Pinecone (client-side)
    try {
      // We'll implement this in a server action
      // Note: We need to first get the complete entry with the ID
      const entry = await getJournalEntry(docRef.id);
      
      // Add extra logging for debugging embedding issues
      console.log(`Preparing to embed journal entry ${docRef.id}:`);
      console.log(`- Title: "${entry.title}"`);
      console.log(`- Content length: ${entry.content?.length || 0} characters`);
      console.log(`- Is template-based: ${entry.templateId ? 'Yes' : 'No (Quick Note)'}`);
      console.log(`- Environment: ${process.env.NODE_ENV}, API Keys Present:`, {
        openai: !!process.env.OPENAI_API_KEY,
        pinecone: !!process.env.PINECONE_API_KEY
      });
      
      // Get Firebase auth token for the API request
      const token = await user.getIdToken();
      
      // Create a server action to handle the embedding creation
      // This is done via a fetch to avoid importing server code in client components
      console.log("Creating embedding for journal entry:", docRef.id);
      const embedResponse = await fetch('/api/journal/embedding/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ journalEntry: entry }),
      });
      
      if (!embedResponse.ok) {
        let errorMessage = 'Failed to create embedding for journal entry';
        let isAPIKeyError = false;
        
        try {
          const errorData = await embedResponse.json();
          console.error('Failed to create embedding:', errorData);
          
          if (errorData.error) {
            errorMessage = errorData.error;
            // Check if it's an API key related error
            isAPIKeyError = errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('apiKey');
          }
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          errorMessage = `Failed to create embedding (Status ${embedResponse.status}: ${embedResponse.statusText})`;
        }
        
        console.error(errorMessage);
        
        // Show user-friendly message instead of scary technical errors
        if (isAPIKeyError) {
          console.log("Entry saved successfully, but AI search indexing is not configured (missing OpenAI API key)");
          toast.success("Journal entry saved successfully");
        } else {
          toast.success("Journal entry saved successfully");
          console.warn("Note: AI search indexing failed, but entry was saved. The AI assistant might not be able to find this entry.");
        }
      } else {
        console.log("Successfully created embedding for journal entry:", docRef.id);
        toast.success("Journal entry saved successfully");
      }
    } catch (embedError) {
      // Don't block the UI flow if embedding fails
      console.error('Error creating embedding:', embedError);
      
      // Check if it's an API key error
      const errorMessage = embedError instanceof Error ? embedError.message : 'Unknown error';
      const isAPIKeyError = errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('apiKey');
      
      if (isAPIKeyError) {
        console.log("Entry saved successfully, but AI search indexing is not configured");
        toast.success("Journal entry saved successfully");
      } else {
        console.warn("Entry saved, but AI search indexing failed:", errorMessage);
        toast.success("Journal entry saved successfully");
      }
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error in addJournalEntry:", error);
    throw error;
  }
};

// Get a journal entry by ID
export const getJournalEntry = async (id: string): Promise<JournalEntry> => {
  const user = getCurrentUser();
  
  const docRef = doc(db, "journalEntries", id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error("Journal entry not found");
  }
  
  const data = docSnap.data() as JournalEntry;
  
  // Ensure users can only access their own journal entries
  if (data.userId !== user.uid) {
    throw new Error("Unauthorized access to journal entry");
  }
  
  return {
    ...data,
    id: docSnap.id
  };
};

// Get all journal entries for the current user
export const getJournalEntries = async (): Promise<JournalEntry[]> => {
  const user = getCurrentUser();
  
  const q = query(
    journalCollection(),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  const entries: JournalEntry[] = [];
  
  querySnapshot.forEach((doc) => {
    entries.push({
      ...doc.data(),
      id: doc.id
    } as JournalEntry);
  });
  
  return entries;
};

// Get journal entries filtered by template ID
export const getJournalEntriesByTemplate = async (templateId: string | null): Promise<JournalEntry[]> => {
  const user = getCurrentUser();
  
  let q;
  if (templateId === null) {
    // Get entries without a template
    q = query(
      journalCollection(),
      where("userId", "==", user.uid),
      where("templateId", "==", null),
      orderBy("createdAt", "desc")
    );
  } else {
    // Get entries with specific template
    q = query(
      journalCollection(),
      where("userId", "==", user.uid),
      where("templateId", "==", templateId),
      orderBy("createdAt", "desc")
    );
  }
  
  const querySnapshot = await getDocs(q);
  const entries: JournalEntry[] = [];
  
  querySnapshot.forEach((doc) => {
    entries.push({
      ...doc.data(),
      id: doc.id
    } as JournalEntry);
  });
  
  return entries;
};

// Get template usage statistics
export const getTemplateUsageStats = async (): Promise<Record<string, number>> => {
  const user = getCurrentUser();
  
  const q = query(
    journalCollection(),
    where("userId", "==", user.uid)
  );
  
  const querySnapshot = await getDocs(q);
  const templateUsage: Record<string, number> = {};
  
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const templateId = data.templateId || 'no-template';
    templateUsage[templateId] = (templateUsage[templateId] || 0) + 1;
  });
  
  return templateUsage;
};

// Get all journal entries for a specific user (for server-side operations)
export const getAllJournalEntries = async (userId: string): Promise<JournalEntry[]> => {
  if (!userId) {
    throw new Error("User ID is required");
  }
  
  const q = query(
    journalCollection(),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  const entries: JournalEntry[] = [];
  
  querySnapshot.forEach((doc) => {
    entries.push({
      ...doc.data(),
      id: doc.id
    } as JournalEntry);
  });
  
  return entries;
};

// Update a journal entry
export const updateJournalEntry = async (id: string, updates: Partial<JournalEntryInput>) => {
  const user = getCurrentUser();
  
  // First check that the journal entry belongs to the user
  const entryDoc = await getDoc(doc(db, "journalEntries", id));
  if (!entryDoc.exists()) {
    throw new Error("Journal entry not found");
  }
  
  const entryData = entryDoc.data() as JournalEntry;
  if (entryData.userId !== user.uid) {
    throw new Error("Unauthorized access to journal entry");
  }
  
  // Update the journal entry
  const docRef = doc(db, "journalEntries", id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  
  // Sync with Pinecone after update
  try {
    // Get the updated entry
    const updatedEntry = await getJournalEntry(id);
    
    // Get Firebase auth token for the API request
    const token = await user.getIdToken();
    
    // Update embedding
    const embedResponse = await fetch('/api/journal/embedding/upsert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ journalEntry: updatedEntry }),
    });
    
    if (!embedResponse.ok) {
      console.error('Failed to update embedding for journal entry');
    }
  } catch (embedError) {
    console.error('Error updating embedding:', embedError);
  }
  
  return id;
};

// Delete a journal entry
export const deleteJournalEntry = async (id: string) => {
  const user = getCurrentUser();
  
  // First check that the journal entry belongs to the user
  const entryDoc = await getDoc(doc(db, "journalEntries", id));
  if (!entryDoc.exists()) {
    throw new Error("Journal entry not found");
  }
  
  const entryData = entryDoc.data() as JournalEntry;
  if (entryData.userId !== user.uid) {
    throw new Error("Unauthorized access to journal entry");
  }
  
  // Delete the journal entry
  await deleteDoc(doc(db, "journalEntries", id));
  
  // Track the journal entry deletion for usage limits
  const { trackJournalEntryDeleted } = await import('@/services/subscriptionService');
  trackJournalEntryDeleted();
  
  // Remove from Pinecone
  try {
    // Get Firebase auth token for the API request
    const token = await user.getIdToken();
    
    const embedResponse = await fetch('/api/journal/embedding/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ journalId: id }),
    });
    
    if (!embedResponse.ok) {
      console.error('Failed to delete embedding for journal entry');
    }
  } catch (embedError) {
    console.error('Error deleting embedding:', embedError);
  }
  
  return id;
};

// Helper function to generate content from template fields
export const generateContentFromTemplateFields = (fields: Record<string, string | undefined>) => {
  // Get entries excluding title
  const entries = Object.entries(fields).filter(([key]) => key !== 'title');
  
  // If there's only a single "content" field, return it directly without formatting
  if (entries.length === 1 && entries[0][0] === 'content') {
    return entries[0][1] || '';
  }
  
  // Otherwise format normally for templates with multiple fields
  return entries
    .map(([key, value]) => {
      // Handle boolean values stored as strings
      if (value === 'true') return `${key}: Yes`;
      if (value === 'false') return `${key}: No`;
      return `${key}: ${value || ''}`;
    })
    .join('\n\n');
}; 