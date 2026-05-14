import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { TimerProvider } from './lib/TimerContext';
import { Layout } from './components/UI';
import { Music2, Flame, Zap, Trophy, Clock } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { TimerPage } from './pages/Timer';
import { GoalsPage } from './pages/Goals';
import { ChallengesPage } from './pages/Challenges';
import { SocialPage } from './pages/Social';
import { ChatPage } from './pages/Chat';
import { ProfilePage } from './pages/Profile';
import { SessionsPage } from './pages/Sessions';
import { MatcherPage } from './pages/Matcher';
import { motion } from 'motion/react';
import { db } from './lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

function AppContent() {
  const { user, loading, authError, loginWithEmail, signUpWithEmail, clearError } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [showAdminLogin, setShowAdminLogin] = useState(false);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const adminEmails = ['prodbysean21@gmail.com', 'sanjosean96@gmail.com'];
    if (adminEmails.includes(email.toLowerCase()) && password === 'seansanjo123#') {
      setFormLoading(true);
      try {
        await loginWithEmail(email, password);
      } catch (err) {
        await signUpWithEmail(email, password, 'Admin');
      } finally {
        setFormLoading(false);
      }
    } else {
      alert("Invalid Admin Credentials");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
      } else {
        await loginWithEmail(email, password);
      }
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 animate-pulse">
          Initializing Studio...
        </p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'timer': return <TimerPage />;
      case 'goals': return <GoalsPage />;
      case 'challenges': return <ChallengesPage />;
      case 'social': return <SocialPage setActiveTab={setActiveTab} />;
      case 'chat': return <ChatPage />;
      case 'profile': return <ProfilePage />;
      case 'sessions': return <SessionsPage />;
      case 'matcher': return <MatcherPage />;
      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {authError && (
        <div className="fixed top-4 right-4 z-[100] max-w-sm p-4 bg-red-500/20 border border-red-500/30 backdrop-blur-xl rounded-2xl text-red-400 text-xs flex justify-between gap-4 animate-in fade-in slide-in-from-top-4">
          <span>{authError}</span>
          <button onClick={clearError} className="font-bold opacity-50 hover:opacity-100 transition-opacity">X</button>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <AppContent />
      </TimerProvider>
    </AuthProvider>
  );
}
