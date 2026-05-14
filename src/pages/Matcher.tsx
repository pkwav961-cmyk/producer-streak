import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, setDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { MatcherProfile, MatchSuggestion, SwipeAction, Match } from '../types';
import {
  Heart,
  X,
  Music,
  Mic,
  Settings,
  MapPin,
  Zap,
  Users,
  MessageCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const MatcherPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeMode, setActiveMode] = useState<'producer' | 'artist' | 'engineer'>('producer');
  const [currentProfile, setCurrentProfile] = useState<MatcherProfile | null>(null);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const modes = [
    { id: 'producer' as const, label: 'Producers', icon: Music, color: 'purple' },
    { id: 'artist' as const, label: 'Artists', icon: Mic, color: 'blue' },
    { id: 'engineer' as const, label: 'Engineers', icon: Settings, color: 'green' },
  ];

  useEffect(() => {
    if (user && profile) {
      loadSuggestions();
    }
  }, [user, profile, activeMode]);

  const loadSuggestions = async () => {
    if (!user || !profile) return;

    setLoading(true);
    try {
      // Get all users with matcher enabled
      const usersQuery = query(
        collection(db, 'users'),
        where('matcherEnabled', '==', true),
        where('role', '==', activeMode),
        orderBy('lastActivityDate', 'desc'),
        limit(50)
      );

      const usersSnapshot = await getDocs(usersQuery);
      const allUsers = usersSnapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as MatcherProfile))
        .filter(u => u.uid !== user.uid);

      // Get previous swipes to filter out
      const swipesQuery = query(
        collection(db, 'swipes'),
        where('swiperId', '==', user.uid),
        where('mode', '==', activeMode)
      );

      const swipesSnapshot = await getDocs(swipesQuery);
      const swipedUserIds = new Set(swipesSnapshot.docs.map(doc => doc.data().targetId));

      // Filter and score suggestions
      const availableUsers = allUsers.filter(u => !swipedUserIds.has(u.uid));
      const scoredSuggestions = availableUsers.map(user => ({
        user,
        compatibilityScore: calculateCompatibilityScore(profile, user, activeMode),
        sharedGenres: getSharedGenres(profile.genres || [], user.genres || []),
        matchReason: generateMatchReason(profile, user, activeMode)
      })).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

      setSuggestions(scoredSuggestions);
      setCurrentProfile(scoredSuggestions[0]?.user || null);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompatibilityScore = (currentUser: any, targetUser: MatcherProfile, mode: string): number => {
    let score = 0;

    // Genre overlap (40 points max)
    const sharedGenres = getSharedGenres(currentUser.genres || [], targetUser.genres);
    score += (sharedGenres.length / Math.max(currentUser.genres?.length || 1, targetUser.genres.length)) * 40;

    // Activity score (20 points max)
    const daysSinceActive = (Date.now() - new Date(targetUser.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 20 - daysSinceActive);

    // Skill level compatibility (15 points max)
    if (currentUser.skillLevel && targetUser.skillLevel) {
      const levelDiff = Math.abs(
        ['beginner', 'intermediate', 'advanced', 'expert'].indexOf(currentUser.skillLevel) -
        ['beginner', 'intermediate', 'advanced', 'expert'].indexOf(targetUser.skillLevel)
      );
      score += Math.max(0, 15 - levelDiff * 5);
    }

    // Mode-specific scoring
    if (mode === 'producer') {
      // BPM range compatibility
      if (currentUser.bpmRange && targetUser.bpmRange) {
        const overlap = Math.max(0,
          Math.min(currentUser.bpmRange.max, targetUser.bpmRange.max) -
          Math.max(currentUser.bpmRange.min, targetUser.bpmRange.min)
        );
        score += (overlap / 40) * 15; // 15 points max for BPM overlap
      }
    }

    // Location bonus (10 points max)
    if (currentUser.location && targetUser.location &&
        currentUser.location.toLowerCase() === targetUser.location.toLowerCase()) {
      score += 10;
    }

    return Math.min(100, Math.round(score));
  };

  const getSharedGenres = (genres1: string[], genres2: string[]): string[] => {
    return genres1.filter(genre => genres2.includes(genre));
  };

  const generateMatchReason = (currentUser: any, targetUser: MatcherProfile, mode: string): string => {
    const sharedGenres = getSharedGenres(currentUser.genres || [], targetUser.genres || []);

    if (mode === 'producer') {
      if (sharedGenres.length > 0) {
        return `Shares ${sharedGenres.slice(0, 2).join(', ')} passion`;
      }
      return 'Complementary production styles';
    } else if (mode === 'artist') {
      return 'Looking for beats and collabs';
    } else {
      return 'Experienced in your genre';
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!user || !currentProfile) return;

    const action = direction === 'right' ? 'like' : 'pass';

    try {
      // Record the swipe
      await addDoc(collection(db, 'swipes'), {
        swiperId: user.uid,
        targetId: currentProfile.uid,
        action,
        mode: activeMode,
        createdAt: serverTimestamp()
      });

      // Check for mutual match
      if (action === 'like') {
        const mutualQuery = query(
          collection(db, 'swipes'),
          where('swiperId', '==', currentProfile.uid),
          where('targetId', '==', user.uid),
          where('action', '==', 'like'),
          where('mode', '==', activeMode)
        );

        const mutualSnapshot = await getDocs(mutualQuery);
        if (!mutualSnapshot.empty) {
          // Create match
          await addDoc(collection(db, 'matches'), {
            users: [user.uid, currentProfile.uid].sort(),
            mode: activeMode,
            createdAt: serverTimestamp()
          });

          // Create chat
          const chatData = {
            participants: [user.uid, currentProfile.uid],
            type: 'direct' as const,
            name: `Match: ${profile?.displayName} & ${currentProfile.displayName}`,
            lastMessage: 'You matched! Start collaborating! 🎵',
            updatedAt: serverTimestamp()
          };

          const chatRef = await addDoc(collection(db, 'chats'), chatData);

          // Add initial message
          await addDoc(collection(db, 'chats', chatRef.id, 'messages'), {
            senderId: 'system',
            text: `🎉 It's a match! You both swiped right. Start your collaboration!`,
            createdAt: serverTimestamp()
          });
        }
      }

      // Move to next profile
      setSwipeDirection(direction);
      setTimeout(() => {
        const remainingSuggestions = suggestions.slice(1);
        setSuggestions(remainingSuggestions);
        setCurrentProfile(remainingSuggestions[0]?.user || null);
        setSwipeDirection(null);
      }, 300);

    } catch (error) {
      console.error('Error handling swipe:', error);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    const { offset } = info;

    if (Math.abs(offset.x) > swipeThreshold) {
      handleSwipe(offset.x > 0 ? 'right' : 'left');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 animate-pulse">
          Finding Matches...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">Matcher</h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Find your perfect collab</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex justify-center">
        <div className="flex bg-[#121214] border border-white/5 rounded-2xl p-1">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeMode === mode.id
                  ? `bg-${mode.color}-500/20 text-${mode.color}-400 border border-${mode.color}-500/30`
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <mode.icon size={16} />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Card */}
      <div className="flex justify-center px-6">
        <div className="relative w-full max-w-sm aspect-[3/4]">
          <AnimatePresence>
            {currentProfile ? (
              <motion.div
                key={currentProfile.uid}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{
                  scale: swipeDirection === 'right' ? 1.1 : 0.9,
                  opacity: 0,
                  x: swipeDirection === 'right' ? 300 : -300,
                  rotate: swipeDirection === 'right' ? 15 : -15
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                className="absolute inset-0 bg-[#121214] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
              >
                {/* Profile Image */}
                <div className="relative h-3/5 bg-gradient-to-br from-purple-600/20 to-blue-600/20">
                  {currentProfile.photoURL ? (
                    <img
                      src={currentProfile.photoURL}
                      alt={currentProfile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users size={64} className="text-white/20" />
                    </div>
                  )}

                  {/* Compatibility Score */}
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-xl px-3 py-1 rounded-full">
                    <span className="text-sm font-bold text-white">
                      {suggestions[0]?.compatibilityScore || 0}%
                    </span>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-xl font-black italic tracking-tight uppercase">
                      {currentProfile.displayName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        currentProfile.role === 'producer' ? 'bg-purple-500/20 text-purple-400' :
                        currentProfile.role === 'artist' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {currentProfile.role}
                      </div>
                      <div className="px-2 py-1 rounded-full bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Level {currentProfile.level}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 leading-relaxed">
                    {currentProfile.bio || 'Passionate about creating music...'}
                  </p>

                  {/* Genres */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Genres</p>
                    <div className="flex flex-wrap gap-2">
                      {currentProfile.genres?.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest text-gray-300"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Match Reason */}
                  {suggestions[0] && (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">
                        Why match?
                      </p>
                      <p className="text-sm text-gray-300 italic">
                        {suggestions[0].matchReason}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="absolute inset-0 bg-[#121214] border border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-center p-8">
                <Heart size={48} className="text-white/10 mb-4" />
                <h3 className="text-lg font-black italic tracking-tight uppercase text-white/40 mb-2">
                  No More Matches
                </h3>
                <p className="text-sm text-gray-500">
                  Check back later for new {modes.find(m => m.id === activeMode)?.label.toLowerCase()}!
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Buttons */}
      {currentProfile && (
        <div className="flex justify-center gap-6 px-6">
          <button
            onClick={() => handleSwipe('left')}
            className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
            <X size={24} className="text-red-400" />
          </button>

          <button
            onClick={() => handleSwipe('right')}
            className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
            <Heart size={24} className="text-green-400" />
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center px-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Swipe right to match • Left to pass
        </p>
      </div>
    </div>
  );
};