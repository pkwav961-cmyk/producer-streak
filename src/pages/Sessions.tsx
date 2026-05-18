import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from '../components/UI';
import { Clock, Calendar, Music2, Sliders, Mic, Layers, Trash2, Save, Check, Download as DownloadIcon, RefreshCcw, BarChart3, MessageSquare, Share2, Play, Volume2, Lock, Unlock, Settings, Music, Plus, Eye, Send, VolumeX, Key, FileUp, Activity, CheckCircle2, FolderSync, ChevronLeft } from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { ProductionSession as Session, OperationType } from '../types';
import { exportSessionsCard } from '../lib/canvasExporter';

const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const BpmTapper: React.FC = () => {
  const [bpm, setBpm] = useState<number | null>(null);
  const [taps, setTaps] = useState<number[]>([]);

  const handleTap = () => {
    const now = Date.now();
    const newTaps = [...taps, now].filter(t => now - t < 2000);
    setTaps(newTaps);

    if (newTaps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      setBpm(Math.round(60000 / avgInterval));
    }
  };

  const handleReset = () => {
    setTaps([]);
    setBpm(null);
  };

  return (
    <GlassCard className="p-6 bg-gradient-to-br from-purple-950/10 to-black border border-white/10 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl">
      <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
        <Clock className="animate-pulse" size={16} />
      </div>
      <div>
        <p className="text-2xl font-black">{bpm || '---'} <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">BPM</span></p>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Live BPM Tapper</p>
      </div>
      <div className="flex gap-2 w-full">
        <button onClick={handleTap} className="flex-1 py-2.5 gradient-bg rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-500/20">
          Tap
        </button>
        <button onClick={handleReset} className="px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 transition-all">
          Reset
        </button>
      </div>
    </GlassCard>
  );
};

