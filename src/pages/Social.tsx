import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Globe, 
  Search, 
  Flame,
  TrendingUp,
  Crown,
  Loader2,
  MessageSquare,
  UserPlus,
  Check,
  X as CloseIcon,
  UserCheck,
  Clock,
  Rss,
  Activity,
  User,
  UserX,
  Ban
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  onSnapshot,
  deleteDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { UserProfile, Friendship, ProductionSession, Beat } from '../types';
import { ProducerProfileModal } from '../components/ProducerProfileModal';

interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  type: 'session' | 'beat' | 'streak';
  data: any;
  createdAt: string;
}

export const SocialPage: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  const { user, profile } = useAuth();
  const [filter, setFilter] = useState<'global' | 'friends' | 'requests' | 'feed'>('feed');
  const [producers, setProducers] = useState<UserProfile[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  
  // Selected producer for modal
  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Sync friendships
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFriendships(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Friendship)));
    });

    return () => unsubscribe();
  }, [user]);

  // Sync following
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'follows'),
      where('followerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFollowingIds(snapshot.docs.map(doc => doc.data().followingId));
    });

    return () => unsubscribe();
  }, [user]);

  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  // Sync blocked users
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'blocks'),
      where('blockerId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBlockedIds(snapshot.docs.map(doc => doc.data().blockedId));
    });
    return () => unsubscribe();
  }, [user]);

  const handleUnfriend = async (friendshipId: string) => {
    if (!confirm("Are you sure you want to disconnect/unfriend this creator?")) return;
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
      alert("Successfully unfriended/disconnected.");
    } catch (err) {
      console.error("Failed to unfriend:", err);
      alert("Failed to unfriend. Please try again.");
    }
  };

  const handleBlock = async (targetUid: string) => {
    if (!confirm("Are you sure you want to block this creator? They will no longer appear in your roster, and you will not be able to message each other.")) return;
    try {
      // 1. Add block doc
      await addDoc(collection(db, 'blocks'), {
        blockerId: user?.uid,
        blockedId: targetUid,
        createdAt: new Date().toISOString()
      });

      // 2. Clear any existing friendships
      const match1 = friendships.find(f => f.users.includes(targetUid));
      if (match1) {
        await deleteDoc(doc(db, 'friendships', match1.id));
      }
      alert("Creator successfully blocked.");
    } catch (err) {
      console.error("Failed to block creator:", err);
      alert("Failed to block. Please try again.");
    }
  };

  // Fetch feed activities
  useEffect(() => {
    if (filter !== 'feed' || followingIds.length === 0) {
      if (filter === 'feed' && followingIds.length === 0) setFeed([]);
      return;
    }

    async function fetchFeed() {
      setLoading(true);
      try {
        // Fetch sessions and beats from followed users
        // Note: For large follow lists, we'd need multiple queries or a flattened activity collection
        const ids = followingIds.slice(0, 10); // Firestore 'in' limit
        
        const sessionsQ = query(
          collection(db, 'sessions'),
          where('userId', 'in', ids),
          orderBy('startTime', 'desc'),
          limit(10)
        );
        
        const beatsQ = query(
          collection(db, 'beats'),
          where('userId', 'in', ids),
          orderBy('createdAt', 'desc'),
          limit(10)
        );

        const [sessionsSnap, beatsSnap] = await Promise.all([
          getDocs(sessionsQ),
          getDocs(beatsQ)
        ]);

        const activities: ActivityItem[] = [];

        // Fetch user profiles for these activities
        const userIds = Array.from(new Set([
          ...sessionsSnap.docs.map(d => d.data().userId),
          ...beatsSnap.docs.map(d => d.data().userId)
        ]));

        const userProfiles: Record<string, UserProfile> = {};
        await Promise.all(userIds.map(async (uid) => {
          const uSnap = await getDoc(doc(db, 'users', uid));
          if (uSnap.exists()) {
            userProfiles[uid] = { ...uSnap.data(), uid: uSnap.id } as UserProfile;
          }
        }));

        sessionsSnap.docs.forEach(doc => {
          const data = doc.data();
          const u = userProfiles[data.userId];
          if (u) {
            activities.push({
              id: doc.id,
              userId: data.userId,
              userName: u.displayName,
              userPhoto: u.photoURL,
              type: 'session',
              data,
              createdAt: data.startTime
            });
          }
        });

        beatsSnap.docs.forEach(doc => {
          const data = doc.data();
          const u = userProfiles[data.userId];
          if (u) {
            activities.push({
              id: doc.id,
              userId: data.userId,
              userName: u.displayName,
              userPhoto: u.photoURL,
              type: 'beat',
              data,
              createdAt: data.createdAt
            });
          }
        });

        const filteredActivities = activities.filter(act => !blockedIds.includes(act.userId));
        setFeed(filteredActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        console.error("Error fetching feed:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFeed();
  }, [filter, followingIds, blockedIds]);
  useEffect(() => {
    async function fetchProducers() {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        
        if (filter === 'global') {
          const q = query(usersRef, orderBy('xp', 'desc'), limit(50));
          const snapshot = await getDocs(q);
          const users = snapshot.docs
            .map(doc => ({ ...doc.data(), uid: doc.id }) as UserProfile)
            .filter(u => u.displayName && u.displayName !== 'deleted' && !u.deleted && !['Producer', 'Guest Producer', 'Guest'].includes(u.displayName.trim()));
          setProducers(users);
        } else if (filter === 'friends') {
          const acceptedFriendIds = friendships
            .filter(f => f.status === 'accepted')
            .map(f => f.users.find(id => id !== user?.uid))
            .filter(Boolean) as string[];
          
          if (acceptedFriendIds.length === 0) {
            setProducers([]);
          } else {
            // Firestore 'in' limit is 10, for larger friend lists we'd need multiple queries
            const q = query(usersRef, where('__name__', 'in', acceptedFriendIds.slice(0, 10)));
            const snapshot = await getDocs(q);
            setProducers(snapshot.docs
              .map(doc => ({ ...doc.data(), uid: doc.id }) as UserProfile)
              .filter(u => u.displayName && u.displayName !== 'deleted' && !u.deleted)
            );
          }
        }
      } catch (err) {
        console.error("Error fetching producers:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducers();
  }, [filter, friendships, user]);

  const getFriendshipStatus = (otherUid: string) => {
    const f = friendships.find(f => f.users.includes(otherUid));
    if (!f) return null;
    return f;
  };

  const sendFriendRequest = async (targetUid: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'friendships'), {
        users: [user.uid, targetUid],
        status: 'pending',
        requestedBy: user.uid,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to send request:", err);
    }
  };

  const updateFriendship = async (fid: string, status: 'accepted' | 'declined') => {
    try {
      if (status === 'declined') {
        await deleteDoc(doc(db, 'friendships', fid));
      } else {
        await updateDoc(doc(db, 'friendships', fid), { status });
      }
    } catch (err) {
      console.error("Failed to update friendship:", err);
    }
  };

  const handleStartChat = async (otherUser: UserProfile) => {
    if (!user) {
      alert("Sign in to chat with other producers!");
      return;
    }

    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', user.uid));
      const snapshot = await getDocs(q);
      
      let existingChat = snapshot.docs.find(doc => {
        const data = doc.data();
        return data.type === 'direct' && data.participants.includes(otherUser.uid);
      });

      if (!existingChat) {
        await addDoc(chatsRef, {
          participants: [user.uid, otherUser.uid],
          updatedAt: serverTimestamp(),
          type: 'direct',
          lastMessage: `Connected with ${profile?.displayName || 'a producer'}`
        });
      }
      setActiveTab('chat');
    } catch (err) {
      console.error("Failed to start chat:", err);
    }
  };

  const filteredProducers = producers.filter(p => 
    !blockedIds.includes(p.uid) &&
    p.displayName &&
    p.displayName !== 'deleted' &&
    !(p as any).deleted &&
    p.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = friendships.filter(f => f.status === 'pending' && f.requestedBy !== user?.uid);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/5 p-1 rounded-xl glass border-white/5">
        <button 
          onClick={() => setFilter('feed')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            filter === 'feed' ? "bg-white/10 text-purple-500 shadow-xl" : "text-white/40"
          )}
        >
          <Rss className="w-3.5 h-3.5" /> Feed
        </button>
        <button 
          onClick={() => setFilter('global')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            filter === 'global' ? "bg-white/10 text-purple-500 shadow-xl" : "text-white/40"
          )}
        >
          <Globe className="w-3.5 h-3.5" /> Global
        </button>
        <button 
          onClick={() => setFilter('friends')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
            filter === 'friends' ? "bg-white/10 text-purple-500 shadow-xl" : "text-white/40"
          )}
        >
          <Users className="w-3.5 h-3.5" /> Friends
        </button>
        <button 
          onClick={() => setFilter('requests')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all relative",
            filter === 'requests' ? "bg-white/10 text-purple-500 shadow-xl" : "text-white/40"
          )}
        >
          <Clock className="w-3.5 h-3.5" /> Requests
          {pendingRequests.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl flex items-center gap-3 px-4 py-3 border border-white/5 mb-2 focus-within:border-purple-500/40 transition-colors">
        <Search className="w-4 h-4 text-white/30" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search global roster..." 
          className="bg-transparent border-none outline-none text-sm w-full placeholder:text-white/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {filter === 'feed' && (
            <div className="space-y-4">
              {feed.length === 0 ? (
                <div className="p-12 text-center text-gray-600 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                  <Activity className="mx-auto mb-4 opacity-20" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1">Your transmission line is quiet</p>
                  <p className="text-[9px] text-gray-500">Follow more producers to see their studio activity.</p>
                </div>
              ) : (
                feed.map(item => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/5 border border-white/5 p-5 rounded-[2rem] flex gap-4"
                  >
                    <div 
                      className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer"
                      onClick={() => {
                        setSelectedProducerId(item.userId);
                        setIsProfileModalOpen(true);
                      }}
                    >
                      {item.userPhoto ? (
                        <img 
                          src={item.userPhoto} 
                          className="w-full h-full object-cover" 
                          alt="feed"
                        />
                      ) : (
                        <User size={16} className="text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold tracking-tight">
                          <span 
                            className="text-purple-400 cursor-pointer hover:underline"
                            onClick={() => {
                              setSelectedProducerId(item.userId);
                              setIsProfileModalOpen(true);
                            }}
                          >
                            {item.userName}
                          </span>
                          {item.type === 'session' ? (
                            <span className="text-gray-400 font-normal"> logged a session</span>
                          ) : (
                            <span className="text-gray-400 font-normal"> uploaded a new transmission</span>
                          )}
                        </p>
                        <span className="text-[9px] font-bold text-gray-600 uppercase">
                          {new Date(item.createdAt).toLocaleDateString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="mt-3 bg-black/40 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                             {item.type === 'session' ? <Activity size={18} /> : <TrendingUp size={18} />}
                           </div>
                           <div>
                             <p className="text-xs font-bold">{item.type === 'session' ? `${item.data.durationMinutes} Minute Session` : item.data.title}</p>
                             <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">{item.type === 'session' ? (item.data.type || 'Production') : (item.data.genre || 'Beat')}</p>
                           </div>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {filter === 'requests' && (
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="p-12 text-center text-gray-600">
                  <UserPlus className="mx-auto mb-4 opacity-20" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No pending studio invitations</p>
                </div>
              ) : (
                pendingRequests.map(req => (
                   <RequestRow key={req.id} friendship={req} onUpdate={updateFriendship} />
                ))
              )}
            </div>
          )}

          {(filter === 'global' || filter === 'friends') && (
            <>
              {filteredProducers.length === 0 ? (
                <div className="p-12 text-center text-gray-600">
                  <Users className="mx-auto mb-4 opacity-20" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No producers found</p>
                </div>
              ) : (
                filteredProducers.map((player) => {
                  const fs = getFriendshipStatus(player.uid);
                  return (
                    <motion.div 
                      key={player.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "bg-white/5 backdrop-blur-xl p-4 flex items-center justify-between border border-white/5 rounded-[2rem] transition-all",
                        player.uid === profile?.uid && "border-purple-500/40 bg-purple-500/5 ring-1 ring-purple-500/20"
                      )}
                    >
                      <div 
                        className="flex items-center gap-4 cursor-pointer group/item"
                        onClick={() => {
                          setSelectedProducerId(player.uid);
                          setIsProfileModalOpen(true);
                        }}
                      >
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden group-hover/item:border-purple-500 transition-colors">
                            {player.photoURL ? (
                              <img src={player.photoURL} className="w-full h-full object-cover" alt="row" />
                            ) : (
                              <User size={20} className="text-gray-500" />
                            )}
                          </div>
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0a0a0a]",
                            player.xp > 5000 ? "bg-purple-500" : "bg-emerald-500"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <p className="text-base font-black tracking-tighter group-hover/item:text-purple-400 transition-colors">{player.displayName}</p>
                             {player.xp > 10000 && <Crown size={12} className="text-purple-500" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest font-mono">LVL {player.level}</span>
                            <div className="flex items-center gap-0.5">
                              <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                              <span className="text-[10px] font-bold text-orange-500">{player.streakCount}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {player.uid !== user?.uid && (
                          <div className="flex items-center gap-2">
                            {/* Friend Button */}
                            {!fs ? (
                              <button 
                                onClick={() => sendFriendRequest(player.uid)}
                                className="p-3 bg-white/5 text-white/40 rounded-2xl hover:bg-white/10 hover:text-white transition-all"
                                title="Add Friend"
                              >
                                <UserPlus size={18} />
                              </button>
                            ) : fs.status === 'pending' ? (
                              <button 
                                onClick={() => handleUnfriend(fs.id)}
                                className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl hover:bg-red-500/20 hover:text-red-400 transition-all animate-pulse" 
                                title="Cancel Request"
                              >
                                <Clock size={18} />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleUnfriend(fs.id)}
                                className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl hover:bg-red-500/20 hover:text-red-400 transition-all group" 
                                title="Unfriend"
                              >
                                <UserCheck size={18} className="group-hover:hidden" />
                                <UserX size={18} className="hidden group-hover:block text-red-400" />
                              </button>
                            )}

                            {/* Block Button */}
                            <button 
                              onClick={() => handleBlock(player.uid)}
                              className="p-3 bg-white/5 text-white/20 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all"
                              title="Block Creator"
                            >
                              <Ban size={18} />
                            </button>

                            {/* Chat Button */}
                            <button 
                              onClick={() => handleStartChat(player)}
                              className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl hover:bg-purple-500 hover:text-white transition-all shadow-lg"
                              title="Message"
                            >
                              <MessageSquare size={18} />
                            </button>
                          </div>
                        )}
                        <div className="text-right ml-2 min-w-[70px]">
                          <p className="text-xs font-black font-mono tracking-tighter text-white/60">{player.xp.toLocaleString()}</p>
                          <p className="text-[8px] text-white/20 uppercase font-bold tracking-widest">XP</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </>
          )}
        </div>
      )}

      {profile && (
        <div className="bg-[#121214] p-4 border border-purple-500/40 bg-purple-500/10 rounded-2xl flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.5)] mt-4">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-purple-500 bg-purple-500/10 flex items-center justify-center overflow-hidden">
                {profile.photoURL ? (
                  <img src={profile.photoURL} className="w-full h-full object-cover" alt="you" />
                ) : (
                  <User size={16} className="text-purple-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-tighter">{profile.displayName}</p>
                <p className="text-[9px] text-purple-500/60 font-bold uppercase">LEVEL {profile.level} {profile.roles?.length ? profile.roles.join(', ') : profile.role || 'PRODUCER'}</p>
              </div>
           </div>
           <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-black font-mono text-purple-500">{profile.xp.toLocaleString()} XP</span>
           </div>
        </div>
      )}

      {selectedProducerId && (
        <ProducerProfileModal 
          userId={selectedProducerId}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          friendship={getFriendshipStatus(selectedProducerId)}
          onSendRequest={sendFriendRequest}
          onStartChat={handleStartChat}
        />
      )}
    </div>
  );
};

const RequestRow: React.FC<{ 
  friendship: Friendship; 
  onUpdate: (id: string, status: 'accepted' | 'declined') => void 
}> = ({ friendship, onUpdate }) => {
  const [sender, setSender] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchSender() {
      const snap = await getDoc(doc(db, 'users', friendship.requestedBy));
      if (snap.exists()) {
        setSender({ ...snap.data(), uid: snap.id } as UserProfile);
      }
    }
    fetchSender();
  }, [friendship.requestedBy]);

  if (!sender || sender.deleted || sender.displayName === 'deleted') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-[2rem] flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
          {sender.photoURL ? (
            <img src={sender.photoURL} className="w-full h-full object-cover" alt="sender" />
          ) : (
            <User size={18} className="text-gray-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-bold">{sender.displayName}</p>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">Wants to connect</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onUpdate(friendship.id, 'accepted')}
          className="p-3 bg-emerald-500 text-white rounded-2xl hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20"
        >
          <Check size={18} />
        </button>
        <button 
          onClick={() => onUpdate(friendship.id, 'declined')}
          className="p-3 bg-white/5 text-gray-400 rounded-2xl hover:bg-red-500/20 hover:text-red-500 transition-all"
        >
          <CloseIcon size={18} />
        </button>
      </div>
    </motion.div>
  );
};
