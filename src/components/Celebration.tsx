import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Zap, Flame } from 'lucide-react';

interface CelebrationProps {
  show: boolean;
}

export const Celebration: React.FC<CelebrationProps> = ({ show }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Confetti Particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0,
                rotate: 0 
              }}
              animate={{ 
                x: (Math.random() - 0.5) * 800, 
                y: (Math.random() - 0.5) * 800, 
                scale: [0, 1, 0.5, 0],
                rotate: Math.random() * 360,
                opacity: [0, 1, 1, 0]
              }}
              transition={{ 
                duration: 2 + Math.random() * 2, 
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: Math.random()
              }}
              className="absolute"
            >
              {i % 4 === 0 ? <Zap className="text-yellow-400" size={24} /> :
               i % 4 === 1 ? <Star className="text-purple-400" size={20} /> :
               i % 4 === 2 ? <Flame className="text-orange-500" size={22} /> :
               <Trophy className="text-[#F57B3F]" size={20} />}
            </motion.div>
          ))}

          {/* Center Message */}
          <motion.div
            initial={{ scale: 0, y: 100 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: -100 }}
            transition={{ type: "spring", damping: 12 }}
            className="bg-[#121214]/90 backdrop-blur-xl border border-white/10 p-12 rounded-[4rem] text-center shadow-2xl relative shadow-purple-500/20"
          >
            <div className="absolute inset-0 bg-purple-500/10 blur-3xl rounded-full" />
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mb-6 flex justify-center"
            >
              <div className="p-6 bg-purple-500/20 rounded-3xl text-purple-400">
                <Trophy size={64} fill="currentColor" fillOpacity={0.2} />
              </div>
            </motion.div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Great Session!</h2>
            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Streak Increased +1</p>
            <p className="text-purple-500 font-black mt-4 text-sm uppercase tracking-widest">+50 XP Earned</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
