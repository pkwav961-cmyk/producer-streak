import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, X, Music, CheckCircle2, Loader2, Music2, UploadCloud } from 'lucide-react';
import { db, storage, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../lib/AuthContext';
import { updateUserStatsAfterActivity } from '../lib/stats';
import { OperationType } from '../types';
import { uploadToR2 } from '../lib/r2';

interface BeatUploadProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BeatUpload: React.FC<BeatUploadProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [audioUrl, setAudioUrl] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState<'finished' | 'sketch' | 'mixed' | 'mastered'>('finished');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        setUploadError('Please select an audio file');
        return;
      }
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('File size must be under 50MB');
        return;
      }
      setAudioFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!user || !title) return;
    if (!audioUrl && !audioFile) {
      setUploadError('Please provide an audio URL or file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      let finalAudioUrl = audioUrl;

      // Upload file to R2 if provided
      if (audioFile) {
        const result = await uploadToR2({
          file: audioFile,
          folder: `beats/${user.uid}`,
          onProgress: (progress) => setUploadProgress(progress),
        });
        finalAudioUrl = result.url;
      }

      // Save to Firestore
      await addDoc(collection(db, 'beats'), {
        userId: user.uid,
        title,
        genre,
        status,
        audioUrl: finalAudioUrl,
        artworkUrl: artworkUrl || '',
        bpm: bpm || '',
        key: key || '',
        fileName: title,
        createdAt: new Date().toISOString(),
        verified: true,
        timestamp: serverTimestamp(),
      });

      // Update User Stats & Streak
      await updateUserStatsAfterActivity(user.uid, 150);

      await updateDoc(doc(db, 'users', user.uid), {
        'stats.beatsFinished': increment(1),
        'stats.uploadsCount': increment(1),
      });

      // Reset form
      onClose();
      setAudioUrl('');
      setAudioFile(null);
      setTitle('');
      setGenre('');
      setBpm('');
      setKey('');
      setArtworkUrl('');
      setUploadProgress(0);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      handleFirestoreError(err, OperationType.WRITE, 'beats');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-8 overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-6">
             <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
               <X size={24} />
             </button>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black tracking-tighter italic uppercase">Vault Submission</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mt-1">Add to your professional archive</p>
          </div>

          <div className="space-y-8">
            {/* Upload Method Tabs */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
              <button
                onClick={() => setAudioFile(null)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  !audioFile
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Paste URL
              </button>
              <button
                onClick={() => setAudioUrl('')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  audioFile
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Upload File
              </button>
            </div>

            {/* Error message */}
            {uploadError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-400 text-sm">
                {uploadError}
              </div>
            )}

            {/* URL Input OR File Upload */}
            {!audioFile ? (
              <div
                className={`border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all ${
                  audioUrl
                    ? 'border-purple-500/50 bg-purple-500/5'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white mb-4">
                    <Music size={32} />
                  </div>
                  <input
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="Enter audio URL (SoundCloud, YouTube, etc.)"
                    className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mt-2">
                    PASTE AUDIO LINK
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center transition-all border-green-500/50 bg-green-500/5 cursor-pointer hover:bg-green-500/10"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mb-4">
                    <UploadCloud size={32} />
                  </div>
                  <p className="font-bold text-white text-sm">{audioFile.name}</p>
                  <p className="text-[10px] text-green-400 mt-2">
                    {(audioFile.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                  <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mt-3">
                    CLICK TO CHANGE
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            {/* Upload button for file */}
            {audioFile && !audioUrl && (
              <div className="space-y-3">
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full gradient-bg"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <p className="text-xs text-gray-400 text-center">Uploading: {uploadProgress}%</p>
                )}
              </div>
            )}

            {/* Beat Details */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                  Beat Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Moonlight Sonata 808"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                  Genre
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g. Dark Trap"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                  BPM
                </label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  placeholder="e.g. 140"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">
                  Key
                </label>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g. C Minor"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                />
              </div>
            </div>

            <button
              disabled={isUploading || (!audioUrl && !audioFile) || !title}
              onClick={handleUpload}
              className={`w-full py-6 rounded-3xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
                isUploading || (!audioUrl && !audioFile) || !title
                  ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                  : 'gradient-bg text-white shadow-2xl shadow-purple-500/30 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {audioFile ? 'Uploading File...' : 'Finalizing...'}
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Submit to Archive
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
