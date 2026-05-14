import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { OperationType } from '../types';
import { Send, X, Users, MessageSquare } from 'lucide-react';
import { GlassCard } from './UI';
import { motion } from 'motion/react';

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

interface ChatWindowProps {
  chatId: string;
  recipientName: string;
  onClose: () => void;
  isGroup?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ chatId, recipientName, onClose, isGroup }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    }, err => handleFirestoreError(err, OperationType.LIST, `chats/${chatId}/messages`));

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const msg = newMessage;
      setNewMessage('');
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        senderId: user.uid,
        text: msg,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 right-4 w-80 sm:w-96 h-[500px] z-50 flex flex-col"
    >
      <GlassCard className="h-full flex flex-col p-0 overflow-hidden shadow-2xl border-purple-500/30">
        {/* Header */}
        <div className="p-4 gradient-bg text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              {isGroup ? <Users size={16} /> : <MessageSquare size={16} />}
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{recipientName}</p>
              <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">Online</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
          {messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium ${
                  isMe 
                    ? 'bg-purple-600 text-white rounded-tr-none' 
                    : 'bg-white/10 text-white rounded-tl-none border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-[#121214] border-t border-white/5 flex gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Tap to message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-purple-500 transition-all font-medium"
          />
          <button 
            type="submit"
            className="p-2 gradient-bg text-white rounded-xl active:scale-95 transition-all shadow-lg"
          >
            <Send size={16} />
          </button>
        </form>
      </GlassCard>
    </motion.div>
  );
};
