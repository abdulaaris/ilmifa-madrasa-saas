import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBhomK4aJmoDlZDvqrwbuSra-sRqFUm0LA",
  authDomain: "ilmifa.firebaseapp.com",
  projectId: "ilmifa",
  storageBucket: "ilmifa.firebasestorage.app",
  messagingSenderId: "157124178859",
  appId: "1:157124178859:web:0f3d49ac9b9834613ad8ee",
  measurementId: "G-S2E3HJRE4B"
};

// Initialize Primary Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Creates a secondary Auth instance for creating secondary accounts (Principals, Teachers, Parents)
 * without logging out the currently authenticated Admin or Principal.
 */
export const getSecondaryAuth = () => {
  const secondaryAppName = 'iLmiFaSecondaryAuthApp';
  const existingApps = getApps();
  const existingSecondary = existingApps.find(a => a.name === secondaryAppName);
  
  const secondaryApp = existingSecondary || initializeApp(firebaseConfig, secondaryAppName);
  return getAuth(secondaryApp);
};
