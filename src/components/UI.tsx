import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Target, Users, User, Music, Flame, Plus, MessageSquare, Clock, Zap, Heart, Mail, Menu, X, Trophy, Star, Shield } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { AddBeatModal } from './AddBeatModal';

export const Header: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
  const { profile } = useAuth();
  
  if (!profile) return null;

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-6 sm:py-8 transition-all duration-500">
      <div className="flex items-center gap-2 sm:gap-3">
        {onMenuClick && (
          <button onClick={onMenuClick} className="sm:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-xl transition-colors">
            <Menu size={24} />
          </button>
        )}
        <div className="relative hidden sm:block">
          <img 
            src="https://i.postimg.cc/k44rqjNL/Chat-GPT-Image-May-16-2026-04-45-32-PM.png" 
            alt="Logo" 
            className="w-10 h-10 rounded-xl shadow-lg shadow-purple-500/20 object-cover" 
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-white">
          Beat Streak
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
          <span className="text-purple-400 font-black tracking-tighter flex items-center gap-1.5 text-[10px]">
            <Zap size={14} className="fill-current" />
            Lvl {profile.level}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
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
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border border-white/10 p-0.5 shadow-lg bg-gray-800 flex items-center justify-center overflow-hidden sm:ml-2">
          {profile.photoURL ? (
            <img 
              src={profile.photoURL} 
              className="w-full h-full rounded-lg sm:rounded-[10px] object-cover" 
              alt="Profile"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          )}
        </div>
        {/* Admin quick access if available */}
        {profile?.email && ['tapmadeit@gmail.com', 'prodbysean21@gmail.com','sanjosean96@gmail.com', 'pkwav961@gmail.com', 'visualsbn@gmail.com'].includes(profile.email.toLowerCase()) && (
          <button onClick={() => window.location.hash = '#admin'} className="hidden sm:block ml-3 px-3 py-1 rounded-xl bg-red-600 text-white text-xs font-bold">Admin</button>
        )}
      </div>
    </header>
  );
};

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onPlusClick: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, onPlusClick, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { profile, isAdmin } = useAuth();
  
  const isArtist = profile?.role === 'artist';
  const isEngineer = profile?.role === 'engineer';
  const beatsLabel = isArtist ? 'Songs' : isEngineer ? 'Mixes' : 'Beats';

  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'matcher', icon: Heart, label: 'Matcher' },
    { id: 'outreach', icon: Mail, label: 'Outreach' },
    { id: 'sessions', icon: Clock, label: 'History' },
    { id: 'verified', icon: Star, label: 'Verified' },
    { id: 'plus', icon: Plus, label: 'Add', primary: true },
    { id: 'leaderboard', icon: Trophy, label: 'Rankings' },
    { id: 'social', icon: Users, label: 'Friends' },
    { id: 'timer', icon: Zap, label: 'Session' },
    { id: 'beats', icon: Music, label: beatsLabel },
    { id: 'profile', icon: User, label: 'Profile' },
  ];



  return (
    <>
      {/* Desktop Bottom Navigation Bar */}
      <nav className="hidden sm:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl px-4">
        <div className="bg-[#121214]/90 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-3 shadow-2xl flex justify-between items-center gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            if (tab.primary) {
              return (
                <button
                  key={tab.id}
                  onClick={onPlusClick}
                  className="flex-none w-16 h-16 gradient-bg rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/30 active:scale-95 transition-transform shrink-0 mx-1"
                >
                  <Plus size={28} strokeWidth={3} />
                </button>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 min-w-[62px] py-3 px-3 flex flex-col items-center gap-1 transition-all duration-300 rounded-2xl ${
                  isActive ? 'text-white bg-white/10 border border-white/10' : 'text-gray-400 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : ''} />
                <span className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Floating Controls */}
      <div className="sm:hidden">
        {/* Plus Button (Bottom Right) */}
        <button 
          onClick={onPlusClick}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 gradient-bg rounded-full flex items-center justify-center text-white shadow-xl shadow-purple-500/30 active:scale-95 transition-transform"
        >
          <Plus size={28} strokeWidth={3} />
        </button>

        {/* Slide-out Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
              />
              {/* Drawer Content */}
              <motion.div 
                initial={{ x: '-100%' }} 
                animate={{ x: 0 }} 
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#09090a] border-r border-white/10 z-[101] p-6 flex flex-col shadow-2xl"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://i.postimg.cc/k44rqjNL/Chat-GPT-Image-May-16-2026-04-45-32-PM.png" 
                      alt="Logo" 
                      className="w-8 h-8 rounded-lg shadow-lg shadow-purple-500/20 object-cover" 
                    />
                    <h2 className="text-xl font-black tracking-tighter text-white">Menu</h2>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pb-12">
                  {tabs.map((tab) => {
                    if (tab.primary) return null;
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-4 px-4 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-colors text-left ${
                          isActive ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                        }`}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    const handleOpen = () => setIsAddBeatOpen(true);
    window.addEventListener('open-add-beat', handleOpen);
    return () => window.removeEventListener('open-add-beat', handleOpen);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 pb-24">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        
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

      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onPlusClick={() => setIsAddBeatOpen(true)} 
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />
      <AddBeatModal isOpen={isAddBeatOpen} onClose={() => setIsAddBeatOpen(false)} />
    </div>
  );
};
