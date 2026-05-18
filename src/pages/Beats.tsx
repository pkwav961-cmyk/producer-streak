import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { Beat } from '../types';
import { Play, Pause, Music2, Calendar, FileAudio, Trash2, X, SkipBack, SkipForward, FastForward, Rewind } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

const DEFAULT_COVER = 'https://i.postimg.cc/k44rqjNL/Chat-GPT-Image-May-16-2026-04-45-32-PM.png';

export const BeatsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingBeat, setPlayingBeat] = useState<Beat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterBpm, setFilterBpm] = useState('');
  const [filterKey, setFilterKey] = useState('');
  const [filterMood, setFilterMood] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isArtist = profile?.role === 'artist';
  const isEngineer = profile?.role === 'engineer';
  
  const pageTitle = isArtist ? 'Your Songs' : isEngineer ? 'Your Mixes' : 'Your Beats';
  const pageDesc = isArtist ? 'Manage and listen to your vocal tracks' : isEngineer ? 'Manage and listen to your mixes' : 'Manage and listen to your uploaded catalog';
  const emptyTitle = isArtist ? 'No songs uploaded yet' : isEngineer ? 'No mixes uploaded yet' : 'No beats uploaded yet';
  const emptyDesc = isArtist ? 'Click the add button below to upload your first song' : isEngineer ? 'Click the add button below to upload your first mix' : 'Click the add button below to upload your first beat';
  const fallbackGenre = isArtist ? 'Song' : isEngineer ? 'Mix' : 'Beat';

  useEffect(() => {
    if (!user) return;
    const fetchBeats = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'beats'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        setBeats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Beat)));
      } catch (error) {
        console.error("Error fetching beats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBeats();
  }, [user]);



  const togglePlay = (beat: Beat) => {
    if (!beat.audioUrl) return;
    
    if (playingBeat?.id === beat.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.src = beat.audioUrl;
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
        setPlayingBeat(beat);
        setIsPlaying(true);
      }
    }
  };

  const deleteBeat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this track?')) return;
    try {
      const beatToDelete = beats.find(b => b.id === id);
      
      if (beatToDelete) {
        const pathsToDelete: string[] = [];
        
        const extractStoragePath = (url: string): string | null => {
          if (!url) return null;
          const bucketMarker = '/storage/v1/object/public/BUCKET/';
          if (url.includes(bucketMarker)) {
            const parts = url.split(bucketMarker);
            return parts.length > 1 ? decodeURIComponent(parts[1]) : null;
          }
          return null;
        };

        if (beatToDelete.audioUrl) {
          const audioPath = extractStoragePath(beatToDelete.audioUrl);
          if (audioPath) pathsToDelete.push(audioPath);
        }
        if (beatToDelete.coverArtUrl) {
          const coverPath = extractStoragePath(beatToDelete.coverArtUrl);
          if (coverPath) pathsToDelete.push(coverPath);
        }

        if (pathsToDelete.length > 0) {
          console.log('Attempting to delete files from Supabase Storage:', pathsToDelete);
          const { error: storageError } = await supabase.storage.from('BUCKET').remove(pathsToDelete);
          if (storageError) {
            console.error('Failed to delete files from Supabase Storage:', storageError);
          } else {
            console.log('Successfully deleted files from Supabase Storage');
          }
        }
      }

      await deleteDoc(doc(db, 'beats', id));
      setBeats(beats.filter(b => b.id !== id));
      if (playingBeat?.id === id) {
        setPlayingBeat(null);
        audioRef.current?.pause();
      }
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  };

  const skipTime = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Loading Audio Vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">{pageTitle}</h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">{pageDesc}</p>
      </div>

      {beats.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Search by title or genre..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold flex-1 focus:border-purple-500 outline-none transition-colors" />
          <input type="number" placeholder="BPM" value={filterBpm} onChange={e => setFilterBpm(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold w-full sm:w-24 focus:border-purple-500 outline-none transition-colors" />
          <input type="text" placeholder="Key (e.g. C#m)" value={filterKey} onChange={e => setFilterKey(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold w-full sm:w-24 focus:border-purple-500 outline-none transition-colors" />
          <input type="text" placeholder="Mood" value={filterMood} onChange={e => setFilterMood(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold w-full sm:w-32 focus:border-purple-500 outline-none transition-colors" />
        </div>
      )}

      <div className="space-y-4 pb-24">
        {beats.length === 0 ? (
          <div className="p-12 bg-[#121214] border border-dashed border-white/10 rounded-[2rem] text-center">
            <Music2 className="mx-auto mb-4 opacity-20" size={48} />
            <p className="text-sm font-bold uppercase tracking-widest text-white/40">{emptyTitle}</p>
            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase tracking-widest">{emptyDesc}</p>
          </div>
        ) : (
          beats.filter(b => {
            if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.genre?.toLowerCase().includes(search.toLowerCase())) return false;
            if (filterBpm && b.bpm !== Number(filterBpm)) return false;
            if (filterKey && b.key?.toLowerCase() !== filterKey.toLowerCase()) return false;
            if (filterMood && b.mood?.toLowerCase() !== filterMood.toLowerCase()) return false;
            return true;
          }).map((beat, i) => (
            <motion.div 
              key={beat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => togglePlay(beat)}
              className="group cursor-pointer bg-[#121214] border border-white/5 p-4 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between hover:border-purple-500/30 transition-all gap-4 shadow-xl"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative w-14 h-14 shrink-0 rounded-2xl overflow-hidden shadow-lg">
                  <img src={beat.coverArtUrl || DEFAULT_COVER} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/40 ${playingBeat?.id === beat.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    {playingBeat?.id === beat.id && isPlaying ? <Pause size={24} className="text-white" fill="currentColor" /> : <Play size={24} className="text-white ml-1" fill="currentColor" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold tracking-tight truncate pr-4">{beat.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                      {beat.genre || fallbackGenre}
                    </span>
                    {beat.bpm && (
                      <span className="text-[9px] font-bold text-gray-500 px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                        {beat.bpm} BPM
                      </span>
                    )}
                    {beat.key && (
                      <span className="text-[9px] font-bold text-gray-500 px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                        {beat.key}
                      </span>
                    )}
                    {beat.mood && (
                      <span className="text-[9px] font-bold text-gray-500 px-2 py-0.5 bg-white/5 rounded-md border border-white/5">
                        {beat.mood}
                      </span>
                    )}
                    {beat.fileName && (
                      <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 max-w-[120px] truncate">
                        <FileAudio size={10} /> {beat.fileName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center sm:flex-col sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0 pl-18 sm:pl-0 gap-3">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(beat.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                    {beat.status}
                  </span>
                </div>
                <button 
                  onClick={(e) => deleteBeat(e, beat.id as string)}
                  className="p-2 text-gray-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {playingBeat && (
          <motion.div 
            initial={{ y: '50%', opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: '50%', opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
              {/* Background Blur Effect inside the card */}
              <div 
                className="absolute inset-0 bg-cover bg-center blur-[80px] opacity-20 mix-blend-screen scale-150 pointer-events-none"
                style={{ backgroundImage: `url(${playingBeat.coverArtUrl || DEFAULT_COVER})` }}
              />
              
              <div className="relative flex-1 flex flex-col p-6 sm:p-8">
                <button 
                  onClick={() => setPlayingBeat(null)}
                  className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors z-10"
                >
                  <X size={20} className="text-white" />
                </button>
                
                <div className="flex-1 flex flex-col items-center justify-center w-full gap-8 mt-4">
                  <div className="w-full max-w-[260px] aspect-square rounded-[2rem] overflow-hidden shadow-2xl shadow-purple-500/20 border border-white/10">
                    <img 
                      src={playingBeat.coverArtUrl || DEFAULT_COVER} 
                      alt="Cover Art" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="w-full space-y-6">
                    <div className="text-center space-y-1">
                      <h2 className="text-2xl font-black uppercase tracking-tighter truncate w-full">{playingBeat.title}</h2>
                      <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">{playingBeat.genre}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer relative" onClick={(e) => {
                        if (!audioRef.current || !audioRef.current.duration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const val = (e.clientX - rect.left) / rect.width;
                        audioRef.current.currentTime = val * audioRef.current.duration;
                      }}>
                        <div className="h-full bg-purple-500 rounded-full transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-6 pt-2">
                      <button onClick={() => skipTime(-10)} className="p-3 text-white/50 hover:text-white transition-colors">
                        <Rewind size={24} />
                      </button>
                      <button 
                        onClick={() => togglePlay(playingBeat)}
                        className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all"
                      >
                        {isPlaying ? <Pause size={32} className="text-white" fill="currentColor" /> : <Play size={32} className="text-white ml-2" fill="currentColor" />}
                      </button>
                      <button onClick={() => skipTime(10)} className="p-3 text-white/50 hover:text-white transition-colors">
                        <FastForward size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio 
        ref={audioRef} 
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime || 0);
          const dur = e.currentTarget.duration;
          if (dur && !isNaN(dur) && dur !== Infinity) {
            setDuration(dur);
            setProgress((e.currentTarget.currentTime / dur) * 100 || 0);
          }
        }}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (dur && !isNaN(dur) && dur !== Infinity) {
            setDuration(dur);
          }
        }}
        onDurationChange={(e) => {
          const dur = e.currentTarget.duration;
          if (dur && !isNaN(dur) && dur !== Infinity) {
            setDuration(dur);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
        }} 
        className="hidden" 
      />
    </div>
  );
};
