import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Target, Users, User, Music, Flame, Plus, MessageSquare, Clock, Zap, Heart } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { AddBeatModal } from './AddBeatModal';

export const Header: React.FC = () => {
  const { profile } = useAuth();
  
  if (!profile) return null;

  return (
    <header className="flex items-center justify-between px-6 py-6 sm:py-8 transition-all duration-500">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div className="absolute inset-0 bg-white/20 blur-lg rounded-xl -z-10" />
        </div>
        <h1 className="text-xl font-black tracking-tighter text-white">
          Beat Streak
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
          <span className="text-purple-400 font-black tracking-tighter flex items-center gap-1.5 text-[10px]">
            <Zap size={14} className="fill-current" />
            Lvl {profile.level}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
          <span className="text-blue-400 font-black tracking-tighter flex items-center gap-1.5 text-[10px]">
            {profile.xp} XP
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full">
          <span className="text-orange-500 font-black tracking-tighter flex items-center gap-1.5 text-[10px]">
            <Flame className="w-4 h-4 fill-current" />
            {profile.streakCount}
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl border border-white/10 p-0.5 shadow-lg bg-gray-800 flex items-center justify-center overflow-hidden ml-2">
          {profile.photoURL ? (
            <img 
              src={profile.photoURL} 
              className="w-full h-full rounded-[10px] object-cover" 
              alt="Profile"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>
    </header>
  );
};

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onPlusClick: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, onPlusClick }) => {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'matcher', icon: Heart, label: 'Matcher' },
    { id: 'sessions', icon: Clock, label: 'History' },
    { id: 'plus', icon: Plus, label: 'Add', primary: true },
    { id: 'social', icon: Users, label: 'Friends' },
    { id: 'timer', icon: Zap, label: 'Session' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl px-4">
      <div className="bg-[#121214]/90 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-3 shadow-2xl flex flex-wrap justify-between items-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          if (tab.primary) {
            return (
              <button
                key={tab.id}
                onClick={onPlusClick}
                className="flex-none w-16 h-16 gradient-bg rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/30 active:scale-95 transition-transform mx-auto sm:mx-0"
              >
                <Plus size={28} strokeWidth={3} />
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`min-w-[62px] flex-1 sm:flex-none py-3 px-2 sm:px-3 flex flex-col items-center gap-1 transition-all duration-300 rounded-2xl ${
                isActive ? 'text-white bg-white/5 border border-white/10' : 'text-gray-400 hover:text-white/80'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : ''} />
              <span className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <motion.div
    whileHover={onClick ? { scale: 1.01 } : {}}
    whileTap={onClick ? { scale: 0.99 } : {}}
    onClick={onClick}
    className={`bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 shadow-xl ${className}`}
  >
    {children}
  </motion.div>
);


export const Layout: React.FC<{ children: React.ReactNode; activeTab: string; setActiveTab: (tab: string) => void }> = ({ children, activeTab, setActiveTab }) => {
  const [isAddBeatOpen, setIsAddBeatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 pb-24">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto">
        <Header />
        
        <main className="px-4 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3, ease: 'circOut' }}
              className="max-w-4xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} onPlusClick={() => setIsAddBeatOpen(true)} />
      <AddBeatModal isOpen={isAddBeatOpen} onClose={() => setIsAddBeatOpen(false)} />
    </div>
  );
};
