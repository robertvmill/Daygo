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
import { 
  encryptSensitiveData, 
  decryptSensitiveData, 
  encryptObjectFields, 
  decryptObjectFields,
  isEncryptionSupported 
} from "@/lib/encryption";

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
    let entryData: Record<string, any> = {
      title: journalData.title,
      content: journalData.content,
      userId: user.uid,
      createdAt: serverTimestamp()
    };
    
    // Only add templateId if it's defined
    if (journalData.templateId) {
      entryData.templateId = journalData.templateId;
    }
    
    // Add templateFields if they exist (and encrypt them too)
    if (journalData.templateFields) {
      entryData.templateFields = journalData.templateFields;
    }
    
    // Encrypt sensitive fields before saving to Firebase
    // This ensures that even if someone gains access to your Firebase, they can't read the journal content
    if (isEncryptionSupported()) {
      console.log("Encrypting sensitive fields before saving to Firebase...");
      
      // Encrypt the most sensitive fields: title and content
      entryData = await encryptObjectFields(entryData, ['title', 'content'], user.uid);
      
      // Also encrypt template fields if they contain personal information
      if (entryData.templateFields) {
        const encryptedTemplateFields: Record<string, any> = {};
        for (const [key, value] of Object.entries(entryData.templateFields)) {
          if (value && typeof value === 'string') {
            encryptedTemplateFields[key] = await encryptSensitiveData(value, user.uid);
            encryptedTemplateFields[`${key}_encrypted`] = true;
          } else {
            encryptedTemplateFields[key] = value;
          }
        }
        entryData.templateFields = encryptedTemplateFields;
      }
      
      console.log("Sensitive fields encrypted successfully");
    } else {
      console.warn("Encryption not supported in this browser - data will be stored unencrypted");
    }
    
    console.log("Entry data to save (sensitive fields now encrypted):", entryData);
    
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
  
  let data = docSnap.data() as JournalEntry;
  
  // Ensure users can only access their own journal entries
  if (data.userId !== user.uid) {
    throw new Error("Unauthorized access to journal entry");
  }
  
  // Decrypt sensitive fields after reading from Firebase
  // This converts the encrypted data back to readable text
  if (isEncryptionSupported()) {
    try {
      console.log("Decrypting sensitive fields from Firebase...");
      
      // Decrypt the main fields (title and content)
      data = await decryptObjectFields(data, ['title', 'content'], user.uid);
      
      // Decrypt template fields if they were encrypted
      if (data.templateFields) {
        const decryptedTemplateFields: Record<string, any> = {};
        for (const [key, value] of Object.entries(data.templateFields)) {
          // Check if this field was encrypted
          if (data.templateFields[`${key}_encrypted`] === true && typeof value === 'string') {
            try {
              decryptedTemplateFields[key] = await decryptSensitiveData(value, user.uid);
            } catch (decryptError) {
              console.error(`Failed to decrypt template field ${key}:`, decryptError);
              // Keep the encrypted value rather than losing data
              decryptedTemplateFields[key] = value;
            }
          } else if (!key.endsWith('_encrypted')) {
            // Keep non-encrypted fields as they are
            decryptedTemplateFields[key] = value;
          }
          // Skip the '_encrypted' marker fields
        }
        data.templateFields = decryptedTemplateFields;
      }
      
      console.log("Sensitive fields decrypted successfully");
    } catch (decryptError) {
      console.error("Failed to decrypt journal entry:", decryptError);
      // In case of decryption failure, return the data as-is rather than failing completely
      // This ensures the app doesn't break if there are encryption issues
    }
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
  
  // Process each document and decrypt sensitive fields
  for (const docSnap of querySnapshot.docs) {
    let data = docSnap.data() as JournalEntry;
    
    // Decrypt sensitive fields for each entry
    if (isEncryptionSupported()) {
      try {
        // Decrypt the main fields (title and content)
        data = await decryptObjectFields(data, ['title', 'content'], user.uid);
        
        // Decrypt template fields if they were encrypted
        if (data.templateFields) {
          const decryptedTemplateFields: Record<string, any> = {};
          for (const [key, value] of Object.entries(data.templateFields)) {
            // Check if this field was encrypted
            if (data.templateFields[`${key}_encrypted`] === true && typeof value === 'string') {
              try {
                decryptedTemplateFields[key] = await decryptSensitiveData(value, user.uid);
              } catch (decryptError) {
                console.error(`Failed to decrypt template field ${key} for entry ${docSnap.id}:`, decryptError);
                // Keep the encrypted value rather than losing data
                decryptedTemplateFields[key] = value;
              }
            } else if (!key.endsWith('_encrypted')) {
              // Keep non-encrypted fields as they are
              decryptedTemplateFields[key] = value;
            }
            // Skip the '_encrypted' marker fields
          }
          data.templateFields = decryptedTemplateFields;
        }
      } catch (decryptError) {
        console.error(`Failed to decrypt journal entry ${docSnap.id}:`, decryptError);
        // In case of decryption failure, keep the data as-is rather than failing completely
      }
    }
    
    entries.push({
      ...data,
      id: docSnap.id
    } as JournalEntry);
  }
  
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
  
  // Process each document and decrypt sensitive fields
  for (const docSnap of querySnapshot.docs) {
    let data = docSnap.data() as JournalEntry;
    
    // Decrypt sensitive fields for each entry
    if (isEncryptionSupported()) {
      try {
        // Decrypt the main fields (title and content)
        data = await decryptObjectFields(data, ['title', 'content'], user.uid);
        
        // Decrypt template fields if they were encrypted
        if (data.templateFields) {
          const decryptedTemplateFields: Record<string, any> = {};
          for (const [key, value] of Object.entries(data.templateFields)) {
            // Check if this field was encrypted
            if (data.templateFields[`${key}_encrypted`] === true && typeof value === 'string') {
              try {
                decryptedTemplateFields[key] = await decryptSensitiveData(value, user.uid);
              } catch (decryptError) {
                console.error(`Failed to decrypt template field ${key} for entry ${docSnap.id}:`, decryptError);
                // Keep the encrypted value rather than losing data
                decryptedTemplateFields[key] = value;
              }
            } else if (!key.endsWith('_encrypted')) {
              // Keep non-encrypted fields as they are
              decryptedTemplateFields[key] = value;
            }
            // Skip the '_encrypted' marker fields
          }
          data.templateFields = decryptedTemplateFields;
        }
      } catch (decryptError) {
        console.error(`Failed to decrypt journal entry ${docSnap.id}:`, decryptError);
        // In case of decryption failure, keep the data as-is rather than failing completely
      }
    }
    
    entries.push({
      ...data,
      id: docSnap.id
    } as JournalEntry);
  }
  
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
  
  // Encrypt any updated sensitive fields before saving
  let encryptedUpdates: Record<string, any> = { ...updates };
  
  if (isEncryptionSupported()) {
    console.log("Encrypting updated sensitive fields before saving to Firebase...");
    
    // Encrypt title and content if they're being updated
    const fieldsToEncrypt = ['title', 'content'].filter(field => updates[field as keyof JournalEntryInput] !== undefined);
    if (fieldsToEncrypt.length > 0) {
      encryptedUpdates = await encryptObjectFields(encryptedUpdates, fieldsToEncrypt, user.uid);
    }
    
    // Encrypt template fields if they're being updated
    if (updates.templateFields) {
      const encryptedTemplateFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates.templateFields)) {
        if (value && typeof value === 'string') {
          encryptedTemplateFields[key] = await encryptSensitiveData(value, user.uid);
          encryptedTemplateFields[`${key}_encrypted`] = true;
        } else {
          encryptedTemplateFields[key] = value;
        }
      }
      encryptedUpdates.templateFields = encryptedTemplateFields;
    }
    
    console.log("Updated sensitive fields encrypted successfully");
  } else {
    console.warn("Encryption not supported in this browser - updates will be stored unencrypted");
  }
  
  // Update the journal entry
  const docRef = doc(db, "journalEntries", id);
  await updateDoc(docRef, {
    ...encryptedUpdates,
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