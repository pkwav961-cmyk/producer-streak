import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { Camera, ChevronRight, Music, Mic, SlidersHorizontal, Loader2, ArrowRight } from 'lucide-react';
import { sendWelcomeEmail, sendAdminNewUserEmail } from '../lib/email';

interface OnboardingProps {
  onComplete: () => void;
  onBackToLogin?: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onBackToLogin }) => {
  const { user, profile, updateProfile, signUpWithEmail } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(profile?.displayName || '');
  const [email, setEmail] = useState(profile?.email || user?.email || '');
  const [password, setPassword] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.photoURL || null);
  const [roles, setRoles] = useState<('producer' | 'artist' | 'engineer')[]>(profile?.roles || ['producer']);
  const [city, setCity] = useState(profile?.city || '');
  const [genres, setGenres] = useState<string>(profile?.genres?.join(', ') || '');
  const [daw, setDaw] = useState<string>(profile?.daw?.join(', ') || '');

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (uid: string): Promise<string | null> => {
    if (!photoFile) return null;
    const safeName = `${uid}-${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(safeName, photoFile, { upsert: true, contentType: photoFile.type || 'image/jpeg' });

    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('avatars').getPublicUrl(safeName);
    return data.publicUrl;
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);
    try {
      let activeUser = user;

      // 1. If user is not logged in, execute sign up first
      if (!activeUser) {
        if (!email.trim() || !password || password.length < 6) {
          throw new Error("A valid email and a password of at least 6 characters are required.");
        }
        await signUpWithEmail(email, password, name);
        
        // Fetch current authenticated user directly from firebase
        const { auth } = await import('../lib/firebase');
        activeUser = auth.currentUser;
      }

      if (!activeUser) {
        throw new Error("Failed to authenticate session.");
      }

      // 2. Upload photo with correct UID
      let photoURL = profile?.photoURL || '';
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(activeUser.uid);
        if (uploadedUrl) photoURL = uploadedUrl;
      }

      // 3. Update the newly created or existing profile
      await updateProfile({
        displayName: name,
        photoURL,
        role: roles[0] || 'producer',
        roles: roles,
        city,
        genres: genres.split(',').map(g => g.trim()).filter(Boolean),
        daw: daw.split(',').map(d => d.trim()).filter(Boolean),
        onboardingComplete: true
      });

      // 4. Send Welcome & Admin Notification Emails
      if (activeUser.email) {
        sendWelcomeEmail(activeUser.email, name, roles).catch(console.error);
        sendAdminNewUserEmail({
          email: activeUser.email,
          displayName: name,
          country: city || 'Unknown',
          roles,
          genres: genres.split(',').map(g => g.trim()).filter(Boolean)
        }).catch(console.error);
      }
      
      onComplete();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center p-6 overflow-y-auto">
      {/* Background Accents */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-purple-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-blue-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-lg relative z-10 py-12">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" className="bg-[#121214] border border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl flex flex-col gap-8">
              <div className="text-center space-y-2">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase animate-pulse">
                  What's your name?
                </h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                  Create your profile and secure your login credentials below
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Artist/Producer Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your Artist/Producer Name"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500 outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="host@studio.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500 outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Security Key (Password)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="•••••••• (Min. 6 characters)"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500 outline-none transition-all font-bold"
                  />
                </div>
              </div>

              <button 
                disabled={!name.trim() || !email.trim() || password.length < 6}
                onClick={() => setStep(2)}
                className="w-full py-5 gradient-bg text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 text-xs animate-pulse"
              >
                Continue <ArrowRight size={16} />
              </button>

              {onBackToLogin && (
                <div className="text-center pt-2">
                  <button 
                    type="button"
                    onClick={async () => {
                      if (user) {
                        const { auth } = await import('../lib/firebase');
                        await auth.signOut();
                      }
                      onBackToLogin();
                    }}
                    className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors hover:underline decoration-purple-500 underline-offset-4"
                  >
                    Already have an account? Login
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" className="bg-[#121214] border border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl flex flex-col gap-8">
              <div className="text-center space-y-2">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase">Add a Photo</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Show your face or your brand.</p>
              </div>
              
              <div className="flex justify-center">
                <label className="relative w-48 h-48 rounded-[2rem] overflow-hidden bg-white/5 border-2 border-dashed border-white/20 hover:border-purple-500 transition-colors cursor-pointer group flex items-center justify-center shadow-xl">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-500 group-hover:text-purple-400 transition-colors">
                      <Camera size={48} className="mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                    <span className="text-xs font-black uppercase tracking-widest text-white">Change</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                </label>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="px-6 py-5 bg-white/5 hover:bg-white/10 font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-105 active:scale-95 text-xs">Back</button>
                <button 
                  onClick={() => setStep(3)}
                  className="flex-1 py-5 gradient-bg text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-95 text-xs"
                >
                  {photoPreview ? 'Continue' : 'Skip for now'} <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" className="bg-[#121214] border border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl flex flex-col gap-8">
              <div className="text-center space-y-2">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase">What do you do?</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">The app will customize for you.</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setRoles(prev => prev.includes('producer') ? prev.filter(r => r !== 'producer') : [...prev, 'producer'])}
                  className={`w-full p-6 rounded-[2rem] flex items-center gap-6 transition-all hover:scale-[1.02] active:scale-95 ${roles.includes('producer') ? 'bg-purple-500/20 border-2 border-purple-500 shadow-lg shadow-purple-500/20' : 'bg-white/5 border-2 border-transparent hover:border-white/10'}`}
                >
                  <div className={`p-5 rounded-[1.5rem] ${roles.includes('producer') ? 'bg-purple-500' : 'bg-white/10'}`}>
                    <SlidersHorizontal size={32} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Producer</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">I make beats and instrumentals</p>
                  </div>
                </button>

                <button
                  onClick={() => setRoles(prev => prev.includes('artist') ? prev.filter(r => r !== 'artist') : [...prev, 'artist'])}
                  className={`w-full p-6 rounded-[2rem] flex items-center gap-6 transition-all hover:scale-[1.02] active:scale-95 ${roles.includes('artist') ? 'bg-blue-500/20 border-2 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-2 border-transparent hover:border-white/10'}`}
                >
                  <div className={`p-5 rounded-[1.5rem] ${roles.includes('artist') ? 'bg-blue-500' : 'bg-white/10'}`}>
                    <Mic size={32} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Artist</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">I write and record vocals</p>
                  </div>
                </button>

                <button
                  onClick={() => setRoles(prev => prev.includes('engineer') ? prev.filter(r => r !== 'engineer') : [...prev, 'engineer'])}
                  className={`w-full p-6 rounded-[2rem] flex items-center gap-6 transition-all hover:scale-[1.02] active:scale-95 ${roles.includes('engineer') ? 'bg-orange-500/20 border-2 border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-white/5 border-2 border-transparent hover:border-white/10'}`}
                >
                  <div className={`p-5 rounded-[1.5rem] ${roles.includes('engineer') ? 'bg-orange-500' : 'bg-white/10'}`}>
                    <Music size={32} className="text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-black uppercase tracking-tight">Audio Engineer</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">I mix and master tracks</p>
                  </div>
                </button>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="px-6 py-5 bg-white/5 hover:bg-white/10 font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-105 active:scale-95 text-xs">Back</button>
                <button 
                  onClick={() => setStep(4)}
                  disabled={roles.length === 0}
                  className="flex-1 py-5 gradient-bg text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 text-xs"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" variants={slideVariants} initial="enter" animate="center" exit="exit" className="bg-[#121214] border border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl flex flex-col gap-8">
              <div className="text-center space-y-2">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase">Final Details</h1>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Help others find you in the Matcher.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">City / Location</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="e.g. Atlanta, GA"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500 outline-none transition-all font-bold"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Main Genres (Comma Separated)</label>
                  <input
                    type="text"
                    value={genres}
                    onChange={e => setGenres(e.target.value)}
                    placeholder="e.g. Trap, R&B, Drill"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500 outline-none transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest pl-2">Software / DAW</label>
                  <input
                    type="text"
                    value={daw}
                    onChange={e => setDaw(e.target.value)}
                    placeholder="e.g. FL Studio, Logic, Pro Tools"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-purple-500 outline-none transition-all font-bold"
                  />
                </div>
              </div>

              {error && <div className="p-4 bg-red-500/20 border border-red-500/50 text-red-400 rounded-2xl text-xs font-black uppercase tracking-widest text-center">{error}</div>}

              <div className="flex gap-4">
                <button onClick={() => setStep(3)} className="px-6 py-5 bg-white/5 hover:bg-white/10 font-black uppercase tracking-widest rounded-2xl transition-all hover:scale-105 active:scale-95 text-xs">Back</button>
                <button 
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 py-5 gradient-bg text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 text-xs"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Enter Studio'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
