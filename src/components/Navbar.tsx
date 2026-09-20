import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../config/brand';
import {
  Layers,
  Sparkles,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Zap,
  Activity,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenAuth }) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: null },
    { id: 'analyze', label: 'AI Analisis', icon: Sparkles },
    { id: 'parlay', label: 'Parlay Builder', icon: Layers },
    { id: 'pro-tools', label: 'Alat Pro & Asisten', icon: Activity },
    { id: 'history', label: 'Riwayat', icon: null },
    { id: 'plans', label: 'Paket & Kuota', icon: null },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div
          id="brand-logo"
          className="flex cursor-pointer items-center space-x-3 group"
          onClick={() => onSelectTab('dashboard')}
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm transition group-hover:border-blue-400 group-hover:shadow-md">
            <img
              src={BRAND.logoUrl}
              alt="MAX AI Logo"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = BRAND.fallbackLogoUrl;
              }}
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-teko text-2xl font-bold tracking-wider text-slate-900">
                MAX AI
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-200/70">
                ANALYTICS
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 -mt-1 hidden sm:block">
              Sports Analytics & Parlay Engine
            </p>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 bg-slate-100/80 p-1 rounded-full border border-slate-200/90 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onSelectTab(item.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {Icon && <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />}
                <span>{item.label}</span>
              </button>
            );
          })}
          {isAdmin && (
            <button
              id="nav-admin"
              onClick={() => onSelectTab('admin')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center space-x-1.5 ${
                currentTab === 'admin'
                  ? 'bg-amber-500 text-white font-bold shadow-sm'
                  : 'text-amber-700 hover:text-amber-800 hover:bg-amber-100/70'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Right Action / Profile */}
        <div className="flex items-center space-x-3">
          {currentUser && userProfile ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Quota counter pill */}
              <div
                id="quota-pill"
                onClick={() => onSelectTab('plans')}
                className="hidden sm:flex cursor-pointer items-center space-x-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs transition hover:border-blue-300 shadow-sm"
                title="Sisa kuota analisis"
              >
                <Zap className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-slate-500">Kuota:</span>
                <span className="font-bold text-slate-800">
                  {userProfile.analysisUsed}/{userProfile.analysisLimit}
                </span>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {userProfile.subscriptionPlan}
                </span>
              </div>

              {/* Profile button */}
              <button
                id="nav-profile-btn"
                onClick={() => onSelectTab('profile')}
                className={`flex items-center space-x-2 rounded-full border px-3 py-1.5 text-xs font-medium transition shadow-sm ${
                  currentTab === 'profile'
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                }`}
              >
                <UserIcon className="h-3.5 w-3.5 text-blue-500" />
                <span className="max-w-[100px] truncate">{userProfile.name}</span>
              </button>

              {/* Logout button */}
              <button
                id="nav-logout-btn"
                onClick={logout}
                title="Keluar"
                aria-label="Keluar"
                className="rounded-full p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="nav-login-btn"
              onClick={onOpenAuth}
              className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 active:scale-95"
            >
              Masuk / Daftar
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
