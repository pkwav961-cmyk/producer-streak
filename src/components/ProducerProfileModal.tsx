import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  BadgeCheck, 
  MapPin, 
  Cpu, 
  Flame, 
  ShieldCheck, 
  Music2, 
  Play, 
  Pause,
  MessageSquare,
  UserPlus,
  UserCheck,
  Clock,
  Users,
  User
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, setDoc, deleteDoc, serverTimestamp, increment, updateDoc } from 'firebase/firestore';
import { UserProfile, Beat, Friendship, FollowRelationship } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';

interface ProducerProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  friendship?: Friendship | null;
  onSendRequest?: (uid: string) => void;
  onStartChat?: (user: UserProfile) => void;
}

export const ProducerProfileModal: React.FC<ProducerProfileModalProps> = ({ 
  userId, 
  isOpen, 
  onClose,
  friendship,
  onSendRequest,
  onStartChat
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;

    async function fetchFullProfile() {
      setLoading(true);
      try {
        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setProfile({ ...userDoc.data(), uid: userDoc.id } as UserProfile);
        }

        // Fetch recent beats
        const beatsQ = query(
          collection(db, 'beats'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const beatsSnap = await getDocs(beatsQ);
        setBeats(beatsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Beat)));

        // Check if following
        if (user) {
          const followQ = query(
            collection(db, 'follows'),
            where('followerId', '==', user.uid),
            where('followingId', '==', userId)
          );
          const followSnap = await getDocs(followQ);
          setIsFollowing(!followSnap.empty);
        }
      } catch (err) {
        console.error("Error fetching producer details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFullProfile();
  }, [userId, isOpen]);

  const togglePlay = (beat: Beat) => {
    if (playingBeatId === beat.id) {
      audioRef.current?.pause();
      setPlayingBeatId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = beat.audioUrl;
        audioRef.current.play();
        setPlayingBeatId(beat.id);
      }
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !profile || isFollowLoading) return;
    setIsFollowLoading(true);

    const followId = `${user.uid}_${userId}`;
    const followRef = doc(db, 'follows', followId);
    const myProfileRef = doc(db, 'users', user.uid);
    const targetProfileRef = doc(db, 'users', userId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(myProfileRef, { 'stats.followingCount': increment(-1) });
        await updateDoc(targetProfileRef, { 'stats.followersCount': increment(-1) });
        setIsFollowing(false);
      } else {
        await setDoc(followRef, {
          followerId: user.uid,
          followingId: userId,
          createdAt: new Date().toISOString()
        });
        await updateDoc(myProfileRef, { 'stats.followingCount': increment(1) });
        await updateDoc(targetProfileRef, { 'stats.followersCount': increment(1) });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Follow toggle failed:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-12">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="absolute top-0 right-0 p-6 z-20">
            <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Synchronizing Profiles...</p>
              </div>
            ) : profile ? (
              <>
                {/* Profile Hero */}
                <div className="relative p-8 md:p-12 pb-0 flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden border-4 border-white/5 shadow-2xl bg-[#121214] flex items-center justify-center">
                      {profile.photoURL ? (
                        <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="text-gray-700" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 gradient-bg text-white p-2 rounded-xl border-4 border-[#0a0a0a]">
                      <BadgeCheck size={16} fill="currentColor" fillOpacity={0.2} />
                    </div>
                  </div>

                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase italic">{profile.displayName}</h1>
                  <p className="mt-4 text-gray-400 text-sm max-w-sm whitespace-pre-wrap leading-relaxed">{profile.bio || 'This producer prefers to let the music speak.'}</p>

                  <div className="flex items-center gap-3 mt-6">
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                      <MapPin size={12} className="text-purple-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{profile.location || 'Unknown Studio'}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-xl border border-purple-500/20 text-purple-400">
                      <Cpu size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Level {profile.level}</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-4 mt-8 w-full max-w-sm">
                    {userId !== user?.uid && (
                      <>
                        <button 
                          onClick={handleFollowToggle}
                          disabled={isFollowLoading}
                          className={cn(
                            "flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all",
                            isFollowing ? "bg-white/5 text-purple-500 border border-purple-500/20" : "gradient-bg text-white shadow-xl hover:scale-105"
                          )}
                        >
                          {isFollowLoading ? (
                             <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : isFollowing ? (
                             <><UserCheck size={16} /> Following</>
                          ) : (
                             <><UserPlus size={16} /> Follow</>
                          )}
                        </button>
                        <button 
                          onClick={() => onStartChat?.(profile)}
                          className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest text-white hover:bg-white/10"
                        >
                          <MessageSquare size={16} /> Chat
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 md:px-12">
                   {[
                    { v: profile.stats.followersCount || 0, l: 'Followers', c: 'text-white' },
                    { v: profile.stats.followingCount || 0, l: 'Following', c: 'text-white' },
                    { v: profile.stats.totalBeats, l: 'Beats', c: 'text-purple-500' },
                    { v: profile.streakCount, l: 'Streak', c: 'text-orange-500' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] text-center border-b-2" style={{ borderBottomColor: i > 1 ? 'currentColor' : 'transparent' }}>
                      <p className={cn("text-xl font-black", s.c)}>{s.v}</p>
                      <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Beats Cabinet */}
                <div className="p-8 md:px-12 pb-12">
                   <div className="flex items-center justify-between mb-6">
                     <h3 className="text-sm font-black italic tracking-tighter uppercase text-white/20">The Archive</h3>
                     <Music2 size={16} className="text-white/20" />
                   </div>

                   <div className="space-y-3">
                     {beats.length > 0 ? beats.map(beat => (
                       <div key={beat.id} className="group bg-white/5 border border-white/5 p-4 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => togglePlay(beat)}
                              className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white group-hover:bg-purple-600 transition-colors"
                            >
                              {playingBeatId === beat.id ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                            </button>
                            <div>
                              <p className="text-sm font-bold tracking-tight">{beat.title}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">{beat.genre || 'Beat'}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span className="text-[9px] font-bold text-gray-500 uppercase">{beat.status}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                               {new Date(beat.createdAt).toLocaleDateString()}
                             </p>
                          </div>
                       </div>
                     )) : (
                       <div className="text-center py-12 bg-white/[0.02] rounded-3xl border border-dashed border-white/5">
                         <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">No public transmissions detected</p>
                       </div>
                     )}
                   </div>
                </div>
              </>
            ) : (
              <div className="p-32 text-center">
                 <ShieldCheck size={48} className="mx-auto mb-4 text-red-500/40" />
                 <h4 className="text-lg font-black uppercase italic text-white/40">Profile Encrypted</h4>
                 <p className="text-xs text-gray-600 mt-2">Could not retrieve producer data.</p>
              </div>
            )}
          </div>

          <audio ref={audioRef} onEnded={() => setPlayingBeatId(null)} className="hidden" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
