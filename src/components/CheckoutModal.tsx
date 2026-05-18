import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [error, setError] = useState('');

  const handleCardInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    // Format as 4 groups of 4
    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    setCardNumber(formatted);
  };

  const handleExpiryInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setExpiry(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Remove spaces for validation
    const rawCard = cardNumber.replace(/\s/g, '');

    if (rawCard !== '4242424242424242') {
      setError('Card declined. Please use test card 4242 4242 4242 4242');
      return;
    }

    if (expiry.length < 5 || cvc.length < 3) {
      setError('Please complete all card details');
      return;
    }

    setStep('processing');
    
    // Simulate API call to Stripe
    setTimeout(() => {
      setStep('success');
    }, 2000);
  };

  const resetAndClose = () => {
    setTimeout(() => {
      setStep('form');
      setCardNumber('');
      setExpiry('');
      setCvc('');
      setError('');
    }, 300);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetAndClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
        >
          {/* Close button */}
          <button 
            onClick={resetAndClose}
            className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X size={20} />
          </button>

          {step === 'form' && (
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Complete Order</h2>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Upgrade to Producer Streak Pro</p>
              </div>

              {/* Order Summary */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-gray-300">Pro Plan (Monthly)</span>
                  <span className="text-sm font-black text-white">€1.99</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 font-bold uppercase tracking-widest">
                  <span>Billed today</span>
                  <span>Total: €1.99</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Card Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={handleCardInput}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Expiry Date</label>
                    <input 
                      type="text"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={handleExpiryInput}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">CVC</label>
                    <input 
                      type="text"
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 4) setCvc(val);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center mt-2 bg-red-500/10 py-2 rounded-lg">{error}</p>
                )}

                <button 
                  type="submit"
                  className="w-full mt-6 gradient-bg py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-purple-500/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                >
                  <Lock size={16} /> Pay €1.99
                </button>
                
                <div className="flex items-center justify-center gap-1.5 mt-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                  <ShieldCheck size={12} />
                  <span>Payments are secure and encrypted</span>
                </div>
              </form>
            </div>
          )}

          {step === 'processing' && (
            <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-6" />
              <h2 className="text-xl font-black uppercase tracking-widest">Processing Payment</h2>
              <p className="text-sm text-gray-500 mt-2 font-bold uppercase tracking-widest">Please don't close this window</p>
            </div>
          )}

          {step === 'success' && (
            <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="w-20 h-20 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-widest mb-2 text-green-400">Payment Successful!</h2>
              <p className="text-sm text-gray-400 mb-8 font-bold">You are now upgraded to Producer Streak Pro.</p>
              
              <button 
                onClick={resetAndClose}
                className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
