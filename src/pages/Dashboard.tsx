import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Flame, Zap, Clock, Music2, BrainCircuit, ChevronRight, MoreVertical, Play, Pause, Upload, Users, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { analyzeProductivity } from '../lib/gemini';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Beat } from '../types';
import { StreakRing } from '../components/StreakRing';
import { BeatUpload } from '../components/BeatUpload';

export const Dashboard: React.FC<{ setActiveTab?: (tab: string) => void }> = (props) => {
  const { user, profile } = useAuth();
  const [aiTip, setAiTip] = useState<string>('Ready to cook?');
  const [recentBeats, setRecentBeats] = useState<Beat[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [playingBeatId, setPlayingBeatId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const qBeats = query(
      collection(db, 'beats'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubBeats = onSnapshot(qBeats, (snapshot) => {
      setRecentBeats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Beat)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'beats');
    });

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const qSessions = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      where('startTime', '>=', startOfWeek.toISOString()),
      orderBy('startTime', 'desc')
    );
    const unsubSessions = onSnapshot(qSessions, (snapshot) => {
      setRecentSessions(snapshot.docs.map(doc => doc.data()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sessions');
    });

    return () => {
      unsubBeats();
      unsubSessions();
    };
  }, [user]);

  useEffect(() => {
    if (profile) {
      analyzeProductivity(profile.stats, profile.streakCount).then(setAiTip);
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = (beat: Beat, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!beat.audioUrl) {
      alert("No audio file attached to this beat.");
      return;
    }

    if (playingBeatId === beat.id) {
      audioRef.current?.pause();
      setPlayingBeatId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(beat.audioUrl);
      audioRef.current.play().catch(err => {
        console.error("Playback error:", err);
        alert("Failed to play audio. The link might be expired or restricted.");
      });
      setPlayingBeatId(beat.id);
      audioRef.current.onended = () => setPlayingBeatId(null);
    }
  };

  const isDayCompleted = (dateOffset: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - dateOffset);
    const dateStr = targetDate.toDateString();
    
    const hasSession = recentSessions.some(s => new Date(s.startTime).toDateString() === dateStr);
    const hasBeat = recentBeats.some(b => new Date(b.createdAt).toDateString() === dateStr);
    
    return hasSession || hasBeat;
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Central Streak Ring */}
      <section className="flex flex-col items-center">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-8">Current Streak</p>
        <div className="relative group">
           <div className="absolute inset-0 bg-orange-500/10 blur-[60px] rounded-full scale-150 animate-pulse" />
           <StreakRing streak={profile?.streakCount || 0} size={280} />
        </div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-sm font-bold text-gray-400 italic"
        >
          {profile?.streakCount === 0 ? "Log your first session and start your journey! 🎹" : "You're on fire! Keep the momentum! 🔥"}
        </motion.p>
      </section>

      {/* Streak Calendar */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Activity</h3>
          <button 
            onClick={() => props.setActiveTab?.('sessions')}
            className="text-[10px] font-black text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-colors"
          >
            View History
          </button>
        </div>
        <div className="flex justify-between">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => {
            const today = new Date();
            const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
            
            // Calculate how many days ago this day of week was
            let diff = currentDayIndex - i;
            if (diff < 0) diff += 7; // It was last week if it's "after" today in the week order
            
            const isCompleted = isDayCompleted(diff);
            const isToday = i === currentDayIndex;
            
            return (
              <div key={i} className="flex flex-col items-center gap-3">
                <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-purple-400 font-black' : 'text-gray-600'}`}>{d[0]}</span>
                <div className={`w-10 h-10 rounded-full border-2 transition-all duration-500 ${
                  isCompleted 
                    ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_15px_rgba(125,58,242,0.3)]' 
                    : isToday
                      ? 'border-white/20 bg-white/5 border-dashed animate-pulse'
                      : 'border-white/5 bg-white/[0.02]'
                } flex items-center justify-center`}>
                  {isCompleted && <Zap size={18} className="text-purple-400 fill-purple-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly Summary Report */}
      <section className="space-y-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Weekly Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-3xl p-6 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                <Clock size={24} className="text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Session Time</p>
                <p className="text-2xl font-black italic text-white">{recentSessions.reduce((total, s) => total + s.durationMinutes, 0)}m</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Total minutes this week</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-3xl p-6 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                <Music2 size={24} className="text-orange-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Beats Created</p>
                <p className="text-2xl font-black italic text-white">{recentBeats.length}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">New tracks this week</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-3xl p-6 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center">
                <Flame size={24} className="text-green-400" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Current Streak</p>
                <p className="text-2xl font-black italic text-white">{profile?.streakCount || 0}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Days in a row</p>
          </motion.div>
        </div>
      </section>

      {/* Community Features */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Community Fuel</h3>
            <p className="text-sm text-gray-300 mt-2 max-w-2xl">
              Boost your studio routine with collab challenges, shareable beat cards, and matchmaker momentum.
            </p>
          </div>
          <button
            onClick={() => props.setActiveTab?.('matcher')}
            className="px-5 py-3 gradient-bg rounded-3xl text-[10px] font-black uppercase tracking-widest text-white hover:scale-[1.02] transition-all"
          >
            Find a collab
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-300">
                <Sparkles size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Goal Driven</span>
            </div>
            <h4 className="text-lg font-black tracking-tight">Daily Creative Quests</h4>
            <p className="text-sm text-gray-400 mt-3">Stay motivated with bite-sized production tasks that help you finish more beats every day.</p>
            <div className="mt-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Top users keep streaks longer</div>
          </div>

          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-300">
                <Users size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Network</span>
            </div>
            <h4 className="text-lg font-black tracking-tight">Matchmaker Momentum</h4>
            <p className="text-sm text-gray-400 mt-3">Swipe, connect, and launch collaborations with new artists, producers, and engineers.</p>
            <div className="mt-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Use your genres and skill level to meet the right crew.</div>
          </div>

          <div className="bg-[#121214] border border-white/5 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-300">
                <Clock size={20} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Achievements</span>
            </div>
            <h4 className="text-lg font-black tracking-tight">Share Beat Stats</h4>
            <p className="text-sm text-gray-400 mt-3">Turn your workflow into shareable cards and show off your production streak, BPM ranges, and top beats.</p>
            <div className="mt-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Perfect for promos and artist bios.</div>
          </div>
        </div>
      </section>

      {/* Start Session CTA */}
      <section>
        <button 
          onClick={() => props.setActiveTab?.('timer')}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-3xl flex items-center justify-between group overflow-hidden relative"
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
              <Clock size={24} />
            </div>
            <div className="text-left font-black uppercase tracking-widest">
              <p className="text-[10px] text-white/60 mb-0.5">Ready to cook?</p>
              <p className="text-lg text-white">Start Session</p>
            </div>
          </div>
          <ChevronRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all relative z-10" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-16 -translate-y-16" />
        </button>
      </section>

      {/* Finish Beat CTA */}
      <section>
        <button 
          onClick={() => setIsUploadOpen(true)}
          className="w-full bg-white text-black p-6 rounded-3xl flex items-center justify-between group overflow-hidden relative shadow-2xl transition-all hover:scale-[1.02] active:scale-95"
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center text-black">
              <Upload size={24} />
            </div>
            <div className="text-left font-black uppercase tracking-widest">
              <p className="text-[10px] text-black/50 mb-0.5">Finished a heat?</p>
              <p className="text-lg text-black">Submit Beat</p>
            </div>
          </div>
          <ChevronRight className="text-black/30 group-hover:text-black group-hover:translate-x-1 transition-all relative z-10" />
        </button>
      </section>

      <BeatUpload isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />


      {/* Recent Beats */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Beats</h3>
          <button 
            onClick={() => props.setActiveTab?.('timer')}
            className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-white transition-colors"
          >
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {recentBeats.length > 0 ? recentBeats.map((beat) => (
            <div 
              key={beat.id} 
              onClick={(e) => togglePlay(beat, e)}
              className="group flex items-center justify-between bg-[#121214] border border-white/5 p-4 rounded-3xl hover:bg-white/[0.03] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${playingBeatId === beat.id ? 'gradient-bg text-white' : 'bg-white/5 text-purple-400 group-hover:gradient-bg group-hover:text-white'}`}>
                  {playingBeatId === beat.id ? (
                    <Pause size={20} className="fill-current" />
                  ) : (
                    <Play size={20} className="fill-current ml-1" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm tracking-tight">{beat.title}</h4>
                    {beat.audioUrl && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />}
                  </div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {beat.genre || 'Electronic'} • {beat.audioUrl ? 'Audio Attached' : 'Logged'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-gray-500">
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {new Date(beat.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) === new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) ? 'Today' : 'Recently'}
                </span>
                <MoreVertical size={16} />
              </div>
            </div>
          )) : (
            <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-600">
              <Music2 size={32} className="mb-4 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No beats tracked yet</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
