import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { Settings, ShieldCheck, MapPin, BadgeCheck, Edit2, X, User, Clock, Mic2, Sliders, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

import { AuthForms } from '../components/auth/AuthForms';

const MatcherSetupModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user, profile, updateProfile } = useAuth();
  const [matcherEnabled, setMatcherEnabled] = React.useState(profile?.matcherEnabled || false);
  const [role, setRole] = React.useState<'producer' | 'artist' | 'engineer'>(profile?.role || 'producer');
  const [genres, setGenres] = React.useState<string[]>(profile?.genres || []);
  const [skillLevel, setSkillLevel] = React.useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>(profile?.skillLevel || 'beginner');
  const [location, setLocation] = React.useState(profile?.location || '');
  const [bio, setBio] = React.useState(profile?.bio || '');
  const [isSaving, setIsSaving] = React.useState(false);

  const availableGenres = [
    'Hip Hop', 'R&B', 'Pop', 'Electronic', 'Rock', 'Jazz', 'Classical',
    'Trap', 'Lo-Fi', 'Ambient', 'House', 'Techno', 'Drum & Bass', 'Dubstep'
  ];

  const handleSave = async () => {
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      await updateProfile({
        matcherEnabled,
        role,
        genres,
        skillLevel,
        location,
        bio,
        lastActivityDate: new Date()
      });
      onClose();
    } catch (error) {
      console.error('Error saving matcher settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black italic tracking-tight uppercase">Matcher Setup</h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Configure your collab profile</p>
      </div>

      <div className="space-y-6">
        {/* Enable Matcher */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Enable Matcher</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">Show your profile to others</p>
          </div>
          <button
            onClick={() => setMatcherEnabled(!matcherEnabled)}
            className={`w-12 h-6 rounded-full transition-all ${
              matcherEnabled ? 'bg-purple-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-all ${
              matcherEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {matcherEnabled && (
          <>
            {/* Role Selection */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Your Role</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'producer' as const, label: 'Producer', icon: '🎛️' },
                  { id: 'artist' as const, label: 'Artist', icon: '🎤' },
                  { id: 'engineer' as const, label: 'Engineer', icon: '⚙️' }
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-2xl border transition-all ${
                      role === r.id
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-lg mb-1">{r.icon}</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">{r.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Genres */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Genres ({genres.length}/5)</p>
              <div className="flex flex-wrap gap-2">
                {availableGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    disabled={genres.length >= 5 && !genres.includes(genre)}
                    className={`px-3 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                      genres.includes(genre)
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                    } ${genres.length >= 5 && !genres.includes(genre) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Skill Level */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Skill Level</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'beginner' as const, label: 'Beginner' },
                  { id: 'intermediate' as const, label: 'Intermediate' },
                  { id: 'advanced' as const, label: 'Advanced' },
                  { id: 'expert' as const, label: 'Expert' }
                ].map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSkillLevel(level.id)}
                    className={`p-3 rounded-2xl border transition-all ${
                      skillLevel === level.id
                        ? 'border-purple-500/50 bg-purple-500/10'
                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest">{level.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Location (Optional)</p>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 text-sm focus:border-purple-500/50 focus:outline-none"
              />
            </div>

            {/* Bio */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Bio</p>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself and what you're looking for..."
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 text-sm focus:border-purple-500/50 focus:outline-none resize-none"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onClose}
          className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-4 gradient-bg text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { user, profile, loading, logout, authError } = useAuth();
  const [isEditing, setIsEditing] = React.useState(false);
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [editBio, setEditBio] = React.useState(profile?.bio || '');
  const [isSaving, setIsSaving] = React.useState(false);
  const [photoUrl, setPhotoUrl] = React.useState(profile?.photoURL || '');
  const [isUrlEditing, setIsUrlEditing] = React.useState(false);
  const [showMatcherSetup, setShowMatcherSetup] = React.useState(false);

  const handleSavePhotoUrl = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, { photoURL: photoUrl });
      setIsUrlEditing(false);
    } catch (err) {
      console.error('Error saving photo URL:', err);
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    if (!user?.isAnonymous && user?.email) {
      setShowAuthModal(false);
    }
  }, [user]);

  // Remove handleLogin logic that used Google

  // Remove handleFileSelect, startCamera, stopCamera, captureAndUpload functions

  const handleSaveBio = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, { bio: editBio });
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving bio:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 animate-pulse">
          Loading Profile...
        </p>
      </div>
    );
  }

  if (authError || showAuthModal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-4">
        {showAuthModal && (
          <button 
            onClick={() => setShowAuthModal(false)}
            className="mb-8 text-gray-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            <X size={14} /> Continue as Guest
          </button>
        )}
        <AuthForms />
        {!showAuthModal && (
          <div className="mt-8 flex gap-3">
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em]">
              Refresh App
            </button>
            <button onClick={logout} className="px-8 py-4 bg-red-500/5 border border-red-500/10 text-red-500 font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em]">
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
    <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
  </div>;

  if (!profile) return <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <ShieldCheck size={32} className="text-red-500 mb-4" />
    <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">Profile Not Found</h2>
    <p className="text-gray-400 text-sm max-w-xs mx-auto mb-6">The app failed to load your producer profile. This could be due to a connection issue.</p>
    <div className="flex flex-col gap-3">
      <button onClick={() => window.location.reload()} className="px-8 py-4 gradient-bg text-white font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em]">Refresh & Retry</button>
      <button onClick={logout} className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl text-[10px] uppercase tracking-[0.2em]">Sign Out</button>
    </div>
  </div>;

  return (
    <div className="space-y-12 pb-12">
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-8 group">
          <div className="w-44 h-44 rounded-[3rem] overflow-hidden border-4 border-white/5 shadow-2xl bg-[#121214] relative flex items-center justify-center">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={64} className="text-gray-700" />
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
              <button onClick={() => setIsUrlEditing(true)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors" title="Edit Photo URL">
                <Edit2 size={24} className="text-white" />
              </button>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 gradient-bg text-white p-2.5 rounded-2xl shadow-xl shadow-purple-500/20">
            <BadgeCheck size={20} fill="currentColor" fillOpacity={0.2} />
          </div>
        </div>

        <h1 className="text-4xl font-black tracking-tighter">{profile.displayName}</h1>

        <AnimatePresence>
          {isUrlEditing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
              <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setIsUrlEditing(false)} />
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="p-8 flex justify-between items-center border-b border-white/5">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Edit Profile Photo</h3>
                  <button onClick={() => setIsUrlEditing(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><X size={20} /></button>
                </div>
                <div className="p-8 space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Photo URL</label>
                    <input 
                      type="url" 
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setIsUrlEditing(false)} className="flex-1 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                    <button onClick={handleSavePhotoUrl} disabled={isSaving} className="flex-[2] py-4 gradient-bg text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20">
                      {isSaving ? 'Saving...' : 'Save Photo'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Guest Security Prompt */}
        {(user?.isAnonymous || !user?.email) && (
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="w-full max-w-2xl mt-10 p-8 bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-[3rem] relative overflow-hidden text-left"
           >
              <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100} /></div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <h3 className="text-2xl font-black tracking-tight mb-2">Secure Your Account</h3>
                  <p className="text-gray-400 text-sm">You're in Guest Studio mode. Sign in or create an account to save your progress permanently and connect with other producers.</p>
                </div>
                <button className="whitespace-nowrap px-8 py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform shadow-xl" onClick={() => setShowAuthModal(true)}>
                  Login or Sign Up
                </button>
              </div>
           </motion.div>
        )}
        
        {isEditing ? (
          <div className="w-full max-w-md mt-6 space-y-4">
            <textarea className="w-full bg-[#121214] border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-purple-500 min-h-[100px] resize-none" placeholder="Tell us about your sound..." value={editBio} onChange={(e) => setEditBio(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={handleSaveBio} disabled={isSaving} className="flex-1 py-3 gradient-bg text-white font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Bio'}</button>
              <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-gray-400 text-sm max-w-sm whitespace-pre-wrap">{profile.bio || 'Add a bio to your profile.'}</p>
        )}

        <div className="flex items-center gap-3 mt-4">
           <div className="text-gray-400 font-bold flex items-center gap-2 uppercase text-[10px] tracking-[0.2em] bg-white/5 px-4 py-1.5 rounded-xl border border-white/5"><MapPin size={12} className="text-purple-500" />{profile.location || 'Studio'}</div>
           <div className="text-purple-400 font-bold flex items-center gap-2 uppercase text-[10px] tracking-[0.2em] bg-purple-500/10 px-4 py-1.5 rounded-xl border border-purple-500/20"><Cpu size={12} />Level {profile.level}</div>
        </div>

        <div className="flex gap-4 mt-10">
          <button onClick={() => { setIsEditing(true); setEditBio(profile.bio || ''); }} className="px-10 py-5 gradient-bg text-white font-black rounded-[2rem] text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all">
            <Edit2 size={16} /> Edit Profile
          </button>
          <button className="p-5 bg-[#121214] border border-white/5 rounded-[2rem] text-white hover:bg-white/5 transition-all active:scale-95"><Settings size={22} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { v: profile.stats.followersCount || 0, l: 'Followers' },
          { v: profile.stats.followingCount || 0, l: 'Following' },
          { v: profile.stats.totalBeats, l: 'Total Beats', c: 'text-purple-500' },
          { v: profile.streakCount, l: 'Day Streak', c: 'text-orange-500' },
          { v: profile.level, l: 'Current Level', c: 'text-blue-400' },
          { v: profile.xp, l: 'Total XP', c: 'text-purple-400' },
        ].map((s, i) => (
          <div key={i} className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] space-y-1">
            <p className={`text-2xl font-black ${s.c || ''}`}>{s.v}</p>
            <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Producer Performance</h2>
          <div className="h-px flex-1 bg-white/5 ml-6" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              label: 'Total Time Spent', 
              value: `${profile.stats.totalHours || 0}h`, 
              icon: Clock, 
              color: 'text-blue-500', 
              desc: 'Hours logged in studio' 
            },
            { 
              label: 'Songs Recorded', 
              value: profile.stats.songsRecorded || 0, 
              icon: Mic2, 
              color: 'text-emerald-500', 
              desc: 'Full vocal/instrument sessions' 
            },
            { 
              label: 'Mixes Completed', 
              value: profile.stats.mixesCompleted || 0, 
              icon: Sliders, 
              color: 'text-purple-500', 
              desc: 'Sessions marked as mixing' 
            },
            { 
              label: 'Beats Finished', 
              value: profile.stats.beatsFinished || 0, 
              icon: Target, 
              color: 'text-orange-500', 
              desc: 'Project files exported' 
            }
          ].map((stat, i) => (
            <div key={i} className="bg-[#121214] border border-white/5 p-8 rounded-[3rem] group hover:border-white/10 transition-colors relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <stat.icon size={100} />
               </div>
               <div className="relative z-10 space-y-4">
                  <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">{stat.label}</p>
                  </div>
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{stat.desc}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matcher Setup */}
      <div className="space-y-6 pt-8 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black italic tracking-tight uppercase">Matcher</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Find collab partners</p>
          </div>
          <button
            onClick={() => setShowMatcherSetup(true)}
            className="px-6 py-3 gradient-bg text-white font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all"
          >
            {profile?.matcherEnabled ? 'Configure' : 'Enable'}
          </button>
        </div>

        {profile?.matcherEnabled && (
          <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Matcher Active</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                  Role: {profile.role || 'Not set'} • {profile.genres?.length || 0} genres
                </p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-8">
        <button onClick={logout} className="w-full py-5 bg-red-500/5 border border-red-500/10 rounded-[2.5rem] text-red-500 font-bold uppercase tracking-widest text-[10px] hover:bg-red-500/10 transition-all active:scale-[0.99]">Logout Account</button>
      </div>

      {/* Matcher Setup Modal */}
      <AnimatePresence>
        {showMatcherSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowMatcherSetup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121214] border border-white/5 rounded-[3rem] p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <MatcherSetupModal onClose={() => setShowMatcherSetup(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
