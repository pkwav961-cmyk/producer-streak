import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc, updateDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  loginWithEmail: (identifier: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let isMounted = true;

    // Safety timeout to prevent being stuck on loading screen forever
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Auth initialization taking too long, forcing load completion.");
        setLoading(false);
      }
    }, 8000); // 8 seconds safety cap

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      if (user) {
        setUser(user);
        
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        const userRef = doc(db, 'users', user.uid);
        
        // Use getDoc first to potentially unblock faster than onSnapshot
        try {
          const initialSnap = await getDoc(userRef);
          if (initialSnap.exists() && isMounted) {
            setProfile({ uid: initialSnap.id, ...initialSnap.data() } as UserProfile);
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
        } catch (err: any) {
          if (err.message?.includes('offline')) {
            console.warn("Profile fetch: Client is currently offline, relying on cached data/snapshot.");
          } else {
            console.error("Initial profile fetch error:", err);
          }
        }

        // Subscribe to real-time updates for persistence
        unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
          if (!isMounted) return;
          
          if (snapshot.exists()) {
            setProfile({ uid: snapshot.id, ...snapshot.data() } as UserProfile);
            setLoading(false);
            clearTimeout(safetyTimeout);
          } else {
            // Profile doesn't exist, create it
            const initialProfile: Omit<UserProfile, 'uid'> = {
              displayName: user.displayName || (user.isAnonymous ? 'Guest Producer' : 'Producer'),
              photoURL: user.photoURL || '',
              email: user.email || '',
              xp: 0,
              level: 1,
              streakCount: 0,
              lastActivityDate: new Date(Date.now() - 86400000).toISOString(), // Initialize to yesterday
              streakShields: 3,
              stats: {
                totalBeats: 0,
                beatsFinished: 0,
                totalHours: 0,
                songsRecorded: 0,
                mixesCompleted: 0,
                uploadsCount: 0,
                collabsCount: 0,
                revenueEarned: 0
              },
              bio: '',
              location: '',
              createdAt: new Date().toISOString()
            };
            
            setDoc(userRef, initialProfile).finally(() => {
              if (isMounted) {
                setLoading(false);
                clearTimeout(safetyTimeout);
              }
            });
          }
        }, (error) => {
          console.error("Profile snapshot error:", error);
          if (isMounted) {
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
        });
      } else {
        // Automatically sign in anonymously if not logged in
        try {
          await signInAnonymously(auth);
        } catch (err: any) {
          console.warn("Anonymous auth failed (likely disabled in console):", err.code || err);
          
          if (!isMounted) return;
          
          // Fallback to local guest mode if anonymous auth is disabled
          const guestUid = localStorage.getItem('guest_uid') || `guest-${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('guest_uid', guestUid);
          
          const mockUser = {
            uid: guestUid,
            isAnonymous: true,
            displayName: 'Guest Producer',
            photoURL: null,
            email: ''
          } as any;
          
          setUser(mockUser);
          
          // Define a default guest profile in case Firestore is unreachable
          const defaultGuestProfile: UserProfile = {
            uid: guestUid,
            displayName: 'Guest Producer',
            photoURL: null,
            email: '',
            xp: 0,
            level: 1,
            streakCount: 0,
            lastActivityDate: new Date(Date.now() - 86400000).toISOString(),
            streakShields: 3,
            stats: {
              totalBeats: 0,
              beatsFinished: 0,
              totalHours: 0,
              songsRecorded: 0,
              mixesCompleted: 0,
              uploadsCount: 0,
              collabsCount: 0,
              revenueEarned: 0
            },
            bio: 'Local Guest Mode (Firebase Auth Restricted)',
            location: 'Local Studio',
            createdAt: new Date().toISOString()
          };
          
          // Set local profile immediately to unblock UI
          if (isMounted) {
            setProfile(defaultGuestProfile);
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
          
          const userRef = doc(db, 'users', guestUid);
          try {
            // Attempt to fetch actual data if it exists, but don't block
            const snap = await getDoc(userRef);
            if (snap.exists() && isMounted) {
              setProfile({ uid: snap.id, ...snap.data() } as UserProfile);
            } else if (isMounted) {
              // Try to persist but don't wait for it
              setDoc(userRef, defaultGuestProfile).catch(e => console.warn("Could not persist guest profile to Firestore:", e.message));
            }
          } catch (profileErr: any) {
            console.warn("Guest profile Firestore sync issue:", profileErr.message);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    setAuthError(null);
    try {
      // Check if username is already taken - This now works because we allowed list: true in rules
      // (Wait for a small delay to ensure Firebase Auth is ready if needed, but not strictly required for public queries)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('displayName', '==', name), limit(1));
      const snapshot = await getDocs(q).catch(err => {
        console.warn("Username check query error:", err.message);
        return { empty: true } as any; // Fallback if query fails
      });
      
      if (!snapshot.empty) {
        throw new Error("This producer handle is already taken. Choose another one.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });

      // Create the Firestore profile immediately with the correct name
      const userRef = doc(db, 'users', userCredential.user.uid);
      const initialProfile: Omit<UserProfile, 'uid'> = {
        displayName: name,
        photoURL: userCredential.user.photoURL || '',
        email: userCredential.user.email || '',
        xp: 0,
        level: 1,
        streakCount: 0,
        lastActivityDate: new Date(Date.now() - 86400000).toISOString(), // Initialize to yesterday
        streakShields: 3,
        stats: {
          totalBeats: 0,
          beatsFinished: 0,
          totalHours: 0,
          songsRecorded: 0,
          mixesCompleted: 0,
          uploadsCount: 0,
          collabsCount: 0,
          revenueEarned: 0
        },
        bio: '',
        location: '',
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, initialProfile);
    } catch (error: any) {
      console.error("Sign up failed", error);
      setAuthError(error.message || "Failed to create account.");
      throw error;
    }
  };

  const loginWithEmail = async (identifier: string, pass: string) => {
    setAuthError(null);
    try {
      let emailToUse = identifier;
      
      // If it doesn't look like an email, assume it's a username
      if (!identifier.includes('@')) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('displayName', '==', identifier), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          throw new Error("No producer found with that handle.");
        }
        emailToUse = snapshot.docs[0].data().email;
        if (!emailToUse) {
          throw new Error("This profile doesn't have an associated email for login.");
        }
      }

      await signInWithEmailAndPassword(auth, emailToUse, pass);
    } catch (error: any) {
      console.error("Login failed", error);
      setAuthError(error.message || "Failed to sign in. Check your credentials.");
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const clearError = () => setAuthError(null);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) throw new Error('No user logged in');
    
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, updates);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      authError, 
      loginWithEmail, 
      signUpWithEmail, 
      logout, 
      clearError,
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
