import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTimer } from '../lib/TimerContext';
import { formatTime } from '../lib/utils';
import { Play, Pause, Save, Trash2, Sliders, Mic, Layers, Music, AlertCircle } from 'lucide-react';
import { GlassCard } from '../components/UI';
import { Celebration } from '../components/Celebration';

export const TimerPage: React.FC = () => {
  const { 
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
  } = useTimer();

  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const types: Array<{id: any, label: string, icon: any}> = [
    { id: 'production', label: 'Produce', icon: Music },
    { id: 'mixing', label: 'Mix', icon: Sliders },
    { id: 'recording', label: 'Record', icon: Mic },
    { id: 'arrangement', label: 'Arrange', icon: Layers },
  ];

  return (
    <div className="space-y-8 pb-12">
      <Celebration show={showCelebration} />
      
      <div className="text-center">
        <h1 className="text-3xl font-black italic tracking-tighter uppercase">Studio Timer</h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Focus on the craft</p>
      </div>

      {pendingSession && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-600/10 border border-purple-500/30 p-6 rounded-[2rem] flex flex-col gap-4"
        >
          <div className="flex items-start gap-3">
             <AlertCircle className="text-purple-400 shrink-0" size={20} />
             <div>
                <p className="text-sm font-bold text-white uppercase italic">Incomplete Session Found</p>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">You have a session from {new Date(pendingSession.startTime).toLocaleTimeString()} with {pendingSession.durationMinutes}m logged.</p>
             </div>
          </div>
          <div className="flex gap-2">
             <button onClick={resumePendingSession} className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Resume</button>
             <button onClick={discardPendingSession} className="px-6 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest"><Trash2 size={14}/></button>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col items-center">
        <div className="relative mb-12">
          <div className={`w-72 h-72 rounded-full border-8 transition-all duration-700 flex items-center justify-center ${isActive ? 'border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-pulse' : 'border-white/5'}`}>
             <div className="text-center">
               <motion.p 
                 key={seconds}
                 initial={{ scale: 0.95 }}
                 animate={{ scale: 1 }}
                 className="text-6xl font-black font-mono tracking-tighter"
               >
                 {formatTime(seconds)}
               </motion.p>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-2">{isActive ? 'Recording...' : 'Paused'}</p>
             </div>
          </div>
          <div className="absolute inset-0 bg-purple-500/5 blur-[100px] rounded-full -z-10" />
        </div>

        <div className="flex gap-6 mb-12">
           <button 
             onClick={toggleTimer}
             className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl ${isActive ? 'bg-white/5 text-white border border-white/10' : 'gradient-bg text-white shadow-purple-500/20'}`}
           >
             {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
           </button>
           <button 
             onClick={() => setShowSaveConfirmation(true)}
             className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center active:scale-90 transition-all"
           >
             <Save size={32} />
           </button>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Session Type</h3>
        <div className="grid grid-cols-2 gap-4">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => setSessionType(t.id)}
              className={`p-6 rounded-[2rem] border transition-all flex items-center gap-4 ${sessionType === t.id ? 'bg-purple-600/10 border-purple-500/50 text-white' : 'bg-[#121214] border-white/5 text-gray-500'}`}
            >
              <div className={`p-3 rounded-2xl ${sessionType === t.id ? 'bg-purple-500 text-white' : 'bg-white/5'}`}>
                <t.icon size={20} />
              </div>
              <span className="font-black uppercase text-xs tracking-widest">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">Session Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What are we cooking up today? Key? BPM? Inspirations?"
          className="w-full bg-[#121214] border border-white/5 rounded-[2.5rem] p-8 text-sm focus:outline-none focus:border-purple-500/50 transition-all min-h-[160px] resize-none"
        />
      </div>

      {/* Save Confirmation Dialog */}
      {showSaveConfirmation && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowSaveConfirmation(false)}
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#121214] border border-white/10 rounded-[3rem] p-8 text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Save size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-black italic tracking-tighter uppercase mb-2">End Session?</h3>
            <p className="text-gray-400 text-sm mb-8">This will save your {formatTime(seconds)} session and update your streak.</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={async () => {
                  setShowSaveConfirmation(false);
                  await saveSession();
                  window.location.hash = '#beats';
                  setTimeout(() => window.dispatchEvent(new CustomEvent('open-add-beat')), 500);
                }}
                className="w-full py-4 gradient-bg text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
              >
                <Music size={16} /> Save & Upload Audio
              </button>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSaveConfirmation(false)}
                  className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    setShowSaveConfirmation(false);
                    await saveSession();
                  }}
                  className="flex-1 py-4 bg-white/10 border border-white/20 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                >
                  Save Only
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
