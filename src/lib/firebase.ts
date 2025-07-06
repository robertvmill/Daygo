// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
// Import analytics only on client side
import { getAnalytics } from "firebase/analytics";

// Initialize Firebase with configuration for Daygo app
const firebaseConfig = {
  apiKey: "AIzaSyDF3-5iA2WBv57MNvgxPD1m7NO39AjBg5Y",
  authDomain: "dayfocus-45a76.firebaseapp.com",
  projectId: "dayfocus-45a76",
  storageBucket: "dayfocus-45a76.firebasestorage.app",
  messagingSenderId: "961785427048",
  appId: "1:961785427048:web:963710ad53d9a17facf7dd",
  measurementId: "G-SGB18DZLJN"
};

// Initialize Firebase (or get existing instance)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with modern cache settings
export const db = getFirestore(app);

// Initialize Auth with local persistence
export const auth = getAuth(app);

// Initialize Storage
export const storage = getStorage(app);

// Set up persistence and cache for better performance
if (typeof window !== 'undefined') {
  // Set auth persistence to LOCAL (keeps user logged in between sessions)
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Auth persistence error:', error);
  });
}

// Initialize Analytics (only in browser)
export const initializeAnalytics = () => {
  if (typeof window !== 'undefined') {
    return getAnalytics(app);
  }
  return null;
};

export default app; 