import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, TrendingUp, Star, Crown, Medal, Download } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { useAuth } from '../lib/AuthContext';
import { exportLeaderboardCard } from '../lib/canvasExporter';
import { VerifiedBadge } from '../components/VerifiedBadge';

export const Leaderboard: React.FC = () => {
  const { profile } = useAuth();
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
        const snap = await getDocs(q);
        const fetched = snap.docs
          .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
          .filter(u => u.displayName && u.displayName !== 'deleted' && !u.deleted && !['Producer', 'Guest Producer', 'Guest'].includes(u.displayName.trim()));
        setLeaders(fetched);
      } catch (err) {
        console.error("Failed to fetch leaderboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/20">
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter">Global Leaderboard</h1>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs mt-1 flex items-center gap-2">
              <TrendingUp size={12} className="text-yellow-500" />
              Top Producers by XP
            </p>
          </div>
        </div>

        {leaders.length > 0 && (
          <button 
            onClick={() => {
              const myRank = leaders.findIndex(u => u.uid === profile?.uid) + 1 || 1;
              const formattedRankings = leaders.map((u, idx) => ({
                displayName: u.displayName || 'Unknown Creator',
                xp: u.xp || 0,
                level: u.level || 1,
                rank: idx + 1
              }));
              exportLeaderboardCard(formattedRankings, profile?.displayName || 'Creator', myRank, profile?.profileVerifiedImage || profile?.photoURL || '');
            }}
            className="flex items-center gap-2 px-5 py-3 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 rounded-2xl text-xs font-black uppercase tracking-widest transition-all text-pink-300 animate-pulse hover:scale-105 shadow-xl shadow-pink-500/10"
          >
            <Download size={14} className="text-pink-400" />
            Share Rankings (PNG)
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-gray-500 font-black uppercase tracking-widest text-sm">Loading Rankings...</div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-black uppercase tracking-widest text-sm">No Producers Ranked Yet</div>
        ) : (
          leaders.map((user, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={user.uid} 
              className={`flex items-center gap-6 p-4 rounded-2xl border transition-all ${
                i === 0 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30' :
                i === 1 ? 'bg-gradient-to-r from-gray-300/10 to-transparent border-gray-300/30' :
                i === 2 ? 'bg-gradient-to-r from-amber-700/10 to-transparent border-amber-700/30' :
                'bg-white/5 border-white/5 hover:border-white/20'
              }`}
            >
              <div className="w-12 text-center">
                {i === 0 ? <Crown className="w-8 h-8 mx-auto text-yellow-500" /> :
                 i === 1 ? <Medal className="w-8 h-8 mx-auto text-gray-300" /> :
                 i === 2 ? <Medal className="w-8 h-8 mx-auto text-amber-700" /> :
                 <span className="text-2xl font-black text-gray-500">#{i + 1}</span>}
              </div>
              
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} className="w-14 h-14 rounded-full border-2 border-white/10" alt="" />
              
              <div className="flex-1">
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  {user.displayName}
                  {user.verifiedBadges?.includes('Verified Producer') && (
                    <VerifiedBadge size={16} />
                  )}
                </h3>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                  Level {user.level || 1} • {user.rankTitle || 'Beginner Producer'}
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-black text-purple-400">{user.xp?.toLocaleString() || 0}</div>
                <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total XP</div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
