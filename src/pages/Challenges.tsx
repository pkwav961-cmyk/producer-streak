import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../components/UI';
import { Trophy, Clock, Zap, Star, Music2, ChevronRight, Award, Users, CheckCircle2, Activity, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, where, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { Challenge, UserChallenge, OperationType } from '../types';

export const ChallengesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const simulateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const qChallenges = query(collection(db, 'challenges'));
    const unsubscribeChallenges = onSnapshot(qChallenges, (snapshot) => {
      const challengesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge));
      setChallenges(challengesData);
      
      if (challengesData.length === 0) {
        seedChallenges();
      }
    });

    const qUserChallenges = query(collection(db, 'userChallenges'), where('userId', '==', user.uid));
    const unsubscribeUserChallenges = onSnapshot(qUserChallenges, (snapshot) => {
      const userChallengesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserChallenge));
      setUserChallenges(userChallengesData);
      setLoading(false);
    });

    simulateIntervalRef.current = setInterval(async () => {
      const communityChallenge = challengesDataRef.current.find(c => c.type === 'community');
      if (communityChallenge && communityChallenge.currentGlobalValue !== undefined && communityChallenge.currentGlobalValue < communityChallenge.targetValue) {
        try {
          if (Math.random() > 0.8) {
            const challengeRef = doc(db, 'challenges', communityChallenge.id);
            await updateDoc(challengeRef, {
              currentGlobalValue: increment(Math.floor(Math.random() * 3) + 1),
              participantsCount: increment(Math.floor(Math.random() * 5))
            });
          }
        } catch (error) {
        }
      }
    }, 12000);

    return () => {
      unsubscribeChallenges();
      unsubscribeUserChallenges();
      if (simulateIntervalRef.current) clearInterval(simulateIntervalRef.current);
    };
  }, [user]);

  const challengesDataRef = useRef<Challenge[]>([]);
  useEffect(() => {
    challengesDataRef.current = challenges;
  }, [challenges]);

  const seedChallenges = async () => {
    const initialChallenges = [
      {
        title: 'Daily Heat',
        description: 'Complete 1 production session today.',
        type: 'daily',
        rewardXP: 10,
        targetValue: 1,
        participantsCount: 1240,
        expiresAt: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
        iconName: 'Zap'
      },
      {
        title: 'Weekly Grind',
        description: 'Log 5 total hours in the studio this week.',
        type: 'weekly',
        rewardXP: 50,
        targetValue: 300, 
        participantsCount: 5820,
        expiresAt: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString(),
        iconName: 'Clock'
      },
      {
        title: 'Community Beat Wave',
        description: 'Collectively produce 1,000 beats as a community.',
        type: 'community',
        rewardXP: 100,
        targetValue: 1000,
        currentGlobalValue: 425,
        participantsCount: 12400,
        expiresAt: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(),
        iconName: 'Music2'
      }
    ];

    try {
      const batch = writeBatch(db);
      initialChallenges.forEach(c => {
        const ref = doc(collection(db, 'challenges'));
        batch.set(ref, c);
      });
      await batch.commit();
    } catch (error) {
      console.error('Error seeding challenges:', error);
    }
  };

  const claimReward = async (challenge: Challenge, userChallenge: UserChallenge) => {
    if (!user || !profile || userChallenge.claimed) return;
    setClaimingId(challenge.id);

    try {
      const batch = writeBatch(db);
      const ucRef = doc(db, 'userChallenges', userChallenge.id);
      batch.update(ucRef, { claimed: true, updatedAt: serverTimestamp() });
      const userRef = doc(db, 'users', user.uid);
      const newXp = profile.xp + challenge.rewardXP;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
      batch.update(userRef, { 
        xp: newXp,
        level: newLevel
      });
      await batch.commit();
      setClaimingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userChallenges');
    }
  };

  if (loading) return <div className="flex items-center justify-center p-20 animate-pulse text-gray-500 uppercase font-black text-xs tracking-widest">Initialising Missions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Producer Missions</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Status: Operational</p>
        </div>
        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-purple-500 glow-purple">
          <Trophy size={20} fill="currentColor" fillOpacity={0.2} />
        </div>
      </div>

      {challenges.filter(c => c.type === 'community').map(challenge => {
        const progressPercent = ((challenge.currentGlobalValue || 0) / challenge.targetValue) * 100;
        return (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.01 }}
            className="relative h-80 rounded-[3rem] overflow-hidden group cursor-pointer shadow-2xl border border-white/10"
          >
            <motion.div 
              animate={{ 
                background: [
                  'linear-gradient(to bottom right, #9333ea, #4f46e5, #2563eb)',
                  'linear-gradient(to bottom right, #7c3aed, #4338ca, #1d4ed8)',
                  'linear-gradient(to bottom right, #9333ea, #4f46e5, #2563eb)'
                ]
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute inset-0" 
            />
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <div className="absolute top-[-10%] right-[-5%] opacity-15 rotate-12 scale-150 text-white">
              <Music2 size={180} />
            </div>
            <div className="absolute bottom-[-5%] left-[10%] opacity-10 -rotate-12 text-white">
              <Zap size={100} />
            </div>
            <div className="absolute inset-0 p-10 flex flex-col justify-end">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-xl rounded-full border border-white/20">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_#4ade80]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Live Event</span>
                </div>
                <div className="px-3 py-1.5 bg-black/20 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-2">
                  <Activity size={12} className="text-purple-300" />
                  <span className="text-[10px] font-black uppercase text-purple-200 tracking-widest">+{(challenge.rewardXP).toLocaleString()} XP Pool</span>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-8 items-end">
                <div>
                  <h2 className="text-4xl font-black mb-3 text-white uppercase italic tracking-tighter leading-none group-hover:translate-x-1 transition-transform">
                    {challenge.title}
                  </h2>
                  <p className="text-white/80 text-sm mb-0 max-w-sm font-medium leading-relaxed">
                    {challenge.description}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end text-white">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 opacity-80">
                        <TrendingUp size={12} className="text-white" />
                        Community Momentum
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tighter">{(challenge.currentGlobalValue || 0).toLocaleString()}</span>
                        <span className="text-xs font-bold text-white/60 uppercase">/ {challenge.targetValue.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black uppercase text-white/60 mb-1 tracking-widest flex items-center justify-end gap-1">
                         <Users size={10} /> Joined
                       </p>
                       <p className="text-sm font-black italic">{(challenge.participantsCount).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="w-full h-4 bg-black/30 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, progressPercent)}%` }}
                        transition={{ type: "spring", stiffness: 50, damping: 20 }}
                        className="h-full bg-white relative"
                      >
                        <motion.div 
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      <div className="space-y-4">
        {challenges.filter(c => c.type !== 'community').map((challenge) => {
          const userProgress = userChallenges.find(uc => uc.challengeId === challenge.id);
          const isCompleted = userProgress?.completed || (userProgress?.currentValue || 0) >= challenge.targetValue;
          const isClaimed = userProgress?.claimed;
          const progressPercent = Math.min(100, ((userProgress?.currentValue || 0) / challenge.targetValue) * 100);

          return (
            <GlassCard key={challenge.id} className="relative group overflow-hidden border-white/5">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-5 w-full">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    challenge.type === 'daily' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>
                    {challenge.iconName === 'Zap' ? <Zap size={28} /> : <Clock size={28} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-lg uppercase tracking-tight">{challenge.title}</h4>
                      <p className="text-[10px] font-black text-purple-400 uppercase">+{challenge.rewardXP} XP</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-md">{challenge.description}</p>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                        <span className="text-gray-500">Progress</span>
                        <span className={isCompleted ? 'text-green-500' : 'text-gray-400'}>
                          {userProgress?.currentValue || 0} / {challenge.targetValue}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          className={`h-full ${isCompleted ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-purple-500'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  {isCompleted && !isClaimed ? (
                    <button
                      onClick={() => claimReward(challenge, userProgress!)}
                      disabled={claimingId === challenge.id}
                      className="whitespace-nowrap px-4 py-2 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-purple-500/20 hover:scale-105 transition-all disabled:opacity-50"
                    >
                      {claimingId === challenge.id ? 'Claiming...' : 'Claim Reward'}
                    </button>
                  ) : isClaimed ? (
                    <div className="text-green-500">
                      <CheckCircle2 size={24} />
                    </div>
                  ) : (
                    <ChevronRight size={20} className="text-gray-700" />
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};
