import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sendContactSubmissionEmail } from '../lib/adminEmails';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  initialName?: string;
}

export const ContactModal: React.FC<ContactModalProps> = ({ 
  isOpen, 
  onClose, 
  initialEmail = '', 
  initialName = '' 
}) => {
  const [step, setStep] = useState<'form' | 'submitting' | 'success'>('form');
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Sync initial inputs when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setEmail(initialEmail);
      setSubject('');
      setMessage('');
      setError('');
      setStep('form');
    }
  }, [isOpen, initialName, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('Please fill in all the fields.');
      return;
    }

    setStep('submitting');

    try {
      // 1. Save to Firestore
      await addDoc(collection(db, 'contactSubmissions'), {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        createdAt: serverTimestamp(),
      });

      // 2. Trigger admin email notification
      const emailResult = await sendContactSubmissionEmail(
        name.trim(),
        email.trim(),
        subject.trim(),
        message.trim()
      );

      if (!emailResult.success) {
        console.warn("Contact form saved to Firestore, but email notification failed:", emailResult.error);
      }

      setStep('success');
    } catch (err: any) {
      console.error("Error submitting contact form:", err);
      setError(err.message || 'Something went wrong. Please try again.');
      setStep('form');
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />
        
        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0e0e10]/95 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl z-10"
        >
          {/* Top aesthetic glow indicator */}
          <div className="absolute top-0 left-0 w-full h-[3px] gradient-bg" />

          {/* Close button */}
          <button 
            onClick={handleClose}
            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all z-20 cursor-pointer"
          >
            <X size={18} />
          </button>

          {step === 'form' && (
            <div className="p-8 md:p-10">
              <div className="mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight italic text-white leading-none">Get In Touch</h2>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1.5">Direct line to Beat Streak support</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Your Name</label>
                    <input 
                      type="text"
                      placeholder="Staz EQ"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                      required
                    />
                  </div>

                  {/* Email field */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email"
                      placeholder="producer@streak.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Subject field */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Subject</label>
                  <input 
                    type="text"
                    placeholder="Feedback, bug report, or business inquiry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    required
                  />
                </div>

                {/* Message field */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Message</label>
                  <textarea 
                    placeholder="Write your message here... We typically respond in under 24 hours!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                    required
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-500/10 p-3 rounded-2xl border border-red-500/10">
                    <AlertCircle size={14} />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full mt-6 gradient-bg py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-white cursor-pointer"
                >
                  <Send size={14} /> Submit Message
                </button>
              </form>
            </div>
          )}

          {step === 'submitting' && (
            <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-14 h-14 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-6" />
              <h2 className="text-xl font-black uppercase tracking-wider italic text-white">Transmitting</h2>
              <p className="text-[9px] text-gray-500 mt-2 font-black uppercase tracking-widest">Routing message to Beat Streak administrators...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight italic text-emerald-400">Message Dispatched!</h2>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-2 leading-relaxed font-bold">
                Thank you! Your message was saved, and an instant alert was pushed to our admin inbox. Staz & the team will get back to you shortly.
              </p>
              
              <button 
                onClick={handleClose}
                className="w-full mt-8 bg-white/5 border border-white/10 hover:bg-white/10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white transition-all hover:scale-105 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
