import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initAdmin } from "@/lib/firebase-admin";
import { decryptObjectFields } from "@/lib/encryption-server";

// Initialize Firebase Admin
initAdmin();

export async function POST(req: Request) {
  try {
    const { query, limit = 10 } = await req.json();
    
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    
    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    
    // Verify the token
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    // Search journal entries
    const db = getFirestore();
    const entriesRef = db.collection("journalEntries");
    
    // Get all entries for the user
    const snapshot = await entriesRef
      .where("userId", "==", userId)
      .get();
    
    // Decrypt entries before searching
    const decryptedEntries = [];
    for (const doc of snapshot.docs) {
      let entryData = {
        id: doc.id,
        ...doc.data()
      };
      
      // Decrypt sensitive fields (title and content) if they were encrypted
      try {
        entryData = await decryptObjectFields(entryData, ['title', 'content'], userId);
        
        // Also decrypt template fields if they exist
        if (entryData.templateFields) {
          const decryptedTemplateFields: Record<string, any> = {};
          for (const [key, value] of Object.entries(entryData.templateFields)) {
            // Check if this field was encrypted
            if (entryData.templateFields[`${key}_encrypted`] === true && typeof value === 'string') {
              try {
                const { decryptSensitiveData } = await import('@/lib/encryption-server');
                decryptedTemplateFields[key] = await decryptSensitiveData(value, userId);
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
          entryData.templateFields = decryptedTemplateFields;
        }
      } catch (decryptError) {
        console.error(`Failed to decrypt journal entry ${doc.id}:`, decryptError);
        // In case of decryption failure, keep the data as-is rather than failing completely
      }
      
      decryptedEntries.push(entryData);
    }
    
    const allEntries = decryptedEntries.sort((a, b) => {
      // Sort by creation date (newest first)
      const aDate = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
      const bDate = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
    
    // Perform text-based search on decrypted content
    const searchTerm = query.toLowerCase().trim();
    console.log(`Searching for: "${searchTerm}"`);
    console.log(`Total entries found: ${allEntries.length}`);
    
    // Debug: Log some entry data (now decrypted)
    allEntries.slice(0, 2).forEach((entry, index) => {
      console.log(`Entry ${index}:`, {
        id: entry.id,
        title: entry.title,
        contentPreview: (entry.content || "").substring(0, 100)
      });
    });
    
    const searchResults = allEntries
      .filter(entry => {
        const title = (entry.title || "").toLowerCase();
        const content = (entry.content || "").toLowerCase();
        
        const titleMatch = title.includes(searchTerm);
        const contentMatch = content.includes(searchTerm);
        
        // Debug logging
        if (titleMatch || contentMatch) {
          console.log(`Match found in entry "${entry.title}": title=${titleMatch}, content=${contentMatch}`);
        }
        
        // Search in title and content
        return titleMatch || contentMatch;
      })
      .map(entry => ({
        id: entry.id,
        title: entry.title || "Untitled",
        content: entry.content || "",
        createdAt: entry.createdAt?.toDate?.()?.toISOString() || entry.createdAt || null,
        relevanceScore: calculateRelevanceScore(entry, searchTerm),
        metadata: {
          templateId: entry.templateId || null
        }
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore) // Sort by relevance
      .slice(0, limit); // Apply limit after sorting
    
    console.log(`Search results: ${searchResults.length} matches found`);
    
    return NextResponse.json({ entries: searchResults });
    
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search journal entries" },
      { status: 500 }
    );
  }
}

// Calculate a simple relevance score
function calculateRelevanceScore(entry: any, searchTerm: string): number {
  const title = (entry.title || "").toLowerCase();
  const content = (entry.content || "").toLowerCase();
  const term = searchTerm.toLowerCase();
  
  let score = 0;
  
  // Title matches get higher score
  if (title.includes(term)) {
    score += 0.8;
    // Exact title match gets even higher score
    if (title === term) {
      score += 0.5;
    }
    // Title starts with term gets bonus
    if (title.startsWith(term)) {
      score += 0.3;
    }
  }
  
  // Content matches
  if (content.includes(term)) {
    score += 0.4;
    // Multiple occurrences in content
    const matches = (content.match(new RegExp(term, 'g')) || []).length;
    score += Math.min(matches * 0.1, 0.3); // Cap bonus at 0.3
  }
  
  // Ensure score is between 0 and 1
  return Math.min(score, 1.0);
} 