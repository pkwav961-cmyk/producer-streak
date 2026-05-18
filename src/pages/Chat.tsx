import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Search, 
  MessageSquare, 
  Users, 
  MoreVertical, 
  Circle,
  Hash,
  ChevronLeft,
  Loader2,
  User,
  CheckCircle2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  getDocs,
  limit,
  setDoc
} from 'firebase/firestore';
import { Chat, Message, UserProfile } from '../types';
import { cn } from '../lib/utils';

export const ChatPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [producers, setProducers] = useState<UserProfile[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [showProducerList, setShowProducerList] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch user's chats
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch messages for active chat
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', activeChat.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [activeChat]);

  // Fetch other producers for discovery
  useEffect(() => {
    async function fetchProducers() {
      const q = query(collection(db, 'users'), limit(20));
      const snapshot = await getDocs(q);
      const filtered = snapshot.docs
        .map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile))
        .filter(p => p.uid !== user?.uid && p.displayName && p.displayName !== 'deleted' && !p.deleted);
      setProducers(filtered);
    }
    fetchProducers();
  }, [user]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || !newMessage.trim() || !user) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
        senderId: user.uid,
        text,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', activeChat.id), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const startChat = async (otherUser: UserProfile) => {
    if (!user) return;
    
    // Check if chat already exists
    const existing = chats.find(c => 
      c.type === 'direct' && c.participants.includes(otherUser.uid)
    );

    if (existing) {
      setActiveChat(existing);
      setShowProducerList(false);
      return;
    }

    // Create new chat
    try {
      const chatData = {
        participants: [user.uid, otherUser.uid],
        updatedAt: serverTimestamp(),
        type: 'direct' as const,
        lastMessage: 'Chat started'
      };
      const docRef = await addDoc(collection(db, 'chats'), chatData);
      setActiveChat({ id: docRef.id, ...chatData } as any);
      setShowProducerList(false);
    } catch (err) {
      console.error("Error creating chat:", err);
    }
  };

  const createGroupChat = async () => {
    if (!user || !groupName.trim() || selectedUsers.length === 0) return;

    try {
      const participants = [user.uid, ...selectedUsers.map(u => u.uid)];
      const chatData = {
        participants,
        updatedAt: serverTimestamp(),
        type: 'group' as const,
        name: groupName,
        lastMessage: `${user.displayName || 'Producer'} created the group`
      };
      const docRef = await addDoc(collection(db, 'chats'), chatData);
      setActiveChat({ id: docRef.id, ...chatData } as any);
      setShowGroupCreator(false);
      setGroupName('');
      setSelectedUsers([]);
    } catch (err) {
      console.error("Error creating group chat:", err);
    }
  };

  const toggleUserSelection = (user: UserProfile) => {
    setSelectedUsers(prev => 
      prev.find(u => u.uid === user.uid) 
        ? prev.filter(u => u.uid !== user.uid)
        : [...prev, user]
    );
  };

  if (!user && !loadingChats) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center p-6">
        <MessageSquare size={64} className="text-white/10 mb-6" />
        <h2 className="text-2xl font-black tracking-tighter uppercase italic">Secure Studio Lines</h2>
        <p className="text-gray-500 max-w-xs mt-2 text-sm">Please sign in to connect with the global producer community.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-[72px] bottom-0 sm:bottom-[110px] bg-[#0a0a0a] flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 border-r border-white/5 flex flex-col bg-[#121214] transition-all",
        activeChat && "hidden md:flex"
      )}>
        <div className="p-6 border-b border-white/5">
           <div className="flex items-center justify-between mb-6">
             <h2 className="text-xl font-black tracking-tighter uppercase italic">Connections</h2>
             <div className="flex gap-2">
               <button 
                 onClick={() => setShowGroupCreator(true)}
                 className="p-2 bg-orange-500 rounded-xl text-white hover:scale-105 transition-transform"
                 title="Create Group Chat"
               >
                 <Users size={18} />
               </button>
               <button 
                 onClick={() => setShowProducerList(true)}
                 className="p-2 bg-purple-500 rounded-xl text-white hover:scale-105 transition-transform"
               >
                 <MessageSquare size={18} />
               </button>
             </div>
           </div>
           <div className="bg-white/5 rounded-2xl flex items-center gap-3 px-4 py-3 border border-white/5 focus-within:border-purple-500/40 transition-colors">
              <Search className="w-4 h-4 text-white/30" />
              <input 
                type="text" 
                placeholder="Search chats..." 
                className="bg-transparent border-none outline-none text-xs w-full placeholder:text-white/20"
              />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingChats ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-purple-500" />
            </div>
          ) : chats.length > 0 ? (
            <div className="p-2 space-y-1">
              {chats.map(chat => (
                <button 
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  className={cn(
                    "w-full p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-white/5 text-left",
                    activeChat?.id === chat.id ? "bg-purple-500/10 border border-purple-500/20" : "border border-transparent"
                  )}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.id}`} 
                        alt="chat" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <Circle className="absolute -bottom-0.5 -right-0.5 text-emerald-500 fill-emerald-500" size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm tracking-tight truncate">
                         {chat.name || "Private Channel"}
                      </p>
                      <span className="text-[9px] text-white/20 font-bold">12:30 PM</span>
                    </div>
                    <p className="text-[10px] text-white/40 truncate italic">{chat.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-600">
               <MessageSquare className="mx-auto mb-4 opacity-20" size={32} />
               <p className="text-[10px] font-black uppercase tracking-widest">No active sessions</p>
            </div>
          )}
        </div>

        {profile && (
          <div className="p-6 border-t border-white/5 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-purple-500 bg-purple-500/10 flex items-center justify-center overflow-hidden">
                {profile.photoURL ? (
                  <img src={profile.photoURL} className="w-full h-full object-cover" />
                ) : (
                  <User size={16} className="text-purple-400" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-tight">{profile.displayName}</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-500 uppercase">Studio Online</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#0a0a0a] relative",
        !activeChat && "hidden md:flex"
      )}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-[#121214]/50 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="p-2 text-white/40 hover:text-white md:hidden">
                  <ChevronLeft />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Hash size={20} />
                  </div>
                  <div>
                    <h3 className="font-black italic tracking-tighter uppercase text-sm">Producer Line</h3>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" /> Secure
                    </p>
                  </div>
                </div>
              </div>
              <button className="p-2 text-white/20 hover:text-white">
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 custom-scrollbar">
              {messages.length > 0 ? messages.map((msg, i) => {
                const isMine = msg.senderId === user?.uid;
                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col max-w-[80%] md:max-w-[60%]",
                      isMine ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-3xl text-sm leading-relaxed",
                      isMine 
                        ? "bg-purple-600 text-white rounded-br-none shadow-2xl shadow-purple-900/40" 
                        : "bg-white/5 border border-white/10 text-gray-300 rounded-bl-none"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] font-bold text-white/10 mt-2 uppercase tracking-widest">
                      {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                    </span>
                  </motion.div>
                );
              }) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/10 mb-4">
                    <MessageSquare size={32} />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-tight text-white/20 italic">Start the collaboration</h4>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="p-6 md:p-10 border-t border-white/5 bg-[#121214]/50">
              <form onSubmit={sendMessage} className="relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Send creative transmission..." 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm focus:outline-none focus:border-purple-500/50 transition-all font-medium pr-16"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-purple-600 rounded-xl text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
             <motion.div 
               animate={{ rotate: [0, 10, -10, 0] }}
               transition={{ duration: 4, repeat: Infinity }}
               className="mb-8"
             >
               <div className="w-32 h-32 rounded-[3rem] border-2 border-dashed border-white/10 flex items-center justify-center text-white/10">
                 <MessageSquare size={48} />
               </div>
             </motion.div>
             <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white/40">Studio Liaison</h3>
             <p className="text-gray-600 max-w-xs mt-2 text-xs uppercase tracking-widest font-black">Select a secure frequency to start collaborating with other producers</p>
             <button 
               onClick={() => setShowProducerList(true)}
               className="mt-8 px-8 py-3 gradient-bg text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
             >
               Find Producers
             </button>
          </div>
        )}
      </div>

      {/* Discovery Modal */}
      <AnimatePresence>
        {showProducerList && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-[3rem] p-8 max-h-[80vh] flex flex-col"
            >
               <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-black italic tracking-tighter uppercase">Producer Portal</h3>
                 <button onClick={() => setShowProducerList(false)} className="text-gray-500 hover:text-white">
                   <X size={24} />
                 </button>
               </div>

               <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar pr-2">
                 {producers.map(p => (
                   <button 
                     key={p.uid}
                     onClick={() => startChat(p)}
                     className="w-full p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 hover:bg-white/10 hover:border-purple-500/30 transition-all text-left"
                   >
                      <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
                        {p.photoURL ? (
                          <img src={p.photoURL} className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm tracking-tight">{p.displayName}</p>
                       <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Level {p.level} • {p.xp.toLocaleString()} XP</p>
                     </div>
                   </button>
                 ))}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Group Creator Modal */}
      <AnimatePresence>
        {showGroupCreator && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-[3rem] p-8 max-h-[80vh] flex flex-col"
            >
               <div className="flex items-center justify-between mb-8">
                 <h3 className="text-2xl font-black italic tracking-tighter uppercase">Create Group Chat</h3>
                 <button onClick={() => setShowGroupCreator(false)} className="text-gray-500 hover:text-white">
                   <X size={24} />
                 </button>
               </div>

               <div className="space-y-6 flex-1">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Group Name</label>
                   <input 
                     type="text" 
                     value={groupName}
                     onChange={(e) => setGroupName(e.target.value)}
                     placeholder="e.g. Beat Makers Collective"
                     className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-500/50 transition-all font-bold text-sm"
                   />
                 </div>

                 <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Select Producers ({selectedUsers.length})</p>
                   <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                     {producers.map(p => (
                       <button 
                         key={p.uid}
                         onClick={() => toggleUserSelection(p)}
                         className={`w-full p-3 bg-white/5 border rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-all text-left ${
                           selectedUsers.find(u => u.uid === p.uid) ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/5'
                         }`}
                       >
                          <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
                            {p.photoURL ? (
                              <img src={p.photoURL} className="w-full h-full object-cover" />
                            ) : (
                              <User size={16} className="text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm tracking-tight">{p.displayName}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Level {p.level}</p>
                          </div>
                          {selectedUsers.find(u => u.uid === p.uid) && (
                            <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                              <CheckCircle2 size={12} className="text-white" />
                            </div>
                          )}
                       </button>
                     ))}
                   </div>
                 </div>

                 <button 
                   onClick={createGroupChat}
                   disabled={!groupName.trim() || selectedUsers.length === 0}
                   className="w-full py-4 gradient-bg text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale"
                 >
                   Create Group Chat
                 </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const X: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