const StudioDistributionChart: React.FC<{ stats: any }> = ({ stats }) => {
  const total = (stats.byType.production || 0) + (stats.byType.mixing || 0) + (stats.byType.recording || 0) + (stats.byType.arrangement || 0) || 1;
  const pctProd = ((stats.byType.production || 0) / total) * 100;
  const pctMix = ((stats.byType.mixing || 0) / total) * 105; // slightly scaled for visual height
  const pctRec = ((stats.byType.recording || 0) / total) * 100;
  const pctArr = ((stats.byType.arrangement || 0) / total) * 100;

  return (
    <GlassCard className="p-6 rounded-3xl">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Studio Distribution</h3>
      <div className="space-y-3">
        {[
          { label: 'Production', pct: pctProd, color: 'bg-purple-500', count: stats.byType.production },
          { label: 'Mixing', pct: pctMix, color: 'bg-blue-500', count: stats.byType.mixing },
          { label: 'Recording', pct: pctRec, color: 'bg-emerald-500', count: stats.byType.recording },
          { label: 'Arrangement', pct: pctArr, color: 'bg-orange-500', count: stats.byType.arrangement },
        ].map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-500">
              <span>{item.label}</span>
              <span>{item.count} sessions ({Math.round(item.pct)}%)</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 border border-white/10 rounded-full overflow-hidden">
              <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.min(item.pct, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export const SessionsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      orderBy('startTime', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(sessionsData);
      
      const notesMap: Record<string, string> = {};
      sessionsData.forEach(s => {
        notesMap[s.id] = s.notes || '';
      });
      setLocalNotes(prev => ({ ...notesMap, ...prev }));
      
      setLoading(false);
    }, error => {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'production': return Music2;
      case 'mixing': return Sliders;
      case 'recording': return Mic;
      case 'arrangement': return Layers;
      default: return Clock;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      await deleteDoc(doc(db, 'sessions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${id}`);
    }
  };

  const handleUpdateNotes = async (id: string) => {
    const notes = localNotes[id];
    setSavingId(id);
    try {
      await updateDoc(doc(db, 'sessions', id), { notes });
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleExportCSV = () => {
    if (sessions.length === 0) return;

    const headers = ['Date', 'Start Time', 'Duration', 'Type', 'Status', 'Notes'];
    const rows = sessions.map(s => {
      const date = new Date(s.startTime);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        s.durationMinutes.toString(),
        s.type,
        s.status,
        s.notes || ''
      ].map(field => `"${field.replace(/"/g, '""')}"`);
    });

    const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `producer-streak-sessions-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExportJSON = () => {
    if (sessions.length === 0) return;
    
    const jsonContent = JSON.stringify(sessions, null, 2);
    downloadFile(jsonContent, `producer-streak-sessions-${new Date().toISOString().split('T')[0]}.json`, 'application/json;charset=utf-8;');
  };

  const filteredSessions = sessions.filter(session => {
    if (filterType !== 'all' && session.type !== filterType) return false;
    
    if (filterPeriod !== 'all') {
      const sessionDate = new Date(session.startTime);
      const now = new Date();
      const diffTime = now.getTime() - sessionDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      
      switch (filterPeriod) {
        case 'today': return diffDays < 1;
        case 'week': return diffDays < 7;
        case 'month': return diffDays < 30;
        default: return true;
      }
    }
    
    return true;
  });

  const stats = {
    totalSessions: filteredSessions.length,
    totalMinutes: filteredSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    avgSession: filteredSessions.length > 0 ? Math.round(filteredSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / filteredSessions.length) : 0,
    byType: {
      production: filteredSessions.filter(s => s.type === 'production').length,
      mixing: filteredSessions.filter(s => s.type === 'mixing').length,
      recording: filteredSessions.filter(s => s.type === 'recording').length,
      arrangement: filteredSessions.filter(s => s.type === 'arrangement').length,
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCcw className="animate-spin text-purple-500" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter">Session Logs</h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Archived Studio Time</p>
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setShowStats(!showStats)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
            <BarChart3 size={14} className="text-purple-400" />
            Stats
          </button>
          {sessions.length > 0 && (
            <>
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                <DownloadIcon size={14} className="text-purple-400" />
                CSV
              </button>
              <button onClick={handleExportJSON} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                <DownloadIcon size={14} className="text-purple-400" />
                JSON
              </button>
              <button 
                onClick={() => {
                  const items = sessions.map(s => ({
                    title: s.type,
                    duration: s.durationMinutes,
                    genre: s.notes ? s.notes.split('\n')[0] : 'Collab Session',
                    bpm: '140'
                  }));
                  exportSessionsCard(items, profile?.displayName || 'Creator', profile?.profileVerifiedImage || profile?.photoURL || '');
                }} 
                className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-pink-300 animate-pulse"
              >
                <DownloadIcon size={14} className="text-pink-400" />
                PNG Card
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Type</label>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-500/50 transition-all text-white cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="production">Production</option>
            <option value="mixing">Mixing</option>
            <option value="recording">Recording</option>
            <option value="arrangement">Arrangement</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Period</label>
          <select 
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="bg-[#121214] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-purple-500/50 transition-all text-white cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Stats Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Numeric Stats */}
              <GlassCard className="p-6 bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-3xl grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-purple-400">{stats.totalSessions}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-blue-400">{stats.totalMinutes}m</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Total Time</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-green-400">{stats.avgSession}m</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Avg Session</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-orange-400">{stats.byType.production}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">Production</p>
                </div>
              </GlassCard>

              {/* Distribution Chart */}
              <StudioDistributionChart stats={stats} />

              {/* Live BPM Tapper */}
              <BpmTapper />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {filteredSessions.map((session, i) => {
          const Icon = getIcon(session.type);
          const hasChanges = localNotes[session.id] !== (session.notes || '');

          return (
            <motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className={`group ${session.status === 'partial' ? 'border-purple-500/30 bg-purple-500/5' : ''}`}>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        session.status === 'partial' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-400'
                      }`}>
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm uppercase tracking-tight">{session.type}</h4>
                          {session.status === 'partial' && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-purple-500 text-white uppercase animate-pulse">In Progress</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-1"><Calendar size={10} />{new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-lg font-black italic">{session.durationMinutes}m</p>
                        <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">+{session.durationMinutes * 2} XP</p>
                      </div>
                      <button onClick={() => handleDelete(session.id)} className="p-2 text-gray-600 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <div className="relative">
                    <textarea placeholder="Session notes..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-300 focus:outline-none focus:border-purple-500/50 transition-all resize-none h-16" value={localNotes[session.id] || ''} onChange={(e) => setLocalNotes({ ...localNotes, [session.id]: e.target.value })} />
                    {(hasChanges || savingId === session.id || savedId === session.id) && (
                      <button onClick={() => handleUpdateNotes(session.id)} disabled={savingId === session.id || !hasChanges} className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-all ${savedId === session.id ? 'bg-green-500/20 text-green-400' : 'bg-purple-500 text-white'}`}>
                        {savingId === session.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : savedId === session.id ? <Check size={14} /> : <Save size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
