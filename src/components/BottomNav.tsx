import React from 'react';
import { Home, Sparkles, Layers, History, User, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab, onOpenAuth }) => {
  const { currentUser, isAdmin } = useAuth();

  const handleTabClick = (tab: string) => {
    if ((tab === 'analyze' || tab === 'parlay' || tab === 'history' || tab === 'profile') && !currentUser) {
      onOpenAuth();
      return;
    }
    onSelectTab(tab);
  };

  return (
    <div
      id="mobile-bottom-nav"
      className="fixed bottom-3 left-3 right-3 z-40 block md:hidden"
    >
      <div className="mx-auto max-w-md rounded-full border border-slate-200 bg-white/95 backdrop-blur-2xl shadow-xl shadow-slate-300/40 px-2.5 py-1.5">
        <div className="grid grid-cols-6 gap-0.5 text-center items-center">
          <button
            id="btn-nav-home"
            onClick={() => handleTabClick('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition rounded-full ${
              currentTab === 'dashboard' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Home className="h-4 w-4" />
            <span className="text-[9px] mt-0.5">Home</span>
            {currentTab === 'dashboard' && (
              <span className="h-1 w-1 rounded-full bg-blue-600 mt-0.5" />
            )}
          </button>

          <button
            id="btn-nav-analyze"
            onClick={() => handleTabClick('analyze')}
            className={`flex flex-col items-center justify-center py-1 transition rounded-full ${
              currentTab === 'analyze' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span className="text-[9px] mt-0.5">Analisis</span>
            {currentTab === 'analyze' && (
              <span className="h-1 w-1 rounded-full bg-blue-600 mt-0.5" />
            )}
          </button>

          <button
            id="btn-nav-parlay"
            onClick={() => handleTabClick('parlay')}
            className={`flex flex-col items-center justify-center py-1 transition rounded-full ${
              currentTab === 'parlay' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span className="text-[9px] mt-0.5">Parlay</span>
            {currentTab === 'parlay' && (
              <span className="h-1 w-1 rounded-full bg-blue-600 mt-0.5" />
            )}
          </button>

          <button
            id="btn-nav-pro-tools"
            onClick={() => handleTabClick('pro-tools')}
            className={`flex flex-col items-center justify-center py-1 transition rounded-full ${
              currentTab === 'pro-tools' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span className="text-[9px] mt-0.5">Alat Pro</span>
            {currentTab === 'pro-tools' && (
              <span className="h-1 w-1 rounded-full bg-blue-600 mt-0.5" />
            )}
          </button>

          <button
            id="btn-nav-history"
            onClick={() => handleTabClick('history')}
            className={`flex flex-col items-center justify-center py-1 transition rounded-full ${
              currentTab === 'history' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="h-4 w-4" />
            <span className="text-[9px] mt-0.5">Riwayat</span>
            {currentTab === 'history' && (
              <span className="h-1 w-1 rounded-full bg-blue-600 mt-0.5" />
            )}
          </button>

          {isAdmin ? (
            <button
              id="btn-nav-admin"
              onClick={() => handleTabClick('admin')}
              className={`flex flex-col items-center justify-center py-1 transition rounded-full ${
                currentTab === 'admin' ? 'text-amber-600 font-semibold' : 'text-amber-700/70 hover:text-amber-800'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[9px] mt-0.5">Admin</span>
              {currentTab === 'admin' && (
                <span className="h-1 w-1 rounded-full bg-amber-500 mt-0.5" />
              )}
            </button>
          ) : (
            <button
              id="btn-nav-profile"
              onClick={() => handleTabClick('profile')}
              className={`flex flex-col items-center justify-center py-1 transition rounded-full ${
                currentTab === 'profile' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="h-4 w-4" />
              <span className="text-[9px] mt-0.5">Profil</span>
              {currentTab === 'profile' && (
                <span className="h-1 w-1 rounded-full bg-blue-600 mt-0.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
