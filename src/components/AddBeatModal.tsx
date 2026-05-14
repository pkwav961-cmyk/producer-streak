import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music, Disc, Upload, Check, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { db, handleFirestoreError, storage } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../lib/AuthContext';
import { updateUserStatsAfterActivity } from '../lib/stats';
import { OperationType } from '../types';

interface AddBeatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddBeatModal: React.FC<AddBeatModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type.startsWith('audio/') || selectedFile.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
        setFile(selectedFile);
      } else {
        alert('Please select a valid audio file (MP3, WAV, M4A, OGG).');
      }
    }
  };

  const uploadFile = async (selectedFile: File, userId: string): Promise<string> => {
    const storagePath = `users/${userId}/beats/${Date.now()}_${selectedFile.name}`;
    console.log('Starting modal beat upload to Storage...', { uid: userId, path: storagePath });
    const fileRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(fileRef, selectedFile);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload error:", error);
          reject(error);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      let audioUrl = '';
      let fileName = '';

      if (file) {
        audioUrl = await uploadFile(file, user.uid);
        fileName = file.name;
      }

      await addDoc(collection(db, 'beats'), {
        userId: user.uid,
        title,
        genre,
        audioUrl,
        fileName,
        status: 'finished',
        createdAt: new Date().toISOString(),
        timestamp: serverTimestamp()
      });

      await updateUserStatsAfterActivity(user.uid, 150);

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
            className="relative w-full max-w-lg bg-[#121214] border border-white/5 rounded-[3rem] p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 gradient-bg" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="mb-8">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic">Log New Beat</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Add to your legacy</p>
            </div>

            {success ? (
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
                  <Check size={40} strokeWidth={3} />
                </div>
                <h3 className="text-xl font-black uppercase italic">Beat Logged!</h3>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">+150 XP Earned</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Beat Title</label>
                  <div className="relative">
                    <Music className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter beat name..."
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-5 py-5 focus:outline-none focus:border-purple-500/50 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Genre / Vibes</label>
                  <div className="relative">
                    <Disc className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text" 
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder="Trap, Lofi, Orchestral..."
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-5 py-5 focus:outline-none focus:border-purple-500/50 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Audio File (Optional)</label>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*"
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${file ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10 hover:border-white/20 bg-white/5'}`}
                  >
                    {file ? (
                      <>
                        <FileText className="text-purple-500" size={32} />
                        <div className="text-center">
                          <p className="text-sm font-bold text-white max-w-[200px] truncate">{file.name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="text-gray-500" size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Click to browse audio</p>
                      </>
                    )}
                  </div>
                </div>

                {loading && file && (
                  <div className="space-y-2">
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

                <div className="pt-4">
                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-6 gradient-bg text-white font-black uppercase tracking-widest rounded-[2rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Logging...'}
                      </>
                    ) : (
                      <>
                        <Upload size={20} />
                        Finish & Upload Beat
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-[8px] font-bold text-gray-600 uppercase tracking-widest flex items-center justify-center gap-2">
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
