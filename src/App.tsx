import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { TimerProvider } from './lib/TimerContext';
import { Layout } from './components/UI';
import { Dashboard } from './pages/Dashboard';
import { TimerPage } from './pages/Timer';
import { GoalsPage } from './pages/Goals';
import { ChallengesPage } from './pages/Challenges';
import { SocialPage } from './pages/Social';
import { ChatPage } from './pages/Chat';
import { ProfilePage } from './pages/Profile';
import { SessionsPage } from './pages/Sessions';
import { MatcherPage } from './pages/Matcher';
import { AdminPage } from './pages/Admin';
import { OutreachPage } from './pages/Outreach';
import { Landing } from './pages/Landing';
import { BeatsPage } from './pages/Beats';
import { Onboarding } from './pages/Onboarding';
import { Leaderboard } from './pages/Leaderboard';
import { VerifiedProfile } from './pages/VerifiedProfile';
import { ProPaywall } from './components/ProPaywall';

// Import your actual Auth forms component
import { AuthForms } from './components/auth/AuthForms'; 

function AppContent() {
  // Pull user context to see if someone is signed in
  const { user, loading, authError, clearError, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingApp, setViewingApp] = useState(() => {
    return sessionStorage.getItem('viewed_landing') === 'true';
  });

  React.useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash.replace('#', '');
      if (h) setActiveTab(h);
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // 1. Show the loading spinner while Firebase initializes the session
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

  const isBeforeJune22 = new Date() < new Date('2026-06-23');
  const handleEnterApp = () => {
    sessionStorage.setItem('viewed_landing', 'true');
    setViewingApp(true);
  };

  // 2. Gatekeeper: If not viewing the app yet, or before June 22 for non-admins/non-early-access, show Landing Page.
  const hasEarlyAccess = user && isAdmin;
  if (!viewingApp || (isBeforeJune22 && (!user || !hasEarlyAccess))) {
    return <Landing onEnterApp={handleEnterApp} />;
  }

  // 2.5. Gatekeeper fallback
  if (!user) {
    return (
      <>
        {authError && (
          <div className="fixed top-4 right-4 z-[100] max-w-sm p-4 bg-red-500/20 border border-red-500/30 backdrop-blur-xl rounded-2xl text-red-400 text-xs flex justify-between gap-4">
            <span>{authError}</span>
            <button onClick={clearError} className="font-bold opacity-50 hover:opacity-100 transition-opacity">X</button>
          </div>
        )}
        <AuthForms />
      </>
    );
  }

  // 3. Show Onboarding if not complete (Skip for Admins)
  const { profile } = useAuth();
  if (user && profile && !profile.onboardingComplete && !isAdmin) {
    return (
      <Onboarding 
        onComplete={() => {}} 
        onBackToLogin={async () => {
          const { auth } = await import('./lib/firebase');
          await auth.signOut();
          sessionStorage.removeItem('viewed_landing');
          setViewingApp(false);
        }} 
      />
    );
  }

  // 4. Normal Authenticated App Content View Router
  const renderContent = () => {
    const isPro = profile?.plan === 'pro' || isAdmin;
    if (!isPro && (activeTab === 'outreach' || activeTab === 'verified')) {
      return <ProPaywall />;
    }

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
      case 'outreach': return <OutreachPage />;
      case 'admin': return <AdminPage />;
      case 'beats': return <BeatsPage />;
      case 'leaderboard': return <Leaderboard />;
      case 'verified': return <VerifiedProfile />;
      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {authError && (
          <div className="fixed top-4 right-4 z-[100] max-w-sm p-4 bg-red-500/20 border border-red-500/30 backdrop-blur-xl rounded-2xl text-red-400 text-xs flex justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <span>{authError}</span>
            <button onClick={clearError} className="font-bold opacity-50 hover:opacity-100 transition-opacity">X</button>
          </div>
        )}
        {renderContent()}
      </Layout>
    </>
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