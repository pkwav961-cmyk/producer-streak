import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, X, ShieldAlert, CreditCard, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { GlassCard } from './UI';

export const ProPaywall: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSimulateUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { plan: 'pro' });
      if (updateProfile) {
        await updateProfile({ plan: 'pro' });
      }
      alert("🎉 Pro Plan successfully activated! Enjoy unlimited access to the entire studio.");
    } catch (err) {
      console.error(err);
      alert("Failed to activate plan simulation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const freeFeatures = [
    "Basic profile setup",
    "Limited matcher swipes",
    "Basic messaging with limits",
    "Upload beats/portfolio (50MB Limit)",
    "Standard profile views & search",
    "Limited analytics preview",
  ];

  const proFeatures = [
    "Unlimited matching & instant DMs",
    "Verified credits system access",
    "Spotify, Genius, SoundCloud data sync",
    "Full streaming & social analytics",
    "Boosted search & ranking priority",
    "Levels & leaderboard placement",
    "Priority support & early beta features",
  ];

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-purple-950/20 via-black to-black border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-hidden text-center">
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-widest">
            <Sparkles size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
            Premium Access Required
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text gradient-bg">
              Unlock Producer Streak Pro
            </h1>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-wider max-w-lg mx-auto leading-relaxed">
              Take your music networking to the next level. Connect with verified artists, search album credits, and automate your outreach.
            </p>
          </div>

          {/* Feature Grid Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left my-8">
            <GlassCard className="p-6 border border-white/5 bg-white/[0.01]">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 pb-2 border-b border-white/5">Free Plan</h3>
              <ul className="space-y-3">
                {freeFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-500">
                    <Check size={14} className="text-gray-600 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <GlassCard className="p-6 border border-purple-500/30 bg-purple-950/10 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-500/20">
                <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Pro Plan</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md">Best Value</span>
              </div>
              <ul className="space-y-3">
                {proFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-bold text-white">
                    <Check size={14} className="text-purple-400 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a 
              href="https://buy.stripe.com/00wcN4fpw9T62Fqd5kbAs0x"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <CreditCard size={16} />
              Upgrade to Pro
            </a>

            <button 
              disabled={loading}
              onClick={handleSimulateUpgrade}
              className="w-full sm:w-auto px-8 py-5 bg-purple-600 hover:bg-purple-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Verify Pro Status (Simulate checkout)
            </button>
          </div>

          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Secure processing by Stripe. Cancel anytime in your profile settings.
          </p>
        </div>
      </div>
    </div>
  );
};
