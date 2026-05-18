import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile as updateAuthProfile, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, onSnapshot, getDoc, updateDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';
import { sendWelcomeEmail, sendAdminNewUserEmail } from './email';
import { checkUserMilestone } from './adminEmails';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  loginWithEmail: (identifier: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let isMounted = true;

    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Auth initialization taking too long, forcing load completion.");
        setLoading(false);
      }
    }, 8000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (currentUser) {
        setUser(currentUser);
        const adminEmails = ['tapmadeit@gmail.com', 'prodbysean21@gmail.com', 'sanjosean96@gmail.com', 'pkwav961@gmail.com', 'visualsbn@gmail.com'];
        setIsAdmin(adminEmails.includes(String(currentUser.email).toLowerCase()));
        
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        const userRef = doc(db, 'users', currentUser.uid);
        
        try {
          const initialSnap = await getDoc(userRef);
          if (initialSnap.exists() && isMounted) {
            setProfile({ uid: initialSnap.id, ...initialSnap.data() } as UserProfile);
            setLoading(false);
            clearTimeout(safetyTimeout);
          }
        } catch (err: any) {
          console.error("Initial profile fetch error:", err);
        }

        unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
          if (!isMounted) return;
          
          if (snapshot.exists()) {
            setProfile({ uid: snapshot.id, ...snapshot.data() } as UserProfile);
            setLoading(false);
            clearTimeout(safetyTimeout);
          } else {
            const initialProfile: Omit<UserProfile, 'uid'> = {
              displayName: currentUser.displayName || 'Producer',
              photoURL: currentUser.photoURL || '',
              email: currentUser.email || '',
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
              bio: '',
              location: '',
              city: '',
              country: '',
              roles: [],
              matcherRoles: [],
              matcherDaw: '',
              matcherMusicLink: '',
              matcherAudioUrl: '',
              matcherEnabled: false,
              matcherOnboardComplete: false,
              socials: { discord: '', instagram: '', tiktok: '' },
              genres: [],
              daw: [],
              skillLevel: 'beginner',
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
          if (isMounted) setLoading(false);
        });
      } else {
        // Explicitly clear profile data if there is no logged-in user session
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        clearTimeout(safetyTimeout);
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
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('displayName', '==', name), limit(1));
      const snapshot = await getDocs(q).catch(() => ({ empty: true } as any));
      
      if (!snapshot.empty) {
        throw new Error("This producer handle is already taken. Choose another one.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateAuthProfile(userCredential.user, { displayName: name });

      const userRef = doc(db, 'users', userCredential.user.uid);
      const initialProfile: Omit<UserProfile, 'uid'> = {
        displayName: name,
        photoURL: userCredential.user.photoURL || '',
        email: userCredential.user.email || '',
        plan: 'free',
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
        bio: '',
        location: '',
        city: '',
        country: '',
        roles: [],
        matcherRoles: [],
        matcherDaw: '',
        matcherMusicLink: '',
        matcherAudioUrl: '',
        matcherEnabled: false,
        matcherOnboardComplete: false,
        socials: { discord: '', instagram: '', tiktok: '' },
        genres: [],
        daw: [],
        skillLevel: 'beginner',
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, initialProfile);

      // Trigger Resend welcome & admin notifications in background!
      sendWelcomeEmail(email, name, ['Producer']).catch(err => console.error("Welcome email failed", err));
      sendAdminNewUserEmail({
        email,
        displayName: name,
        country: 'US',
        roles: ['Producer'],
        genres: []
      }).catch(err => console.error("Admin signup email failed", err));

      // Check for user count milestones (1K, 5K, 10K etc.)
      getDocs(collection(db, 'users')).then(snap => {
        checkUserMilestone(snap.size).catch(console.error);
      }).catch(console.error);
    } catch (error: any) {
      setAuthError(error.message || "Failed to create account.");
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const credentialUser = result.user;
      const userRef = doc(db, 'users', credentialUser.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        const initialProfile: Omit<UserProfile, 'uid'> = {
          displayName: credentialUser.displayName || 'Producer',
          photoURL: credentialUser.photoURL || '',
          email: credentialUser.email || '',
          plan: 'free',
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
          bio: '',
          location: '',
          city: '',
          country: '',
          roles: [],
          matcherRoles: [],
          matcherDaw: '',
          matcherMusicLink: '',
          matcherAudioUrl: '',
          matcherEnabled: false,
          matcherOnboardComplete: false,
          socials: { discord: '', instagram: '', tiktok: '' },
          genres: [],
          daw: [],
          skillLevel: 'beginner',
          createdAt: new Date().toISOString()
        };
        await setDoc(userRef, initialProfile);

        // Trigger Resend welcome & admin notifications in background for new Google users!
        sendWelcomeEmail(credentialUser.email || '', credentialUser.displayName || 'Producer', ['Producer']).catch(err => console.error("Welcome email failed", err));
        sendAdminNewUserEmail({
          email: credentialUser.email || '',
          displayName: credentialUser.displayName || 'Producer',
          country: 'US',
          roles: ['Producer'],
          genres: []
        }).catch(err => console.error("Admin signup email failed", err));
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed');
      throw err;
    }
  };

  const loginWithEmail = async (identifier: string, pass: string) => {
    setAuthError(null);
    try {
      let emailToUse = identifier;
      if (!identifier.includes('@')) {
        const usersRef = collection(db, 'users');
        // Check case-insensitive by doing a simple exact match (Firestore is case-sensitive, but we can try)
        const q = query(usersRef, where('displayName', '==', identifier), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error("No producer found with that handle.");
        emailToUse = snapshot.docs[0].data().email;
      }
      await signInWithEmailAndPassword(auth, emailToUse, pass);
    } catch (error: any) {
      setAuthError(error.message || "Failed to sign in.");
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      if (!email) throw new Error("Please enter your email to reset password.");
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      setAuthError(error.message || "Failed to send reset email.");
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setAuthError(null);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');
    const userRef = doc(db, 'users', user.uid);
    if (updates.displayName && auth.currentUser) {
      await updateAuthProfile(auth.currentUser, { displayName: updates.displayName }).catch(() => {});
    }
    await setDoc(userRef, updates, { merge: true });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      authError, 
      loginWithEmail, 
      signUpWithEmail, 
      signInWithGoogle,
      resetPassword,
      logout, 
      clearError,
      updateProfile,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};