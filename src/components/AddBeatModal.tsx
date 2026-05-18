import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music, Disc, Upload, Check, AlertCircle, FileText, Loader2, HardDrive } from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, query, where, getDocs } from 'firebase/firestore';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { updateUserStatsAfterActivity } from '../lib/stats';
import { OperationType } from '../types';

interface AddBeatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBeatModal: React.FC<AddBeatModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, isAdmin } = useAuth();
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [mood, setMood] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalUsedBytes, setTotalUsedBytes] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const fetchStorageUsage = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'beats'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      let bytes = 0;
      snapshot.forEach(doc => {
        const d = doc.data();
        bytes += (d.fileSize || 0) + (d.coverArtSize || 0);
      });
      setTotalUsedBytes(bytes);
    } catch (err) {
      console.error("Failed to fetch storage usage:", err);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchStorageUsage();
    }
  }, [isOpen, user]);

  const maxBytes = (profile?.plan === 'pro' || isAdmin) ? 5 * 1024 * 1024 * 1024 : 50 * 1024 * 1024;
  const newUploadSize = (file?.size || 0) + (coverArt?.size || 0);
  const isOverLimit = (totalUsedBytes + newUploadSize) > maxBytes;

  const isArtist = profile?.role === 'artist';
  const isEngineer = profile?.role === 'engineer';
  
  const modalTitle = isArtist ? 'Upload Song' : isEngineer ? 'Upload Mix' : 'Log New Beat';
  const submitLabel = isArtist ? 'Finish & Upload Song' : isEngineer ? 'Finish & Upload Mix' : 'Finish & Upload Beat';
  const successLabel = isArtist ? 'Song Logged!' : isEngineer ? 'Mix Logged!' : 'Beat Logged!';
  const titleLabel = isArtist ? 'Song Title' : isEngineer ? 'Mix Title' : 'Beat Title';
  const namePlaceholder = isArtist ? 'Enter song name...' : isEngineer ? 'Enter mix name...' : 'Enter beat name...';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!selectedFile.name.toLowerCase().endsWith('.mp3') && selectedFile.type !== 'audio/mpeg') {
        alert('Please select a valid MP3 file.');
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be 10MB or less.');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const uploadFile = async (selectedFile: File, userId: string): Promise<string> => {
    const safeName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const fullPath = `${userId}/${safeName}`;
    
    setUploadProgress(10); 
    
    const { data, error } = await supabase.storage.from('BUCKET').upload(fullPath, selectedFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: selectedFile.type || 'audio/mpeg'
    });
    
    if (error) {
      console.error("Supabase Upload Error:", error);
      throw error;
    }
    
    setUploadProgress(100);
    
    const { data: publicUrlData } = supabase.storage.from('BUCKET').getPublicUrl(fullPath);
    return publicUrlData.publicUrl;
  };

  const handleCoverArtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedImage = e.target.files[0];
      if (selectedImage.size > 5 * 1024 * 1024) {
        alert('Cover art must be 5MB or less.');
        return;
      }
      setCoverArt(selectedImage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (isOverLimit) {
      alert(`Storage limit exceeded! You are trying to upload a file of ${(newUploadSize / (1024 * 1024)).toFixed(1)} MB, but you only have ${((maxBytes - totalUsedBytes) / (1024 * 1024)).toFixed(1)} MB remaining. Please upgrade to Pro for unlimited storage.`);
      return;
    }
    
    setLoading(true);
    try {
      let audioUrl = '';
      let fileName = '';

      if (file) {
        audioUrl = await uploadFile(file, user.uid);
        fileName = file.name;
      }

      let coverArtUrl = '';
      if (coverArt) {
        coverArtUrl = await uploadFile(coverArt, user.uid);
      }

      const beatData: any = {
        userId: user.uid,
        title,
        genre,
        audioUrl,
        fileName,
        coverArtUrl,
        fileSize: file ? file.size : 0,
        coverArtSize: coverArt ? coverArt.size : 0,
        status: 'finished',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp(),
        verified: false
      };
      
      if (bpm) beatData.bpm = Number(bpm);
      if (key) beatData.key = key;
      if (mood) beatData.mood = mood;

      await addDoc(collection(db, 'beats'), beatData);

      await updateUserStatsAfterActivity(user.uid, 15);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'stats.totalBeats': increment(1),
        'stats.beatsFinished': increment(1)
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setGenre('');
        setFile(null);
        setCoverArt(null);
        setUploadProgress(0);
        onClose();
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'beats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-lg bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 gradient-bg" />
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black tracking-tighter uppercase italic">{modalTitle}</h2>
              <button 
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                  <Check size={32} strokeWidth={3} />
                </div>
                <h3 className="text-lg font-black uppercase italic">{successLabel}</h3>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">+15 XP Earned</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                  {/* Storage Limit Banner */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOverLimit ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/10 text-purple-400'}`}>
                        <HardDrive size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Studio Storage Space</p>
                        <p className="text-xs font-bold text-white mt-0.5">
                          {(totalUsedBytes / (1024 * 1024)).toFixed(1)} MB of {(maxBytes / (1024 * 1024)).toFixed(0)} MB used
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${(profile?.plan === 'pro' || isAdmin) ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                        {(profile?.plan === 'pro' || isAdmin) ? 'Pro Plan' : 'Free Plan'}
                      </span>
                    </div>
                  </div>

                  {isOverLimit && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl p-4 text-[10px] font-black uppercase tracking-widest text-center flex flex-col gap-2">
                      <span>⚠️ STORAGE LIMIT EXCEEDED</span>
                      <a 
                        href="https://buy.stripe.com/00wcN4fpw9T62Fqd5kbAs0x"
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-lg shadow-red-600/20 text-center"
                      >
                        Upgrade to Pro (Unlimited Storage)
                      </a>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">{titleLabel}</label>
                    <div className="relative">
                      <Music className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={namePlaceholder}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Genre / Vibes</label>
                    <div className="relative">
                      <Disc className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <select 
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all font-bold appearance-none text-white cursor-pointer text-sm"
                      >
                        <option value="" disabled className="text-gray-500 bg-[#121214]">Select a genre...</option>
                        <option value="Hip Hop" className="bg-[#121214]">Hip Hop</option>
                        <option value="Trap" className="bg-[#121214]">Trap</option>
                        <option value="R&B" className="bg-[#121214]">R&B</option>
                        <option value="Drill" className="bg-[#121214]">Drill</option>
                        <option value="Underground" className="bg-[#121214]">Underground</option>
                        <option value="Pop" className="bg-[#121214]">Pop</option>
                        <option value="Electronic" className="bg-[#121214]">Electronic</option>
                        <option value="Lo-Fi" className="bg-[#121214]">Lo-Fi</option>
                        <option value="Rock" className="bg-[#121214]">Rock</option>
                        <option value="Country" className="bg-[#121214]">Country</option>
                        <option value="Jazz" className="bg-[#121214]">Jazz</option>
                        <option value="Classical" className="bg-[#121214]">Classical</option>
                        <option value="Other" className="bg-[#121214]">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">BPM</label>
                      <input 
                        type="number" 
                        value={bpm}
                        onChange={(e) => setBpm(e.target.value)}
                        placeholder="e.g. 140"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Key</label>
                      <input 
                        type="text" 
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="e.g. C#m"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Mood</label>
                      <input 
                        type="text" 
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        placeholder="e.g. Dark"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Cover Art (Optional)</label>
                    <input 
                      type="file" 
                      ref={coverInputRef}
                      onChange={handleCoverArtChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <div 
                      onClick={() => coverInputRef.current?.click()}
                      className={`w-full border-2 border-dashed rounded-2xl p-3 flex items-center justify-center gap-3 cursor-pointer transition-all ${coverArt ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                    >
                      {coverArt ? (
                        <span className="text-xs font-bold text-white truncate max-w-[200px]">{coverArt.name}</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Upload Cover Art</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Audio File (Optional)</label>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".mp3,audio/mpeg"
                      className="hidden"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${file ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                    >
                      {file ? (
                        <>
                          <FileText className="text-purple-500" size={24} />
                          <div className="text-center">
                            <p className="text-xs font-bold text-white max-w-[200px] truncate">{file.name}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="text-gray-500" size={24} />
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Click to browse audio</p>
                          <p className="text-[8px] font-black uppercase tracking-wider text-purple-400 mt-1">MP3 ONLY • MAX SIZE 10MB</p>
                        </>
                      )}
                    </div>
                  </div>

                  {loading && file && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-500">
                        <span>Uploading Audio</span>
                        <span>{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full gradient-bg" 
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-4 gradient-bg text-white font-black uppercase tracking-widest rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Logging...'}
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        {submitLabel}
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-[8px] font-bold text-gray-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <AlertCircle size={10} />
                  Finish beats to level up and earn rewards
                </p>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
