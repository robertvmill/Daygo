import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';
import { CountdownEvent } from '@/types/journal';

const COLLECTION_NAME = 'countdownEvents';

// Get current user ID
const getCurrentUserId = (): string => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
};

// Create a new countdown event
export const createCountdownEvent = async (eventData: Omit<CountdownEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<CountdownEvent> => {
  const userId = getCurrentUserId();
  
  // Filter out undefined values to avoid Firestore errors
  const cleanEventData = Object.fromEntries(
    Object.entries(eventData).filter(([_, value]) => value !== undefined)
  );
  
  const newEvent = {
    ...cleanEventData,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), newEvent);
  
  return {
    id: docRef.id,
    ...newEvent,
  };
};

// Get all countdown events for the current user
export const getCountdownEvents = async (includeInactive = false): Promise<CountdownEvent[]> => {
  const userId = getCurrentUserId();
  
  let q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('targetDate', 'asc')
  );

  if (!includeInactive) {
    q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('targetDate', 'asc')
    );
  }

  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CountdownEvent));
};

// Get a specific countdown event
export const getCountdownEvent = async (eventId: string): Promise<CountdownEvent | null> => {
  const docRef = doc(db, COLLECTION_NAME, eventId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as CountdownEvent;
  }
  
  return null;
};

// Update a countdown event
export const updateCountdownEvent = async (eventId: string, updates: Partial<Omit<CountdownEvent, 'id' | 'userId' | 'createdAt'>>): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, eventId);
  
  // Filter out undefined values to avoid Firestore errors
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );
  
  await updateDoc(docRef, {
    ...cleanUpdates,
    updatedAt: Timestamp.now(),
  });
};

// Delete a countdown event
export const deleteCountdownEvent = async (eventId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, eventId);
  await deleteDoc(docRef);
};

// Get upcoming events (within specified days)
export const getUpcomingEvents = async (daysAhead = 30): Promise<CountdownEvent[]> => {
  const userId = getCurrentUserId();
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + daysAhead);
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    where('isActive', '==', true),
    where('targetDate', '>=', Timestamp.fromDate(now)),
    where('targetDate', '<=', Timestamp.fromDate(futureDate)),
    orderBy('targetDate', 'asc')
  );

  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CountdownEvent));
};

// Calculate time remaining for an event
export const getTimeRemaining = (targetDate: Timestamp) => {
  const now = new Date().getTime();
  const target = targetDate.toDate().getTime();
  const difference = target - now;

  if (difference <= 0) {
    return {
      isPast: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: 0,
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return {
    isPast: false,
    days,
    hours,
    minutes,
    seconds,
    totalDays: days,
  };
};

// Format date for display
export const formatDate = (timestamp: Timestamp): string => {
  return timestamp.toDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Format date for input
export const formatDateForInput = (timestamp: Timestamp): string => {
  return timestamp.toDate().toISOString().split('T')[0];
};

// Create timestamp from date string
export const createTimestampFromDate = (dateString: string): Timestamp => {
  return Timestamp.fromDate(new Date(dateString));
}; 