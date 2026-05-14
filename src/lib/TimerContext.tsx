import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError } from './firebase';
import { collection, addDoc, doc, updateDoc, increment, query, where, getDocs, getDoc, setDoc, serverTimestamp, deleteDoc, limit } from 'firebase/firestore';
import { OperationType, ProductionSession as Session, UserProfile } from '../types';
import { useAuth } from './AuthContext';
import { updateUserStatsAfterActivity } from './stats';

interface TimerContextType {
  isActive: boolean;
  seconds: number;
  sessionType: 'production' | 'mixing' | 'recording' | 'arrangement';
  notes: string;
  pendingSession: Session | null;
  showCelebration: boolean;
  toggleTimer: () => void;
  saveSession: () => Promise<void>;
  discardPendingSession: () => Promise<void>;
  resumePendingSession: () => void;
  setSessionType: (type: 'production' | 'mixing' | 'recording' | 'arrangement') => void;
  setNotes: (notes: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessionType, setSessionType] = useState<'production' | 'mixing' | 'recording' | 'arrangement'>('production');
  const [notes, setNotes] = useState('');
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const timerRef = useRef<NodeJS.Timeout| null>(null);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const notesRef = useRef(notes);
  const secondsRef = useRef(seconds);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    if (!user) return;

    const checkPendingSession = async () => {
      try {
        const q = query(
          collection(db, 'sessions'),
          where('userId', '==', user.uid),
          where('status', '==', 'partial'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          setPendingSession({ id: docSnap.id, ...data } as Session);
        }
      } catch (err: any) {
        if (err.message?.includes('permissions')) {
          console.warn('Silent permission error checking pending session (likely auth delay)');
        } else {
          console.error('Error checking pending session:', err);
          handleFirestoreError(err, OperationType.GET, 'sessions/query/pending');
        }
      }
    };

    checkPendingSession();
  }, [user]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
      
