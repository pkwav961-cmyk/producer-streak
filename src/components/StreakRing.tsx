import React from 'react';
import { motion } from 'motion/react';

interface StreakRingProps {
  streak: number;
  size?: number;
}

export const StreakRing: React.FC<StreakRingProps> = ({ streak, size = 200 }) => {
  const radius = size / 2.5;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (0.75 * circumference); // Fixed 75% for aesthetic ring

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        height={size}
        width={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          stroke="rgba(255, 255, 255, 0.05)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Gradient stroke */}
        <defs>
          <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7D3AF2" />
            <stop offset="50%" stopColor="#E14182" />
            <stop offset="100%" stopColor="#F57B3F" />
          </linearGradient>
        </defs>
        <motion.circle
          stroke="url(#streakGradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      
      <div className="absolute flex flex-col items-center justify-center">
        <motion.span 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-6xl font-black tracking-tighter"
        >
          {streak}
        </motion.span>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Days</span>
      </div>
    </div>
  );
};
