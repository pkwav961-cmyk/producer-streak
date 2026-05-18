import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Check, Mail, Lock, ChevronDown, ChevronUp, Star, X, Sliders, ShieldCheck } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuthForms } from '../components/auth/AuthForms';
import { sendNewsletterSignupEmail } from '../lib/email';
import { sendWaitingListAdminEmail } from '../lib/adminEmails';

import { useAuth } from '../lib/AuthContext';
import { ContactModal } from '../components/ContactModal';

interface LandingProps {
  onEnterApp: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onEnterApp }) => {
  const { user, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showLogin, setShowLogin] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showContact, setShowContact] = useState(false);

  React.useEffect(() => {
    const hasEarlyAccess = user && isAdmin;
    if (showLogin && user && hasEarlyAccess) {
      onEnterApp();
    }
  }, [showLogin, user, isAdmin, onEnterApp]);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      // 1. Save to Firestore waitingList collection
      await addDoc(collection(db, 'waitingList'), {
        email,
        createdAt: serverTimestamp(),
      });

      // 2. Send email via Resend API using the robust, multi-proxy newsletter helper!
      await sendNewsletterSignupEmail(email);

      // 3. Notify admins about the new waitlist signup
      sendWaitingListAdminEmail(email).catch(console.error);

      setStatus('success');
      setEmail('');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-[#050505] p-6 flex flex-col">
        <button onClick={() => setShowLogin(false)} className="text-white/40 hover:text-white font-bold text-xs uppercase tracking-widest mb-8 text-left w-max">
          &larr; Back to Waitlist
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-black uppercase text-center mb-6">Admin Access</h2>
            <AuthForms />
          </div>
        </div>
      </div>
    );
  }

  const faqs = [
    { q: "What is Beat Streak?", a: "Beat Streak is a daily habit tracker and networking platform specifically for music producers to build consistency." },
    { q: "When will the app launch?", a: "We are opening our doors on June 22, 2026. Join the waitlist to secure your spot." },
    { q: "How does the Smart Outreach work?", a: "Our Smart Outreach tool connects to industry databases to find producer credits and helps you draft personalized AI DMs." },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.postimg.cc/k44rqjNL/Chat-GPT-Image-May-16-2026-04-45-32-PM.png" 
              alt="Logo" 
              className="w-8 h-8 rounded-lg shadow-lg shadow-purple-500/20 object-cover" 
            />
            <span className="text-xl font-black uppercase tracking-widest">Beat Streak</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            {user && isAdmin ? (
              <button 
                onClick={onEnterApp}
                className="px-6 py-2.5 gradient-bg rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-purple-500/20 active:scale-95"
              >
                Enter Studio
              </button>
            ) : (
              <>
                <button onClick={() => setShowLogin(true)} className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">
                  Login
                </button>
                <a href="#join" className="hidden md:block px-6 py-2.5 gradient-bg rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform">
                  Join Waitlist
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="features" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 z-10">
            <h1 className="text-6xl md:text-8xl font-black uppercase leading-[0.9] tracking-tighter">
              Make Beats.<br />
              <span className="text-transparent bg-clip-text gradient-bg">Keep the Streak.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-lg leading-relaxed">
              Beat Streak helps you stay consistent, track your progress, and build your legacy—one beat at a time. Get placements faster with AI outreach.
            </p>

            <form onSubmit={handleJoinWaitlist} id="join" className="relative max-w-md flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" 
                  className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <button 
                type="submit" 
                disabled={status === 'loading' || status === 'success'}
                className="gradient-bg px-8 py-4 rounded-full text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 whitespace-nowrap"
              >
                {status === 'loading' ? 'Joining...' : status === 'success' ? 'Joined!' : 'Join the Waitlist'}
              </button>
            </form>
            {status === 'success' && <p className="text-green-400 text-sm font-bold uppercase tracking-widest">You're on the list! Check your email.</p>}
            {status === 'error' && <p className="text-red-400 text-sm font-bold uppercase tracking-widest">Failed to join. Please try again.</p>}

            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-500">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#050505]" />)}
              </div>
              <span>Join 1,200+ producers on the waitlist</span>
            </div>

            {/* Premium Download Badges */}
            <div className="pt-6 border-t border-white/5 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Available on Launch Day</p>
              <div className="flex flex-wrap gap-3">
                {/* Apple App Store */}
                <a 
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert("Mobile App is currently in final App Store review. Instant access opens on June 22!"); }}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-6" />
                </a>
                
                {/* Google Play Store */}
                <a 
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert("Android Build is compiled & staged on Play Store. Access opens on June 22!"); }}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-6" />
                </a>

                {/* Microsoft Store */}
                <a 
                  href="#"
                  onClick={(e) => { e.preventDefault(); alert("Microsoft Store Desktop package ready. Setup opens on June 22!"); }}
                  className="flex items-center gap-3 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#0078d4]" viewBox="0 0 23 23" fill="currentColor">
                      <path d="M0 0h11v11H0zM12 0h11v11H12zM0 12h11v11H0zM12 12h11v11H12z"/>
                    </svg>
                    <div className="text-left">
                      <p className="text-[6px] text-gray-400 font-bold uppercase leading-none">Get it from</p>
                      <p className="text-xs text-white font-black uppercase leading-none mt-0.5">Microsoft</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="relative h-[600px] w-full hidden lg:block">
            {/* Mockup visual representation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[600px] bg-[#121214] rounded-[3rem] border-[8px] border-white/10 shadow-2xl overflow-hidden rotate-[-5deg]">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Flame className="text-purple-500" size={20} />
                  <span className="font-black uppercase">My Streak</span>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-7xl font-black text-purple-400">27</h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Days</p>
                </div>
                <div className="flex justify-between px-2">
                  {['M','T','W','T','F'].map((d, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <Check size={14} />
                    </div>
                  ))}
                </div>
                <div className="space-y-3 pt-6 border-t border-white/10">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 bg-white/5 rounded-2xl flex items-center px-4 gap-3">
                      <div className="w-10 h-10 rounded-xl gradient-bg" />
                      <div className="space-y-1">
                        <div className="w-24 h-3 bg-white/20 rounded-full" />
                        <div className="w-16 h-2 bg-white/10 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-[#0a0a0a] px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Choose Your Path</h2>
            <p className="text-gray-400 uppercase tracking-widest text-sm font-bold">Get placements faster with AI outreach.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="bg-[#121214] border border-white/10 rounded-[3rem] p-8 space-y-8 hover:border-white/20 transition-colors">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-widest mb-2">Free</h3>
                <div className="text-5xl font-black">€0<span className="text-lg text-gray-500">/month</span></div>
              </div>
              <ul className="space-y-4 text-sm font-bold text-gray-300">
                <li className="flex items-center gap-3"><Check className="text-green-400" size={20} /> Create profile</li>
                <li className="flex items-center gap-3"><Check className="text-green-400" size={20} /> Upload beats/snippets</li>
                <li className="flex items-center gap-3"><Check className="text-green-400" size={20} /> Limited producer search</li>
                <li className="flex items-center gap-3"><Check className="text-green-400" size={20} /> Daily streak system</li>
                <li className="flex items-center gap-3 text-gray-500"><Lock size={16} /> 5 AI DMs/day</li>
                <li className="flex items-center gap-3 text-gray-500"><Lock size={16} /> 10 profile views/day</li>
              </ul>
              <button className="w-full py-4 bg-white/5 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/10 transition-colors">Current Plan</button>
            </div>

            {/* Pro Tier */}
            <div className="gradient-bg p-[2px] rounded-[3rem]">
              <div className="bg-[#121214] rounded-[calc(3rem-2px)] p-8 space-y-8 h-full relative">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-purple-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <Star size={12} fill="currentColor" /> Most Popular
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-widest mb-2 text-purple-400">Pro</h3>
                  <div className="text-5xl font-black">€1.99<span className="text-lg text-gray-500">/month</span></div>
                </div>
                <ul className="space-y-4 text-sm font-bold text-white">
                  <li className="flex items-center gap-3"><Check className="text-purple-400" size={20} /> Unlimited AI outreach DMs</li>
                  <li className="flex items-center gap-3"><Check className="text-purple-400" size={20} /> Bulk DM sending</li>
                  <li className="flex items-center gap-3"><Check className="text-purple-400" size={20} /> Advanced producer search</li>
                  <li className="flex items-center gap-3"><Check className="text-purple-400" size={20} /> Unlimited matches & chats</li>
                  <li className="flex items-center gap-3"><Check className="text-purple-400" size={20} /> Verified badge</li>
                  <li className="flex items-center gap-3"><Check className="text-purple-400" size={20} /> Priority placement in matcher</li>
                </ul>
                <a 
                  href="https://buy.stripe.com/00wcN4fpw9T62Fqd5kbAs0x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 gradient-bg rounded-full font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-xl shadow-purple-500/20 text-center block"
                >
                  Upgrade to Pro
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-center mb-12">FAQ</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button 
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between font-bold"
              >
                {faq.q}
                {openFaq === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {openFaq === index && (
                <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 text-center space-y-4">
        <div className="flex justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-500 flex-wrap items-center">
          <button onClick={() => setShowAbout(true)} className="hover:text-white transition-colors cursor-pointer">
            About Producer Streak
          </button>
          <span>•</span>
          <button onClick={() => setShowContact(true)} className="hover:text-white transition-colors cursor-pointer">
            Contact Support
          </button>
          <span>•</span>
          <a 
            href="https://discord.gg/7FcRFvRKB8" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 127.14 96.36">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5A51.69,51.69,0,0,0,30,78.89a75.76,75.76,0,0,0,67.15,0,51.69,51.69,0,0,0,1.86,1.65,68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C129,50.7,122.64,27.78,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z"/>
            </svg>
            Join Discord
          </a>
          <span>•</span>
          <button onClick={() => setShowTerms(true)} className="hover:text-white transition-colors cursor-pointer">
            Terms & Conditions
          </button>
        </div>
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">&copy; 2026 Producer Streak. All rights reserved.</p>
      </footer>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" onClick={() => setShowAbout(false)}>
          <div className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[3rem] p-8 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 gradient-bg" />
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight italic text-transparent bg-clip-text gradient-bg">About Producer Streak</h3>
              <button onClick={() => setShowAbout(false)} className="p-2 text-gray-500 hover:text-white transition-all"><X size={20} /></button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-sm text-gray-300 leading-relaxed text-left">
              <p className="font-black text-white text-base">Producer Streak is a music networking platform for producers, artists, and engineers.</p>
              <p>Built to help creators connect faster, share work, and get real opportunities in the music industry.</p>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-start gap-3">
                <span className="text-xl">🔥</span>
                <p className="text-xs text-purple-300 font-bold uppercase tracking-wide leading-relaxed">
                  Built by a 13 year old producer, Staz EQ, who understands the problems upcoming creators face when trying to get noticed.
                </p>
              </div>
              <p>Producer Streak focuses on real connections, verified credits, and music data that actually matters.</p>
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Key Features</p>
                <ul className="space-y-1 text-xs list-disc list-inside text-gray-400">
                  <li>Producer, artist, and engineer matching</li>
                  <li>Verified credits system</li>
                  <li>Streaming and social analytics</li>
                  <li>Producer levels and leaderboards</li>
                  <li>Direct networking tools</li>
                </ul>
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-purple-400 pt-4">Built for the next generation of music creators.</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md" onClick={() => setShowTerms(false)}>
          <div className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[3rem] p-8 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1 gradient-bg" />
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight italic text-transparent bg-clip-text gradient-bg">Terms & Conditions</h3>
              <button onClick={() => setShowTerms(false)} className="p-2 text-gray-500 hover:text-white transition-all"><X size={20} /></button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-xs text-gray-400 leading-relaxed uppercase tracking-wider font-bold text-left">
              <p className="text-white font-black text-sm">1. ACCEPTANCE OF TERMS</p>
              <p>BY CREATING AN ACCOUNT ON PRODUCER STREAK, YOU AGREE TO THESE TERMS. WE RESERVE THE RIGHT TO MODIFY THESE TERMS AT ANY TIME.</p>
              
              <p className="text-white font-black text-sm">2. ELIGIBILITY & USER ACCOUNT</p>
              <p>YOU MUST AGREE TO PROVIDE ACCURATE WORK CREDITS AND PROFILE DATA. FRAUDULENT USE OF VERIFIED BADGES OR MISREPRESENTING GENIUS CREDITS WILL RESULT IN TEMPORARY OR PERMANENT TERMINATION.</p>

              <p className="text-white font-black text-sm">3. UPLOADS & INTELLECTUAL PROPERTY</p>
              <p>YOU RETAIN ALL INTELLECTUAL PROPERTY RIGHTS TO THE BEATS AND AUDIO FILES UPLOADED. BY UPLOADING, YOU GRANT PRODUCER STREAK A LIMITED LICENSE TO STREAM AND HOST YOUR FILES FOR MATCHING PURPOSES ONLY.</p>

              <p className="text-white font-black text-sm">4. COMMUNITY CONDUCT & MATCHING</p>
              <p>SPAM SWIPING, HARASSMENT, AND UNSOLICITED OFF-TOPIC SPAM DMs ARE STRICTLY PROHIBITED. VIOLATORS WILL LOSE THEIR MATCHING SHIELDS AND PRIVILEGES.</p>
            </div>
          </div>
        </div>
      )}
      {/* Contact Modal */}
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />
    </div>
  );
};
