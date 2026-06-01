"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile
} from "@firebase/auth";
import { isFirebaseEnabled, auth } from "@/lib/firebase";

export interface UserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  isFallbackMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Monitor Auth State
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isFirebaseEnabled && auth) {
      // Set a 3-second safety timeout to prevent getting stuck on loading splash screen
      timeoutId = setTimeout(() => {
        console.warn("Firebase Auth response timed out. Falling back to Sandbox mode.");
        const cached = localStorage.getItem("draftshift_demo_user");
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch {
            localStorage.removeItem("draftshift_demo_user");
          }
        }
        setLoading(false);
      }, 3000);

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        clearTimeout(timeoutId);
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
          });
        } else {
          // If logged out from Firebase Auth, check if there is an active demo user
          const cached = localStorage.getItem("draftshift_demo_user");
          if (cached) {
            try {
              setUser(JSON.parse(cached));
            } catch {
              localStorage.removeItem("draftshift_demo_user");
              setUser(null);
            }
          } else {
            setUser(null);
          }
        }
        setLoading(false);
      });
      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } else {
      // Fallback Mode: Load user from localStorage
      const cached = localStorage.getItem("draftshift_demo_user");
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch {
          localStorage.removeItem("draftshift_demo_user");
        }
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (isFirebaseEnabled && auth) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Fallback simulation
        await new Promise((r) => setTimeout(r, 600)); // Simulate delay
        const mockUser: UserSession = {
          uid: "demo-user-123",
          email: email,
          displayName: email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1),
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        };
        localStorage.setItem("draftshift_demo_user", JSON.stringify(mockUser));
        setUser(mockUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      if (isFirebaseEnabled && auth) {
        const credentials = await createUserWithEmailAndPassword(auth, email, password);
        if (credentials.user) {
          await updateProfile(credentials.user, { displayName });
          setUser({
            uid: credentials.user.uid,
            email: credentials.user.email,
            displayName: displayName,
            photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${credentials.user.uid}`,
          });
        }
      } else {
        // Fallback simulation
        await new Promise((r) => setTimeout(r, 600)); // Simulate delay
        const mockUser: UserSession = {
          uid: "demo-user-123",
          email: email,
          displayName: displayName,
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${displayName}`,
        };
        localStorage.setItem("draftshift_demo_user", JSON.stringify(mockUser));
        setUser(mockUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (isFirebaseEnabled && auth) {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
        } catch (fbError: any) {
          console.warn("Firebase Google Auth failed (likely disabled in console). Falling back to Sandbox Google simulation:", fbError);
          // Fallback simulation
          const mockUser: UserSession = {
            uid: "demo-google-user",
            email: "google-dev@draftshift.com",
            displayName: "Alex Rivera",
            photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
          };
          localStorage.setItem("draftshift_demo_user", JSON.stringify(mockUser));
          setUser(mockUser);
        }
      } else {
        // Fallback simulation
        await new Promise((r) => setTimeout(r, 600));
        const mockUser: UserSession = {
          uid: "demo-google-user",
          email: "google-dev@draftshift.com",
          displayName: "Alex Rivera",
          photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
        };
        localStorage.setItem("draftshift_demo_user", JSON.stringify(mockUser));
        setUser(mockUser);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemo = async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 450));
      const mockUser: UserSession = {
        uid: "demo-reviewer-user",
        email: "reviewer@draftshift.com",
        displayName: "Senior Developer",
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=Senior",
      };
      localStorage.setItem("draftshift_demo_user", JSON.stringify(mockUser));
      setUser(mockUser);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("draftshift_demo_user");
      setUser(null);
      if (isFirebaseEnabled && auth) {
        await signOut(auth);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFallbackMode: !isFirebaseEnabled || (user ? user.uid.startsWith("demo-") : false),
        login,
        signup,
        loginWithGoogle,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
