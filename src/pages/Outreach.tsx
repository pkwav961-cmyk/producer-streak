import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ArrowRight, CheckCircle2, Clock3, Loader2, MessageCircle, Search, ShieldCheck, Sparkles, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { getGeminiResponse } from '../lib/gemini';
import { GlassCard } from '../components/UI';

interface OutreachContact {
  id: string;
  name: string;
  role: string;
  socials?: { instagram?: string; twitter?: string; tiktok?: string; };
  selected?: boolean;
  style?: string;
  image?: string;
}

interface OutreachProject {
  id: string;
  type: 'song' | 'album' | 'artist';
  title: string;
  artist: string;
  album?: string;
  image?: string;
  credits: OutreachContact[];
}

const TONE_OPTIONS = ['professional', 'casual', 'industry', 'underground', 'confident'] as const;

export const OutreachPage: React.FC = () => {
  const { profile, user } = useAuth();
  
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [queryText, setQueryText] = useState('');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);
  
  // Step 1: Artist Search
  const [artistResults, setArtistResults] = useState<any[]>([]);
  const [selectedArtist, setSelectedArtist] = useState<any | null>(null);
  
  // Step 2: Catalogue Search
  const [catalogueResults, setCatalogueResults] = useState<OutreachProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<OutreachProject | null>(null);
  
  // Step 3: Contacts & Generation
  const [selectedContacts, setSelectedContacts] = useState<OutreachContact[]>([]);
  const [tone, setTone] = useState<(typeof TONE_OPTIONS)[number]>('professional');
  const [bpm, setBpm] = useState('');
  const [key, setKey] = useState('');
  const [beatFolder, setBeatFolder] = useState('');
  
  // Step 4: Messages
  const [messages, setMessages] = useState<{ text: string; contactId: string; approved: boolean; tone: string }[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const searchGenius = async (query: string) => {
    const apiKey = import.meta.env.VITE_GENIUS_API_KEY;
    if (!apiKey) throw new Error("Genius API Key is missing. Please configure VITE_GENIUS_API_KEY.");
    
    const targetUrl = `https://api.genius.com/search?q=${encodeURIComponent(query)}&access_token=${apiKey}`;
    const response = await fetch(targetUrl);
    
    if (!response.ok) throw new Error(`Search failed: ${response.status}`);
    const data = await response.json();
    return data.response?.hits || [];
  };

  const getArtistSongs = async (artistId: string) => {
    const apiKey = import.meta.env.VITE_GENIUS_API_KEY;
    if (!apiKey) throw new Error("Genius API Key is missing.");
    
    const targetUrl = `https://api.genius.com/artists/${artistId}/songs?sort=popularity&per_page=20&access_token=${apiKey}`;
    const response = await fetch(targetUrl);
    
    if (!response.ok) throw new Error(`Fetch catalogue failed: ${response.status}`);
    const data = await response.json();
    return data.response?.songs || [];
  };

  const getSongDetails = async (songId: string) => {
    const apiKey = import.meta.env.VITE_GENIUS_API_KEY;
    if (!apiKey) throw new Error("Genius API Key is missing.");
    
    const targetUrl = `https://api.genius.com/songs/${songId}?access_token=${apiKey}`;
    const response = await fetch(targetUrl);
    
    if (!response.ok) throw new Error(`Fetch song details failed: ${response.status}`);
    const data = await response.json();
    return data.response?.song;
  };

  const getArtistSocials = async (artistId: string) => {
    try {
      const apiKey = import.meta.env.VITE_GENIUS_API_KEY;
      const res = await fetch(`https://api.genius.com/artists/${artistId}?access_token=${apiKey}`);
      if (!res.ok) return undefined;
      const data = await res.json();
      return data.response?.artist?.instagram_name || undefined;
    } catch (e) {
      return undefined;
    }
  };

  const handleSearchArtist = async () => {
    if (!queryText.trim()) return;
    setSearchError(null);
    setLoadingSearch(true);
    try {
      const hasSongIndicator = queryText.includes('-') || queryText.includes('–');
      const apiKey = import.meta.env.VITE_GENIUS_API_KEY;

      if (hasSongIndicator) {
        const cleanedQuery = queryText.replace(/[-–]/g, ' ').trim();
        const hits = await searchGenius(cleanedQuery);
        
        if (hits && hits.length > 0) {
          const songs: OutreachProject[] = hits.map((hit: any) => {
            const result = hit.result;
            return {
              id: result.id.toString(),
              type: 'song' as const,
              title: result.title,
              artist: result.primary_artist?.name,
              album: '',
              image: result.song_art_image_thumbnail_url || result.header_image_url,
              credits: []
            };
          });
          
          setCatalogueResults(songs);
          setStep(2);
          setSelectedArtist({ name: `Search: "${queryText}"` });
          return;
        }
      }

      // Try searching Genius first to get real artists with real profile images!
      if (apiKey) {
        try {
          const hits = await searchGenius(queryText);
          const artistsMap = new Map();
          
          hits.forEach((hit: any) => {
            const art = hit.result.primary_artist;
            if (art && !artistsMap.has(art.id)) {
              artistsMap.set(art.id, {
                id: art.id.toString(),
                name: art.name,
                image: art.image_url || art.header_image_url
              });
            }
          });

          const artists = Array.from(artistsMap.values());
          if (artists.length > 0) {
            setArtistResults(artists);
            return;
          }
        } catch (err) {
          console.error("Genius artist image query failed, falling back", err);
        }
      }
      
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(queryText)}&entity=musicArtist&limit=8`);
      const data = await response.json();
      
      const fallbackImages = [
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300",
        "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300",
        "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=300",
        "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300"
      ];

      const artists = data.results.map((a: any, idx: number) => ({
        id: a.artistId.toString(),
        name: a.artistName,
        image: fallbackImages[idx % fallbackImages.length]
      }));
      
      setArtistResults(artists);
      if (!artists.length) {
        const cleanedQuery = queryText.replace(/[-–]/g, ' ').trim();
        const hits = await searchGenius(cleanedQuery);
        if (hits && hits.length > 0) {
          const songs: OutreachProject[] = hits.map((hit: any) => {
            const result = hit.result;
            return {
              id: result.id.toString(),
              type: 'song' as const,
              title: result.title,
              artist: result.primary_artist?.name,
              album: '',
              image: result.song_art_image_thumbnail_url || result.header_image_url,
              credits: []
            };
          });
          setCatalogueResults(songs);
          setStep(2);
          setSelectedArtist({ name: `Search: "${queryText}"` });
          return;
        }
        setSearchError("No artists or songs found. Try another query!");
      }
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || "Failed to complete search.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectArtist = async (artist: any) => {
    setSelectedArtist(artist);
    setStep(2);
    setLoadingSearch(true);
    setSearchError(null);
    try {
      const apiKey = import.meta.env.VITE_GENIUS_API_KEY;
      const songs: OutreachProject[] = [];

      // 1. Try to fetch songs from Genius first if apiKey is present
      if (apiKey) {
        try {
          const res = await fetch(`https://api.genius.com/artists/${artist.id}/songs?access_token=${apiKey}&sort=popularity&per_page=30`);
          if (res.ok) {
            const data = await res.json();
            const geniusSongs = data.response?.songs || [];
            geniusSongs.forEach((song: any) => {
              songs.push({
                id: song.id.toString(),
                type: 'song',
                title: song.title,
                artist: song.primary_artist?.name || artist.name,
                album: '',
                image: song.song_art_image_thumbnail_url || song.header_image_url || artist.image,
                credits: []
              });
            });
          }
        } catch (e) {
          console.error("Genius songs fetch failed, falling back to iTunes", e);
        }
      }

      // 2. Fall back to iTunes lookup if Genius returned no songs
      if (songs.length === 0) {
        try {
          const response = await fetch(`https://itunes.apple.com/lookup?id=${artist.id}&entity=song&limit=30`);
          if (response.ok) {
            const data = await response.json();
            data.results.forEach((res: any) => {
              if (res.wrapperType === 'track') {
                songs.push({
                  id: res.trackId.toString(),
                  type: 'song',
                  title: res.trackName,
                  artist: res.artistName,
                  album: res.collectionName,
                  image: res.artworkUrl100?.replace('100x100', '300x300'),
                  credits: []
                });
              }
            });
          }
        } catch (e) {
          console.error("iTunes lookup failed", e);
        }
      }

      // 3. Fallback 3: If still empty, search Genius by search query for the artist name!
      if (songs.length === 0) {
        try {
          const hits = await searchGenius(artist.name);
          if (hits && hits.length > 0) {
            hits.forEach((hit: any) => {
              const result = hit.result;
              songs.push({
                id: result.id.toString(),
                type: 'song',
                title: result.title,
                artist: result.primary_artist?.name,
                album: '',
                image: result.song_art_image_thumbnail_url || result.header_image_url,
                credits: []
              });
            });
          }
        } catch (e) {
          console.error("Genius query fallback failed", e);
        }
      }
      
      setCatalogueResults(songs);
      if (!songs.length) setSearchError("No discography found for this artist.");
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || "Failed to fetch discography.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectProject = async (project: OutreachProject) => {
    setLoadingSearch(true);
    setSearchError(null);
    try {
      // Find the song on Genius to get credits
      const hits = await searchGenius(`${project.title} ${project.artist}`);
      let geniusSongId = null;
      if (hits.length > 0) {
        geniusSongId = hits[0].result.id;
      } else {
        throw new Error("Song not found on Genius for credits.");
      }

      const songData = await getSongDetails(geniusSongId);
      if (songData) {
        const credits: OutreachContact[] = [];
        
        songData.producer_artists?.forEach((p: any) => {
          credits.push({
            id: `prod-${p.id}`,
            name: p.name,
            role: 'Producer',
            selected: true,
            socials: { instagram: p.instagram_name || undefined },
            image: p.image_url || p.header_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`
          });
        });
        
        songData.writer_artists?.forEach((w: any) => {
          if (!credits.some(c => c.name === w.name)) {
            credits.push({
              id: `writer-${w.id}`,
              name: w.name,
              role: 'Writer',
              selected: false,
              socials: { instagram: w.instagram_name || undefined },
              image: w.image_url || w.header_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name)}&background=random`
            });
          }
        });

        // Add Engineers and other custom performances
        songData.custom_performances?.forEach((perf: any) => {
          perf.artists?.forEach((a: any) => {
            if (!credits.some(c => c.name === a.name)) {
              credits.push({
                id: `perf-${perf.label.replace(/\s+/g, '-')}-${a.id}`,
                name: a.name,
                role: perf.label, // e.g. "Mixing Engineer", "Mastering Engineer"
                selected: true, // Auto-select engineers
                socials: { instagram: a.instagram_name || undefined },
                image: a.image_url || a.header_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=random`
              });
            }
          });
        });
        
        if (credits.length === 0) {
          credits.push({
            id: `eng-${project.id}`,
            name: 'Recording Engineer',
            role: 'Engineer',
            selected: true
          });
        }
        // Fetch socials in parallel
        await Promise.all(credits.map(async (c) => {
          if (!c.socials?.instagram && c.id !== `eng-${project.id}`) {
            const rawId = c.id.split('-').pop(); // extracts ID from prod-123 or perf-Mix-123
            if (rawId) {
              const ig = await getArtistSocials(rawId);
              if (ig) {
                if (!c.socials) c.socials = {};
                c.socials.instagram = ig;
              }
            }
          }
        }));
        
        project.credits = credits;
      }
      setSelectedProject(project);
      setSelectedContacts(project.credits);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setSearchError("Failed to fetch full song credits.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const handleGenerate = async () => {
    const selected = selectedContacts.filter(c => c.selected);
    if (!selected.length) {
      setSearchError("Select at least one contact to generate messages.");
      return;
    }
    setSearchError(null);
    setGenerating(true);
    setStep(4);
    
    try {
      const generated: typeof messages = [];
      for (const contact of selected) {
        const prompt = `Write a short, human Instagram DM in a ${tone} tone to ${contact.name}. Mention their work on "${selectedProject?.title}" by ${selectedProject?.artist}. Say I made some beats inspired by that sound, labeled with ${bpm ? bpm + ' BPM' : 'BPM'} and ${key ? key + ' Key' : 'Key'}. ${beatFolder ? 'Mention the beat folder is ready.' : 'Ask if I can send a pack.'} Keep it under 60 words. Do NOT sound like spam. Just one variant.`;
        
        let text = '';
        try {
          text = await getGeminiResponse(prompt, 'You are a music producer sending a networking DM.');
        } catch (err) {
          text = `Yo ${contact.name}, loved your work on ${selectedProject?.title}. I cooked up a pack of beats with that exact vibe (${bpm} BPM, ${key}). Let me know if I can send them over!`;
        }
        generated.push({ text: text.trim(), contactId: contact.id, approved: false, tone });
      }
      setMessages(generated);
    } catch (err) {
      setSearchError("Failed to generate messages.");
      setStep(3);
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveMessage = (index: number) => {
    setMessages(prev => prev.map((m, i) => i === index ? { ...m, approved: !m.approved } : m));
  };

  const handleOpenIG = async (msg: any, contact: any, index: number) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(index);
      setCopiedNotice(`Copied to Clipboard! Opening Instagram DM for ${contact.name}...`);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (e) {
      console.warn('Clipboard write failed', e);
      setCopiedNotice(`Ready to send! Launching Instagram...`);
    }

    setTimeout(() => {
      setCopiedNotice(null);
      const igName = contact?.socials?.instagram || contact?.name.replace(/\s+/g, '');
      window.open(`https://ig.me/m/${igName}`, '_blank');
      if (!msg.approved) {
        handleApproveMessage(index);
      }
    }, 1200);
  };

  const handleSend = async () => {
    const approved = messages.filter(m => m.approved);
    if (!approved.length) {
      setSearchError("Approve at least one message.");
      return;
    }
    setSendStatus('Saving scheduled messages...');
    try {
      for (const msg of approved) {
        const contact = selectedContacts.find(c => c.id === msg.contactId);
        await addDoc(collection(db, 'outreachMessages'), {
          userId: user?.uid,
          contactName: contact?.name,
          contactRole: contact?.role,
          projectTitle: selectedProject?.title,
          message: msg.text,
          status: 'scheduled',
          createdAt: serverTimestamp(),
        });
      }
      setSendStatus(`Successfully scheduled ${approved.length} message(s)!`);
      setTimeout(() => {
        setStep(1);
        setSendStatus(null);
        setMessages([]);
        setQueryText('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setSearchError("Failed to save messages.");
    }
  };

  if (!profile) return <div className="p-8 text-center text-gray-500">Please log in to use Smart Outreach.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header & Breadcrumbs */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter italic">Smart Outreach</h1>
        <div className="flex items-center gap-2 mt-4 text-xs font-bold uppercase tracking-widest text-gray-500">
          <button onClick={() => setStep(1)} className={step >= 1 ? 'text-purple-400' : ''}>1. Artist</button>
          <ArrowRight size={12} />
          <button onClick={() => step >= 2 && setStep(2)} className={step >= 2 ? 'text-purple-400' : ''}>2. Catalogue</button>
          <ArrowRight size={12} />
          <button onClick={() => step >= 3 && setStep(3)} className={step >= 3 ? 'text-purple-400' : ''}>3. Contacts</button>
          <ArrowRight size={12} />
          <span className={step >= 4 ? 'text-purple-400' : ''}>4. Review</span>
        </div>
      </div>

      {searchError && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">{searchError}</div>}
      {sendStatus && <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-sm">{sendStatus}</div>}

      {/* STEP 1: Artist Search */}
      {step === 1 && (
        <GlassCard className="animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Find an Artist</h2>
              <p className="text-sm text-gray-400 mt-1">Search for an artist to scan their catalogue for producers and engineers.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchArtist()}
                  placeholder="e.g. Travis Scott, Drake, Yeat..."
                  className="w-full bg-[#09090a] border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <button
                onClick={handleSearchArtist}
                disabled={loadingSearch || !queryText}
                className="gradient-bg px-8 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center min-w-[120px]"
              >
                {loadingSearch ? <Loader2 className="animate-spin" size={20} /> : 'Search'}
              </button>
            </div>

            {artistResults.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {artistResults.map((artist) => (
                  <button
                    key={artist.id}
                    onClick={() => handleSelectArtist(artist)}
                    className="bg-[#09090a] border border-white/5 p-4 rounded-3xl hover:border-purple-500/30 hover:bg-white/5 transition flex flex-col items-center text-center gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10">
                      {artist.image ? <img src={artist.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <div className="w-full h-full" />}
                    </div>
                    <span className="font-bold text-sm truncate w-full">{artist.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* STEP 2: Catalogue Selection */}
      {step === 2 && (
        <GlassCard className="animate-in fade-in slide-in-from-right-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setStep(1)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><ChevronLeft size={20} /></button>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedArtist?.name}'s Catalogue</h2>
                <p className="text-sm text-gray-400 mt-1">Select a track or album to pull the credits.</p>
              </div>
            </div>

            {loadingSearch ? (
              <div className="flex flex-col items-center py-12 text-gray-500 gap-4">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest">Scanning Genius Database...</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {catalogueResults.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className="w-full flex items-center gap-4 p-3 bg-[#09090a] border border-white/5 rounded-2xl hover:border-purple-500/30 transition text-left group overflow-hidden"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 shrink-0">
                      {project.image && <img src={project.image} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold truncate text-base sm:text-lg group-hover:text-purple-400 transition-colors">{project.title}</p>
                      <p className="text-xs text-gray-500 truncate">{project.artist}</p>
                    </div>
                    <div className="px-2 sm:px-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-purple-500/50 group-hover:text-purple-400 shrink-0 hidden sm:block">
                      Select
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* STEP 3: Contacts & Draft Setup */}
      {step === 3 && selectedProject && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
          <GlassCard>
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setStep(2)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><ChevronLeft size={20} /></button>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Select Targets</h2>
                <p className="text-sm text-gray-400 mt-1">Credits pulled for "{selectedProject.title}"</p>
              </div>
            </div>
            
            <div className="grid gap-3 mb-8">
              {selectedContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => toggleContact(contact.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${contact.selected ? 'bg-purple-500/10 border-purple-500/30' : 'bg-[#09090a] border-white/5'}`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <img 
                      src={contact.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`} 
                      alt={contact.name} 
                      className="w-12 h-12 rounded-full border border-white/10 object-cover" 
                    />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{contact.role}</p>
                      <p className="font-bold text-lg">{contact.name}</p>
                    </div>
                  </div>
                  {contact.selected ? <CheckCircle2 className="text-purple-400" size={24} /> : <div className="w-6 h-6 rounded-full border-2 border-white/10" />}
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-white/10 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Draft Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="block bg-[#09090a] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Tone</span>
                  <select value={tone} onChange={(e) => setTone(e.target.value as any)} className="w-full bg-transparent outline-none text-sm font-bold">
                    {TONE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="block bg-[#09090a] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Folder Link (Optional)</span>
                  <input value={beatFolder} onChange={e => setBeatFolder(e.target.value)} placeholder="Dropbox/Drive link" className="w-full bg-transparent outline-none text-sm font-bold" />
                </label>
                <label className="block bg-[#09090a] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">BPM</span>
                  <input value={bpm} onChange={e => setBpm(e.target.value)} placeholder="e.g. 140" className="w-full bg-transparent outline-none text-sm font-bold" />
                </label>
                <label className="block bg-[#09090a] p-3 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Key</span>
                  <input value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. C#m" className="w-full bg-transparent outline-none text-sm font-bold" />
                </label>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !selectedContacts.some(c => c.selected)}
                className="w-full mt-4 gradient-bg py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {generating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                Generate DMs
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* STEP 4: Review */}
      {step === 4 && (
        <GlassCard className="animate-in fade-in slide-in-from-right-8">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setStep(3)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><ChevronLeft size={20} /></button>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">Review & Send</h2>
              <p className="text-sm text-gray-400 mt-1">Approve your messages before scheduling.</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {messages.map((msg, idx) => {
              const contact = selectedContacts.find(c => c.id === msg.contactId);
              return (
                <div key={idx} className="bg-[#09090a] border border-white/10 rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={contact?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact?.name || '')}&background=random`} 
                        alt={contact?.name} 
                        className="w-10 h-10 rounded-full border border-white/10 object-cover" 
                      />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{contact?.role}</p>
                        <p className="font-bold text-sm text-white">{contact?.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenIG(msg, contact, idx)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg flex items-center gap-2 ${copiedId === idx ? 'bg-green-500 text-black' : 'bg-[#E1306C] text-white hover:bg-[#C13584]'}`}
                        title="Copies message & opens IG"
                      >
                        {copiedId === idx ? 'Copied! Paste in IG' : 'Copy & Open IG'}
                      </button>
                      <button
                        onClick={() => handleApproveMessage(idx)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${msg.approved ? 'bg-green-500 text-black' : 'bg-white/5 text-white hover:bg-white/10'}`}
                      >
                        {msg.approved ? 'Approved' : 'Approve'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-200">{msg.text}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex items-center gap-3 mb-6">
            <ShieldCheck className="text-purple-400 shrink-0" size={24} />
            <p className="text-xs text-purple-200">Messages are scheduled individually with randomized delays to protect your accounts from spam flags.</p>
          </div>

          <button
            onClick={handleSend}
            disabled={!messages.some(m => m.approved)}
            className="w-full bg-green-500 text-black py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            Schedule Approved Messages
          </button>
        </GlassCard>
      )}

      {/* Clipboard Redirect Notice Toast */}
      <AnimatePresence>
        {copiedNotice && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-sm bg-[#121214] border border-purple-500/30 rounded-[2.5rem] p-8 text-center space-y-4 shadow-[0_0_50px_rgba(168,85,247,0.15)]">
              <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto text-xl animate-bounce">
                🚀
              </div>
              <h3 className="text-lg font-black uppercase tracking-tighter italic text-white">Copied to Clipboard!</h3>
              <p className="text-xs text-gray-400 uppercase font-black tracking-wider leading-relaxed">
                {copiedNotice}
              </p>
              <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mt-4" />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OutreachPage;