      autoSaveRef.current = setInterval(async () => {
        if (activeSessionId) {
          try {
            await updateDoc(doc(db, 'sessions', activeSessionId), {
              durationMinutes: Math.floor(secondsRef.current / 60),
              notes: notesRef.current,
              updatedAt: serverTimestamp()
            });
          } catch (err) {
            console.error('Auto-save failed:', err);
          }
        }
      }, 30000);

    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [isActive, activeSessionId]);

  const updateChallengeProgress = async (type: 'daily' | 'weekly', incrementValue: number) => {
    if (!user) return;
    try {
      const q = query(collection(db, 'challenges'), where('type', '==', type));
      const snapshot = await getDocs(q);
      
      for (const docSnap of snapshot.docs) {
        const challenge = docSnap.data();
        const ucId = `${user.uid}_${docSnap.id}`;
        const ucRef = doc(db, 'userChallenges', ucId);
        
        const ucDoc = await getDoc(ucRef);
        if (ucDoc.exists()) {
          const data = ucDoc.data();
          if (!data.completed && !data.claimed) {
            const newValue = (data.currentValue || 0) + incrementValue;
            await updateDoc(ucRef, {
              currentValue: newValue,
              completed: newValue >= challenge.targetValue,
              updatedAt: serverTimestamp()
            });
          }
        } else {
          await setDoc(ucRef, {
            userId: user.uid,
            challengeId: docSnap.id,
            currentValue: incrementValue,
            completed: incrementValue >= challenge.targetValue,
            claimed: false,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error('Error updating challenge progress:', err);
    }
  };

  const toggleTimer = async () => {
    if (!isActive) {
      setIsActive(true); // Instant feedback
      if (!activeSessionId && user) {
        // Create partial session in background
        const sessionData = {
          userId: user.uid,
          startTime: new Date().toISOString(),
          durationMinutes: 0,
          type: sessionType,
          verified: true,
          notes: notes,
          status: 'partial'
        };

        addDoc(collection(db, 'sessions'), sessionData)
          .then(docRef => {
            setActiveSessionId(docRef.id);
          })
          .catch(err => {
            console.warn('Silent failure creating partial session:', err.message);
            // We don't stop the timer just because DB write failed
          });
      }
    } else {
      setIsActive(false);
    }
  };

  const resumePendingSession = () => {
    if (!pendingSession) return;
    setSeconds(pendingSession.durationMinutes * 60);
    setSessionType(pendingSession.type);
    setNotes(pendingSession.notes || '');
    setActiveSessionId(pendingSession.id);
    setPendingSession(null);
    setIsActive(true);
  };

  const discardPendingSession = async () => {
    if (!pendingSession) return;
    const sessionId = pendingSession.id;
    setPendingSession(null); // Instant UI update
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
    } catch (err) {
      console.warn('Error discarding partial session:', err);
    }
  };

  const saveSession = async () => {
    if (!user || seconds < 10) {
      console.log('Session too short or no user, discarding.', { seconds, user: !!user });
      const currentActiveId = activeSessionId;
      
      // Reset state immediately
      setIsActive(false);
      setSeconds(0);
      setNotes('');
      setActiveSessionId(null);

      if (currentActiveId) {
        deleteDoc(doc(db, 'sessions', currentActiveId)).catch(err => console.warn("Could not delete short session:", err));
      }
      
      if (seconds < 10 && seconds > 0) alert("Session must be at least 10 seconds to save.");
      return;
    }

    const durationMinutes = Math.floor(seconds / 60);
    const endTime = new Date().toISOString();
    const currentActiveId = activeSessionId;
    const currentNotes = notes;
    const currentSeconds = seconds;
    const currentType = sessionType;

    // UI Feedback immediately
    setIsActive(false);
    setSeconds(0);
    setNotes('');
    setActiveSessionId(null);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 5000);

    try {
      const xpEarned = Math.max(1, Math.floor(durationMinutes * 2));
      const totalHoursIncrement = Math.round((durationMinutes / 60) * 10) / 10;
      const result = await updateUserStatsAfterActivity(user.uid, xpEarned, totalHoursIncrement);
      
      if (result) {
        alert(`Session saved! Streak is now ${result.newStreak} days!`);
      }

      const userRef = doc(db, 'users', user.uid);
      const secondaryUpdate: any = {};
      if (currentType === 'mixing') {
        secondaryUpdate['stats.mixesCompleted'] = increment(1);
      } else if (currentType === 'recording') {
        secondaryUpdate['stats.songsRecorded'] = increment(1);
      }
      if (Object.keys(secondaryUpdate).length > 0) {
        await updateDoc(userRef, secondaryUpdate);
      }

      if (currentActiveId) {
        await updateDoc(doc(db, 'sessions', currentActiveId), {
          endTime,
          durationMinutes,
          notes: currentNotes,
          status: 'completed',
          updatedAt: serverTimestamp()
        });
      } else {
        const startTime = new Date(Date.now() - currentSeconds * 1000).toISOString();
        await addDoc(collection(db, 'sessions'), {
          userId: user.uid,
          startTime,
          endTime,
          durationMinutes,
          type: currentType,
          verified: true,
          notes: currentNotes,
          status: 'completed'
        });
      }

      updateChallengeProgress('daily', 1);
      updateChallengeProgress('weekly', durationMinutes);

    } catch (error: any) {
      console.error("Save session error:", error);
      // We don't use handleFirestoreError here to avoid crashing/throwing if it's just a network issue
      // The session might be lost if offline, but we cleared the UI already to prevent double-saving
    }
  };

  return (
    <TimerContext.Provider value={{ 
      isActive, 
      seconds, 
      sessionType, 
      notes,
      pendingSession,
      showCelebration,
      toggleTimer, 
      saveSession, 
      discardPendingSession,
      resumePendingSession,
      setSessionType,
      setNotes
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
