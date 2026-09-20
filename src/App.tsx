import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { SubscriptionAlert } from './components/SubscriptionAlert';
import { DashboardView } from './views/DashboardView';
import { AnalyzeView } from './views/AnalyzeView';
import { ParlayView } from './views/ParlayView';
import { HistoryView } from './views/HistoryView';
import { PlansView } from './views/PlansView';
import { ProfileView } from './views/ProfileView';
import { AdminView } from './views/AdminView';
import { ProToolsView } from './views/ProToolsView';
import { seedPlansIfEmpty } from './services/firestoreService';

function MainApp() {
  const { loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [tabState, setTabState] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Seed default plans if empty in Firestore on initial app launch
  useEffect(() => {
    seedPlansIfEmpty().catch((err) => {
      console.warn('Initial plans check completed or deferred:', err);
    });
  }, []);

  const handleNavigate = (tab: string, state?: any) => {
    setCurrentTab(tab);
    setTabState(state || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative">
      {/* Aesthetic white gradient mesh with soft user-friendly tones */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-blue-100/70 via-indigo-50/40 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-sky-100/50 via-emerald-50/30 to-transparent blur-[140px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Subscription & Quota Expiry Alert (Rekomendasi 8) */}
      <SubscriptionAlert onNavigate={handleNavigate} />

      {/* Main Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-12">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'analyze' && (
          <AnalyzeView
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'parlay' && (
          <ParlayView
            incomingState={tabState}
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'plans' && (
          <PlansView
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'pro-tools' && (
          <ProToolsView
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'admin' && (
          <AdminView onOpenAuth={() => setAuthModalOpen(true)} />
        )}
      </main>

      {/* Mobile Sticky Bottom Navigation (Rule 27) */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigate(tab)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
