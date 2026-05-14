import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, CheckCircle2, Trophy, Music, Clock, Flame, ChevronDown } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { UserGoal, OperationType } from '../types';
import { ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

const chartData = [ { day: 1, beats: 1 }, { day: 2, beats: 3 }, { day: 3, beats: 2 }, { day: 4, beats: 5 }, { day: 5, beats: 4 }, { day: 6, beats: 7 }, { day: 7, beats: 6 } ];
const genreData = [ { name: 'Trap', value: 40, color: '#7D3AF2' }, { name: 'Lo-Fi', value: 30, color: '#E14182' }, { name: 'RnB', value: 20, color: '#F57B3F' }, { name: 'Other', value: 10, color: '#FFFFFF' } ];

export const GoalsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [goals, setGoals] = useState<UserGoal[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserGoal)));
    }, error => handleFirestoreError(error, OperationType.LIST, 'goals'));
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Stats</h1>
        <button className="flex items-center gap-2 bg-[#121214] border border-white/5 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
          This Month
          <ChevronDown size={14} className="text-gray-500" />
        </button>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Beats Made</p>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-black">{profile?.stats.totalBeats || 48}</h2>
            <span className="text-[10px] font-bold text-green-400 mb-1.5">+32% vs last month</span>
          </div>
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Bar dataKey="beats" radius={[4, 4, 0, 0]}>
                 {chartData.map((_, i) => <Cell key={`cell-${i}`} fill={i === chartData.length - 1 ? '#F57B3F' : 'rgba(125,58,242,0.3)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 space-y-3">
          <Flame className="text-orange-500 fill-orange-500" size={24} />
          <div>
            <h3 className="text-2xl font-black">{profile?.streakCount || 0}</h3>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Longest Streak</p>
          </div>
        </div>
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 space-y-3">
           <Clock className="text-purple-500" size={24} />
           <div>
             <h3 className="text-2xl font-black">{profile?.stats.totalHours || 0}h</h3>
             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Time Spent</p>
           </div>
        </div>
      </div>

      <section className="space-y-6">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Top Genres</h3>
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-8">
           <div className="flex items-center gap-12">
             <div className="w-32 h-32">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={genreData} cx="50%" cy="50%" innerRadius={45} outerRadius={60} paddingAngle={5} dataKey="value">
                     {genreData.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} stroke="none" />)}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="flex-1 space-y-3">
               {genreData.map((item, i) => (
                 <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                     <span className="text-xs font-bold text-gray-300">{item.name}</span>
                   </div>
                   <span className="text-xs font-black">{item.value}%</span>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Missions</h3>
          <Target size={16} className="text-gray-600" />
        </div>
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {goals.map((goal) => {
              const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);
              const isCompleted = goal.completed || goal.currentValue >= goal.targetValue;
              return (
                <motion.div key={goal.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#121214] border border-white/5 rounded-[2rem] p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        {isCompleted ? <CheckCircle2 size={20} /> : <Music size={20} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black tracking-tight">{goal.title}</h4>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{goal.period} mission</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black"><span className="text-white">{goal.currentValue}</span>/{goal.targetValue}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div className={`h-full ${isCompleted ? 'bg-green-500' : 'bg-purple-500'}`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  {isCompleted && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 p-1.5 bg-green-500 rounded-full text-black">
                      <Trophy size={12} />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};
