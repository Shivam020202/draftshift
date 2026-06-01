import { initializeApp, getApps, getApp } from "@firebase/app";
import { getAuth } from "@firebase/auth";
import { getFirestore } from "@firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is configured with real keys
const isFirebaseConfigured = (): boolean => {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("your_firebase")) return false;
  if (!firebaseConfig.projectId || firebaseConfig.projectId.includes("your_project")) return false;
  return true;
};

export const isFirebaseEnabled = isFirebaseConfigured();

let app;
let auth: any = null;
let db: any = null;

if (isFirebaseEnabled) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully in Cloud mode.");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    (window as any)._firebaseEnabledOverride = false;
  }
} else {
  console.log("Firebase is disabled (missing or placeholder keys). Running in Local Sandbox mode.");
}

export { auth, db };
