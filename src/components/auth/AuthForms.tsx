import React, { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { Mail, Lock, User, UserPlus, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

import { Onboarding } from '../../pages/Onboarding';

const isNativeEnvironment = () => {
  const isElectron = navigator.userAgent.toLowerCase().includes('electron');
  const isCapacitor = (window as any).Capacitor !== undefined || 
                      window.location.protocol.startsWith('capacitor') || 
                      window.location.protocol.startsWith('file');
  return {
    isElectron,
    isCapacitor,
    any: isElectron || isCapacitor
  };
};

export const AuthForms: React.FC = () => {
  const { loginWithEmail, signUpWithEmail, authError, clearError, signInWithGoogle, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState(''); // email or username for login
  const [showNativeOAuthModal, setShowNativeOAuthModal] = useState(false);

  const handleGoogleClick = async () => {
    const env = isNativeEnvironment();
    if (env.any) {
      setShowNativeOAuthModal(true);
    } else {
      setIsLoading(true);
      try {
        await signInWithGoogle();
      } catch (e) {
        // handled in context
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isLogin) {
    return <Onboarding onComplete={() => setIsLogin(true)} onBackToLogin={() => setIsLogin(true)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();

    try {
      if (isLogin) {
        await loginWithEmail(identifier, password);
      } else {
        await signUpWithEmail(email, password, displayName);
      }
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-[80px]" />

        <div className="relative z-10">
          <div className="flex justify-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setIsLogin(true); clearError(); }}
              className={`flex-1 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); clearError(); }}
              className={`flex-1 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              Create Account
            </button>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-black tracking-tight uppercase mb-2">
              {isLogin ? 'Producer Login' : 'Create Account'}
            </h2>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">
              {isLogin ? 'Sign in with your email or handle' : 'Use your email, password and producer handle'}
            </p>

            <button
              type="button"
              onClick={handleGoogleClick}
              className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-white/10"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign {isLogin ? 'In' : 'Up'} with Google
            </button>
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">OR</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.div
                  key="login-fields"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Email or User Handle</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-purple-500/50 focus:ring-0 transition-all outline-none"
                        placeholder="producer_name or host@studio.com"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Studio Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-purple-500/50 focus:ring-0 transition-all outline-none"
                        placeholder="host@studio.com"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Security Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-purple-500/50 focus:ring-0 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              {isLogin && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!identifier || !identifier.includes('@')) {
                         alert("Please enter your full email address in the 'Email or User Handle' field to reset your password.");
                         return;
                      }
                      try {
                        setIsLoading(true);
                        await resetPassword(identifier);
                        alert("Password reset email sent! Check your inbox.");
                      } catch (e: any) {
                        alert(e.message || "Failed to send reset email.");
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-center"
              >
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-red-500 text-xs font-bold leading-tight">{authError}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full gradient-bg text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 animate-pulse"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {isLogin ? 'Initialize Studio' : 'Build Profile'}
                </>
              )}
            </button>

            {isLogin && (
              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors hover:underline decoration-purple-500 underline-offset-4"
                >
                  Don't have an account? Sign Up
                </button>
              </div>
            )}
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <div className="mb-4">
              <button
                onClick={handleGoogleClick}
                className="w-full py-3 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 mb-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21.35 11.1h-9.17v2.8h5.26c-.23 1.42-1.09 2.63-2.33 3.43v2.83h3.77c2.2-2.03 3.47-5.02 3.47-8.79 0-.59-.05-1.17-.24-1.5z" fill="#4285F4"/><path d="M12.18 22c2.7 0 4.96-.9 6.62-2.44l-3.77-2.83c-1 .66-2.2 1.05-3.85 1.05-2.95 0-5.45-1.99-6.34-4.65h-3.8v2.92c1.68 3.11 5.22 6 10.14 6z" fill="#34A853"/><path d="M5.84 13.13a7.86 7.86 0 010-2.86v-2.92h-3.8a11.94 11.94 0 000 8.7h3.8z" fill="#FBBC05"/><path d="M12.18 4.48c1.47 0 2.78.51 3.82 1.51l2.86-2.86C17.1 1.58 14.84 1 12.18 1 7.27 1 3.73 3.9 2.05 7.99l3.8 2.93c.88-2.66 3.38-4.44 6.33-4.44z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
            </div>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                clearError();
              }}
              className="text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
            >
              {isLogin ? "Don't have a profile? Sign Up" : "Already have a profile? Log In"}
            </button>
          </div>
        </div>
      </div>

      {/* Native OAuth Helper Modal */}
      <AnimatePresence>
        {showNativeOAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121214] border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full relative overflow-hidden shadow-2xl"
            >
              {/* Abstract Glowing Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
              
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Native Platform Auth Guide</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Google Login inside Built Apps</p>
                </div>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-gray-300">
                <p>
                  Google OAuth restricts direct popups inside compiled <strong className="text-white">Desktop (.exe)</strong> or <strong className="text-white">Mobile (.apk)</strong> binaries for security.
                </p>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                  <p className="font-black uppercase tracking-wider text-purple-400 text-[10px] flex items-center gap-1.5">
                    ⚡ 1-Second Solution (Fast Sign-In)
                  </p>
                  <p className="text-gray-400">
                    If you created your account with Google on the Web, you can access your profile on the built mobile/desktop app immediately:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-gray-400">
                    <li>Go back to the Login screen and click <strong className="text-white">Forgot Password?</strong></li>
                    <li>Enter your Gmail address to receive a password reset link.</li>
                    <li>Create your custom secure password.</li>
                    <li>Log in with your Gmail and password seamlessly on mobile & desktop!</li>
                  </ol>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 space-y-2">
                  <p className="font-black uppercase tracking-wider text-blue-400 text-[10px]">
                    🛠️ For Developers (Native Google SDK Integration)
                  </p>
                  <p className="text-[10px] text-gray-400">
                    To make Google Sign-in native on mobile, register your Android App ID and keystore SHA-1 fingerprint in the Firebase Console, then add the Capacitor Native Google Auth plugin before generating the APK.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNativeOAuthModal(false)}
                  className="flex-1 py-3.5 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-105 transition-all cursor-pointer"
                >
                  Use Email & Password
                </button>
                <button
                  onClick={async () => {
                    setShowNativeOAuthModal(false);
                    try {
                      setIsLoading(true);
                      await signInWithGoogle();
                    } catch (e) {
                      // Handled in context
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white border border-white/10 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all cursor-pointer"
                >
                  Proceed Anyway
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
