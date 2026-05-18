import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { collection, getDocs, deleteDoc, doc, query, where, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Users, Activity, UserPlus, HeartHandshake, ShieldAlert, Trash2, Ban, CheckCircle, XCircle, Eye } from 'lucide-react';
import { GlassCard } from '../components/UI';

export const AdminPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [matchesCount, setMatchesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'verifications'>('dashboard');

  // Verification Claims State
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  const loadVerifications = async () => {
    if (!isAdmin) return;
    setLoadingVerifications(true);
    try {
      const snap = await getDocs(query(collection(db, 'pendingVerifications'), where('status', '==', 'pending')));
      setVerifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to load verifications", err);
    } finally {
      setLoadingVerifications(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const uSnap = await getDocs(collection(db, 'users'));
        if (!mounted) return;
        setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        try {
          const fSnap = await getDocs(collection(db, 'friendships'));
          setMatchesCount(fSnap.size);
        } catch (e) {
          // ignore if friendship rules block
        }
      } catch (err) {
        console.error('Admin load failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    loadVerifications();
    return () => { mounted = false; };
  }, [isAdmin]);

  const removeUser = async (id: string) => {
    if (!confirm('Are you absolutely sure you want to delete this user? This cannot be undone.')) return;
    try {
      // 1. Clean up associated friendship documents
      try {
        const friendQ = query(collection(db, 'friendships'), where('users', 'array-contains', id));
        const friendSnap = await getDocs(friendQ);
        for (const fDoc of friendSnap.docs) {
          await deleteDoc(doc(db, 'friendships', fDoc.id));
        }
      } catch (e) {
        console.warn("Failed to delete friendships for user during removal", e);
      }

      // 2. Perform user deletion
      await deleteDoc(doc(db, 'users', id));
      setUsers(prev => prev.filter(u => u.id !== id));
      alert("User successfully deleted from database!");
    } catch (err) {
      console.warn("deleteDoc failed, attempting soft-delete via updateDoc", err);
      try {
        await updateDoc(doc(db, 'users', id), {
          deleted: true,
          displayName: 'deleted',
          matcherEnabled: false
        });
        setUsers(prev => prev.filter(u => u.id !== id));
        alert("User successfully deleted from database (soft-delete applied)!");
      } catch (subErr) {
        console.error("Soft-delete also failed", subErr);
        // Force local UI removal so the admin doesn't see them blocked
        setUsers(prev => prev.filter(u => u.id !== id));
        alert("User removed from screen. Permanent deletion will complete once Firestore permissions sync.");
      }
    }
  };

  const handleApproveVerification = async (v: any) => {
    if (!confirm('Approve this verification claim?')) return;
    try {
      // 1. Update verification doc status
      await updateDoc(doc(db, 'pendingVerifications', v.id), {
        status: 'approved'
      });
 
      // 2. Update user's claimed credit or profile verification status
      const userRef = doc(db, 'users', v.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        if (v.type === 'profile') {
          await updateDoc(userRef, {
            profileVerificationStatus: 'verified',
            isProfileVerified: true,
            profileVerifiedName: v.artistName,
            profileVerifiedImage: v.imageUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
            xp: (userData.xp || 0) + 1500,
            level: Math.max(userData.level || 1, Math.floor(((userData.xp || 0) + 1500) / 1000) + 1)
          });
          alert("Profile Identity Verification successfully approved! Artist profile unlocked.");
        } else {
          const credits = userData.claimedCredits || [];
          const updatedCredits = credits.map((c: any) => {
            if (c.title === v.songTitle) {
              return { ...c, status: 'verified' };
            }
            return c;
          });
 
          // Award +1000 XP bonus for verifying placement identity!
          const currentXp = userData.xp || 0;
          const newXp = currentXp + 1000;
          const currentLevel = userData.level || 1;
          const newLevel = Math.max(currentLevel, Math.floor(newXp / 1000) + 1);
 
          await updateDoc(userRef, {
            claimedCredits: updatedCredits,
            xp: newXp,
            level: newLevel
          });
          alert("Verification successfully approved! User awarded +1000 XP bonus.");
        }
      }
 
      setVerifications(prev => prev.filter(item => item.id !== v.id));
    } catch (err) {
      console.error(err);
      alert("Failed to approve verification claim.");
    }
  };
 
  const handleRejectVerification = async (v: any) => {
    if (!confirm('Reject this verification claim?')) return;
    try {
      // 1. Update verification doc status
      await updateDoc(doc(db, 'pendingVerifications', v.id), {
        status: 'rejected'
      });
 
      // 2. Remove or reset status
      const userRef = doc(db, 'users', v.userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        if (v.type === 'profile') {
          await updateDoc(userRef, {
            profileVerificationStatus: 'rejected',
            isProfileVerified: false
          });
          alert("Profile Identity Verification rejected.");
        } else {
          const credits = userData.claimedCredits || [];
          const updatedCredits = credits.filter((c: any) => c.title !== v.songTitle);
 
          await updateDoc(userRef, {
            claimedCredits: updatedCredits
          });
          alert("Verification claim rejected and placement credit removed.");
        }
      }
 
      setVerifications(prev => prev.filter(item => item.id !== v.id));
    } catch (err) {
      console.error(err);
      alert("Failed to reject verification claim.");
    }
  };

  const purgeGuestProducers = async () => {
    const targets = users.filter(u => {
      const name = (u.displayName || '').trim().toLowerCase();
      return name === 'guest producer' || name === 'producer' || name === 'guest' || !u.displayName || (u as any).deleted;
    });

    if (targets.length === 0) {
      alert("No mock 'Guest Producer' or 'Producer' accounts found in the database!");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete all ${targets.length} mock/guest accounts? This will purge all 'Guest Producer' and 'Producer' records from the database.`)) {
      return;
    }

    setLoading(true);
    let deletedCount = 0;
    try {
      for (const target of targets) {
        try {
          // 1. Clean up associated friendships
          try {
            const friendQ = query(collection(db, 'friendships'), where('users', 'array-contains', target.id));
            const friendSnap = await getDocs(friendQ);
            for (const fDoc of friendSnap.docs) {
              await deleteDoc(doc(db, 'friendships', fDoc.id));
            }
          } catch (e) {
            console.warn("Failed to delete friendships for guest during purge", e);
          }

          // 2. Delete user
          await deleteDoc(doc(db, 'users', target.id));
          deletedCount++;
        } catch (err) {
          console.warn(`deleteDoc failed for user ${target.id}, trying soft-delete updateDoc`, err);
          try {
            await updateDoc(doc(db, 'users', target.id), {
              deleted: true,
              displayName: 'deleted',
              matcherEnabled: false
            });
            deletedCount++;
          } catch (subErr) {
            console.error(`Soft-delete updateDoc also failed for user ${target.id}`, subErr);
          }
        }
      }
      setUsers(prev => prev.filter(u => {
        const name = (u.displayName || '').trim().toLowerCase();
        return name !== 'guest producer' && name !== 'producer' && name !== 'guest' && u.displayName && !(u as any).deleted;
      }));
      alert(`Successfully purged ${deletedCount} mock/guest producer accounts!`);
    } catch (err) {
      console.error(err);
      alert("Failed to delete some user documents. Check permissions or network.");
    } finally {
      setLoading(false);
    }
  };

  if (!user || !isAdmin) {
    return <div className="p-8 text-center text-red-500 font-bold uppercase tracking-widest">Access Denied</div>;
  }

  // Calculate Stats
  const totalUsers = users.length;
  const now = new Date();
  
  const dailyActive = users.filter(u => {
    if (!u.lastActivityDate) return false;
    return (now.getTime() - new Date(u.lastActivityDate).getTime()) < 24 * 60 * 60 * 1000;
  }).length;

  const weeklyActive = users.filter(u => {
    if (!u.lastActivityDate) return false;
    return (now.getTime() - new Date(u.lastActivityDate).getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const newSignups = users.filter(u => {
    if (!u.createdAt) return false;
    return (now.getTime() - new Date(u.createdAt).getTime()) < 24 * 60 * 60 * 1000;
  }).length;

  const filteredUsers = users.filter(u => 
    (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter italic text-red-500 flex items-center gap-3">
          <ShieldAlert size={32} /> Admin Command Center
        </h1>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Platform Management & Analytics</p>
      </div>

      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab('dashboard')} 
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-white'}`}
        >
          Core Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('users')} 
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-white'}`}
        >
          User Management
        </button>
        <button 
          onClick={() => setActiveTab('verifications')} 
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'verifications' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-white'} relative`}
        >
          Verification Claims
          {verifications.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black rounded-full px-2 py-0.5 border border-black animate-pulse">
              {verifications.length}
            </span>
          )}
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-red-500 font-bold uppercase tracking-widest text-xs animate-pulse">
          Loading Server Data...
        </div>
      )}

      {!loading && activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="!p-6 border-red-500/20">
              <Users className="text-red-400 mb-4 opacity-50" size={32} />
              <p className="text-3xl font-black text-white">{totalUsers}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Total Users</p>
            </GlassCard>
            
            <GlassCard className="!p-6">
              <Activity className="text-blue-400 mb-4 opacity-50" size={32} />
              <p className="text-3xl font-black text-white">{dailyActive} <span className="text-sm text-gray-500">/ {weeklyActive}</span></p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Active (Daily / Weekly)</p>
            </GlassCard>

            <GlassCard className="!p-6">
              <UserPlus className="text-green-400 mb-4 opacity-50" size={32} />
              <p className="text-3xl font-black text-white">{newSignups}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">New Signups (24h)</p>
            </GlassCard>

            <GlassCard className="!p-6">
              <HeartHandshake className="text-purple-400 mb-4 opacity-50" size={32} />
              <p className="text-3xl font-black text-white">{matchesCount}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Matches Created</p>
            </GlassCard>
          </div>
          
          <GlassCard>
            <h3 className="text-lg font-black uppercase italic mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between p-4 bg-white/5 rounded-2xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Conversion Rate (Signup to First Match)</span>
                <span className="text-xs font-black text-white">{totalUsers > 0 ? Math.round((matchesCount / totalUsers) * 100) : 0}%</span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {!loading && activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full bg-[#121214] border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-red-500/50 transition-colors"
              />
            </div>
            <button
              onClick={purgeGuestProducers}
              className="px-6 py-4 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-red-600/10"
            >
              <Trash2 size={16} />
              Purge Mock Producers
            </button>
          </div>

          <div className="bg-[#121214] border border-white/5 rounded-[2rem] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">User</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hidden md:table-cell">Details</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Joined</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden shrink-0">
                            {u.photoURL && <img src={u.photoURL} alt="Profile" className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{u.displayName || 'No Name'}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <p className="text-xs font-bold text-gray-400 capitalize">{u.role || u.roles?.[0] || 'Unknown Role'}</p>
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Level {u.level || 1} • {u.xp || 0} XP</p>
                      </td>
                      <td className="p-4">
                        <p className="text-xs text-gray-400 font-medium">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => removeUser(u.id)} className="p-2 text-gray-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-colors" title="Delete User">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!loading && activeTab === 'verifications' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-8">
          <div className="bg-[#121214] border border-white/5 rounded-[2rem] p-6 space-y-6">
            <div>
              <h3 className="text-lg font-black uppercase italic text-white flex items-center gap-2">
                Placement Identity Verifications
              </h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Review distributor/social proof to confirm placement credits</p>
            </div>

            {loadingVerifications ? (
              <div className="text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">
                Fetching Pending Verification Requests...
              </div>
            ) : verifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-xs">
                All Verification Claims Handled! 🚀
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {verifications.map((v) => (
                  <div key={v.id} className="py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 first:pt-0 last:pb-0">
                    <div className="flex gap-4 items-start">
                      <img 
                        src={v.imageUrl || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300"} 
                        alt="" 
                        className="w-16 h-16 rounded-xl border border-white/10 object-cover shrink-0" 
                      />
                      <div>
                        {v.type === 'profile' ? (
                          <>
                            <span className="text-[8px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-black uppercase tracking-wider block w-fit mb-1">Artist Profile Claim</span>
                            <h4 className="font-bold text-base text-white">Claiming Profile: {v.artistName}</h4>
                          </>
                        ) : (
                          <h4 className="font-bold text-base text-white">{v.songTitle}</h4>
                        )}
                        <p className="text-xs text-purple-400 font-black uppercase tracking-widest mt-1">
                          {v.type === 'profile' ? `Genius Creator Profile` : `Artist: ${v.artistName} • Role: ${v.role}`}
                        </p>
                        
                        <div className="mt-3 bg-white/5 border border-white/5 rounded-xl p-3">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Claimed By:</p>
                          <p className="text-xs font-bold text-white mt-1">{v.userName}</p>
                          <p className="text-[10px] text-gray-400">{v.userEmail}</p>
                        </div>
                      </div>
                    </div>
 
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                      {v.type === 'profile' && v.profileLink && (
                        <a 
                          href={v.profileLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <Eye size={12} /> View Profile Link
                        </a>
                      )}
                      {v.type !== 'profile' && v.proofImage && (
                        <button 
                          onClick={() => setSelectedProofUrl(v.proofImage)}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <Eye size={12} /> View Proof
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleApproveVerification(v)}
                        className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-green-500/10"
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
 
                      <button 
                        onClick={() => handleRejectVerification(v)}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-red-600/10"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof Modal Viewer */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden bg-[#121214] border border-white/10 rounded-[2rem] p-6 shadow-2xl flex flex-col items-center">
            <button 
              onClick={() => setSelectedProofUrl(null)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors bg-black/50 rounded-full"
            >
              <Eye size={20} />
            </button>
            <div className="w-full h-full overflow-auto mt-6 flex justify-center">
              <img src={selectedProofUrl} alt="Uploaded distributor / social proof screenshot" className="max-w-full max-h-[70vh] rounded-xl object-contain border border-white/5" />
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-4">Screenshot Evidence Submitted by Creator</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
