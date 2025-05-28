'use client';

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
import { db, auth } from "@/lib/firebase";
import { DayScore, DaySegment } from "@/types/journal";

const COLLECTION_NAME = 'dayScores';

// Collection reference
const dayScoresRef = collection(db, COLLECTION_NAME);

// Helper function to get current user
const getCurrentUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in");
  }
  return user;
};

// Helper function to format date as YYYY-MM-DD
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper function to generate a unique segment ID
const generateSegmentId = (): string => {
  return `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create a new day score entry
export const createDayScore = async (dayScoreData: Omit<DayScore, "id" | "createdAt" | "userId">): Promise<DayScore> => {
  try {
    const user = getCurrentUser();
    
    // Ensure all segments have IDs
    const segmentsWithIds = dayScoreData.segments.map(segment => ({
      ...segment,
      id: segment.id || generateSegmentId()
    }));
    
    const docData = {
      ...dayScoreData,
      segments: segmentsWithIds,
      userId: user.uid,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(dayScoresRef, docData);
    
    return {
      id: docRef.id,
      ...dayScoreData,
      segments: segmentsWithIds,
      userId: user.uid,
      createdAt: new Date() as any // Will be replaced by actual server timestamp
    };
  } catch (error) {
    console.error("Error creating day score:", error);
    throw error;
  }
};

// Get day score for a specific date
export const getDayScore = async (date: string): Promise<DayScore | null> => {
  try {
    const user = getCurrentUser();
    
    const q = query(
      dayScoresRef,
      where("userId", "==", user.uid),
      where("date", "==", date)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    // Return the first (should be only) result
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as DayScore;
  } catch (error) {
    console.error("Error getting day score:", error);
    throw error;
  }
};

// Get all day scores for the current user
export const getAllDayScores = async (): Promise<DayScore[]> => {
  try {
    const user = getCurrentUser();
    
    const q = query(
      dayScoresRef,
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const dayScores: DayScore[] = [];
    
    querySnapshot.forEach((doc) => {
      dayScores.push({
        id: doc.id,
        ...doc.data()
      } as DayScore);
    });
    
    return dayScores;
  } catch (error) {
    console.error("Error getting all day scores:", error);
    throw error;
  }
};

// Update an existing day score
export const updateDayScore = async (id: string, updates: Partial<DayScore>): Promise<void> => {
  try {
    const user = getCurrentUser();
    
    // If updating segments, ensure they all have IDs
    if (updates.segments) {
      updates.segments = updates.segments.map(segment => ({
        ...segment,
        id: segment.id || generateSegmentId()
      }));
    }
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating day score:", error);
    throw error;
  }
};

// Update a specific segment within a day score
export const updateSegment = async (dayScoreId: string, segmentId: string, segmentUpdates: Partial<DaySegment>): Promise<void> => {
  try {
    const dayScore = await getDayScoreById(dayScoreId);
    if (!dayScore) {
      throw new Error("Day score not found");
    }
    
    const updatedSegments = dayScore.segments.map(segment => 
      segment.id === segmentId ? { ...segment, ...segmentUpdates } : segment
    );
    
    // Recalculate overall score if segment scores changed
    let overallScore = dayScore.overallScore;
    if (segmentUpdates.score !== undefined) {
      const scoredSegments = updatedSegments.filter(s => s.score !== undefined);
      if (scoredSegments.length > 0) {
        overallScore = scoredSegments.reduce((sum, s) => sum + (s.score || 0), 0) / scoredSegments.length;
      }
    }
    
    await updateDayScore(dayScoreId, { 
      segments: updatedSegments,
      overallScore
    });
  } catch (error) {
    console.error("Error updating segment:", error);
    throw error;
  }
};

// Get day score by ID
export const getDayScoreById = async (id: string): Promise<DayScore | null> => {
  try {
    const user = getCurrentUser();
    
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data() as DayScore;
    
    // Ensure user can only access their own data
    if (data.userId !== user.uid) {
      throw new Error("Unauthorized access to day score");
    }
    
    return {
      id: docSnap.id,
      ...data
    };
  } catch (error) {
    console.error("Error getting day score by ID:", error);
    throw error;
  }
};

// Delete a day score
export const deleteDayScore = async (id: string): Promise<void> => {
  try {
    const user = getCurrentUser();
    
    // Verify ownership before deletion
    const dayScore = await getDayScoreById(id);
    if (!dayScore) {
      throw new Error("Day score not found");
    }
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting day score:", error);
    throw error;
  }
};

// Get day scores for a date range
export const getDayScoresInRange = async (startDate: string, endDate: string): Promise<DayScore[]> => {
  try {
    const user = getCurrentUser();
    
    const q = query(
      dayScoresRef,
      where("userId", "==", user.uid),
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const dayScores: DayScore[] = [];
    
    querySnapshot.forEach((doc) => {
      dayScores.push({
        id: doc.id,
        ...doc.data()
      } as DayScore);
    });
    
    return dayScores;
  } catch (error) {
    console.error("Error getting day scores in range:", error);
    throw error;
  }
};

// Create a template from an existing day score
export const createTemplateFromDayScore = async (dayScoreId: string, templateName: string): Promise<DayScore> => {
  try {
    const dayScore = await getDayScoreById(dayScoreId);
    if (!dayScore) {
      throw new Error("Day score not found");
    }
    
    // Remove scores and notes from segments for template
    const templateSegments = dayScore.segments.map(segment => {
      const { score, notes, completed, ...segmentWithoutScoring } = segment;
      return {
        ...segmentWithoutScoring,
        id: generateSegmentId(), // Generate new IDs for template
      };
    });
    
    const templateData = {
      date: '', // Templates don't have specific dates
      segments: templateSegments,
      isTemplate: true,
      templateName
    };
    
    return await createDayScore(templateData);
  } catch (error) {
    console.error("Error creating template from day score:", error);
    throw error;
  }
};

// Get all templates
export const getDayScoreTemplates = async (): Promise<DayScore[]> => {
  try {
    const user = getCurrentUser();
    
    const q = query(
      dayScoresRef,
      where("userId", "==", user.uid),
      where("isTemplate", "==", true),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const templates: DayScore[] = [];
    
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data()
      } as DayScore);
    });
    
    return templates;
  } catch (error) {
    console.error("Error getting day score templates:", error);
    throw error;
  }
}; 