import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserAnalyses } from '../services/firestoreService';
import { SavedAnalysis } from '../types';
import { BRAND } from '../config/brand';
import {
  Sparkles,
  Layers,
  History,
  Upload,
  Zap,
  TrendingUp,
  ArrowRight,
  Shield,
  Calendar,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Activity,
  Send,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string, state?: any) => void;
  onOpenAuth: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();
  const [recentAnalyses, setRecentAnalyses] = useState<SavedAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (currentUser?.uid) {
      setLoadingHistory(true);
      getUserAnalyses(currentUser.uid)
        .then((data) => {
          setRecentAnalyses(data.slice(0, 5));
        })
        .catch((err) => {
          console.error('Error fetching recent analyses:', err);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    } else {
      setRecentAnalyses([]);
    }
  }, [currentUser]);

  const used = userProfile?.analysisUsed || 0;
  const limit = userProfile?.analysisLimit || 3;
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  return (
    <div id="dashboard-view" className="space-y-8 animate-in fade-in pb-16 max-w-7xl mx-auto">
      {/* Hero Card with Aesthetic White & Soft Gradient */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/80 to-blue-50/40 p-6 sm:p-9 shadow-sm">
        {/* Subtle decorative mesh */}
        <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 rounded-full bg-blue-50 px-3 py-1 border border-blue-200/80 text-xs font-semibold text-blue-700 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Sports Quantitative Engine</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {currentUser
                ? `Selamat Datang, ${userProfile?.name || 'Analis'}`
                : 'Analisis Olahraga & Tiket Parlay Berbasis Data Riil'}
            </h1>

            <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
              Kombinasikan pengenalan visual jadwal pertandingan dengan analisis statistik faktual. Bebas data dummy, tanpa bias moneyline, dan mengutamakan nilai spread serta total odds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {currentUser ? (
              <>
                <button
                  id="dash-btn-upload"
                  onClick={() => onNavigate('analyze')}
                  className="flex items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 active:scale-95"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Jadwal</span>
                </button>
                <button
                  id="dash-btn-parlay"
                  onClick={() => onNavigate('parlay')}
                  className="flex items-center justify-center space-x-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-xs sm:text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 shadow-xs"
                >
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Parlay Builder</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500"
              >
                <span>Mulai Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status Metrics Strip */}
        {currentUser && userProfile && (
          <div className="mt-8 pt-6 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Plan pill card */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-blue-300 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Paket Langganan</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                  {userProfile.subscriptionStatus.toUpperCase()}
                </span>
              </div>
              <div className="font-teko text-3xl font-bold tracking-wide text-slate-900">
                {userProfile.subscriptionPlan}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {userProfile.subscriptionEnd
                  ? `Aktif s/d: ${new Date(userProfile.subscriptionEnd).toLocaleDateString('id-ID')}`
                  : 'Paket dasar sistem'}
              </div>
            </div>

            {/* Quota Progress */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 transition hover:border-blue-300 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>Kuota Analisis</span>
                <span className="font-bold text-slate-900">
                  {used} / {limit}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    percentage >= 100
                      ? 'bg-rose-500'
                      : percentage >= 75
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2">
                <span>Terpakai {percentage}%</span>
                <span className="font-semibold text-blue-600">Sisa {remaining} analisis</span>
              </div>
            </div>

            {/* Data Integrity */}
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 flex flex-col justify-between transition hover:border-blue-300 shadow-xs">
              <div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 mb-1">
                  <Shield className="h-3.5 w-3.5 text-blue-600" />
                  <span>Prinsip Analisis Kuantitatif</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Riset real-time, evaluasi pasar spread & total, verifikasi sumber terpercaya.
                </p>
              </div>
              <button
                onClick={() => onNavigate('plans')}
                className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <span>Kelola paket kuota</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Telegram Community Quick Access Card */}
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-blue-50 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-sm shrink-0">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Grup Telegram Analis AI Parlay</h3>
            <p className="text-xs text-slate-600">
              Bergabung bersama komunitas analis untuk berbagi prediksi, insight pertandingan, & strategi parlay harian.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
          <a
            href={BRAND.telegramGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:from-sky-400 hover:to-blue-500 transition"
          >
            <span>Gabung Grup Telegram</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Fitur Utama
          </h2>
          <span className="text-xs text-slate-500">Pilih modul kerja</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            id="qa-upload"
            onClick={() => onNavigate('analyze')}
            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md shadow-xs"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-4 group-hover:text-blue-600 transition">
              Upload Jadwal
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Ekstrak seluruh pertandingan dari screenshot jadwal menggunakan OCR vision cerdas.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 space-x-1">
              <span>Buka Upload</span>
              <ChevronRight className="h-3 w-3 transition group-hover:translate-x-1" />
            </div>
          </div>

          <div
            id="qa-analyze"
            onClick={() => onNavigate('analyze')}
            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md shadow-xs"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-4 group-hover:text-blue-600 transition">
              Analisis Pertandingan
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Kajian form terkini, cedera pemain kunci, tren skor, margin handicap, dan total point/goal.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 space-x-1">
              <span>Mulai Analisis</span>
              <ChevronRight className="h-3 w-3 transition group-hover:translate-x-1" />
            </div>
          </div>

          <div
            id="qa-parlay"
            onClick={() => onNavigate('parlay')}
            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md shadow-xs"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-4 group-hover:text-blue-600 transition">
              Parlay Builder
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Kombinasikan leg terbaik, kalkulasi total payout, probabilitas gabungan, dan evaluasi risiko.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 space-x-1">
              <span>Buka Builder</span>
              <ChevronRight className="h-3 w-3 transition group-hover:translate-x-1" />
            </div>
          </div>

          <div
            id="qa-history"
            onClick={() => onNavigate('history')}
            className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md shadow-xs"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition">
              <History className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-4 group-hover:text-blue-600 transition">
              Riwayat Analisis
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Akses kembali catatan hasil riset pertandingan dan rekomendasi pasar yang telah Anda simpan.
            </p>
            <div className="mt-4 flex items-center text-xs font-semibold text-blue-600 space-x-1">
              <span>Lihat Arsip</span>
              <ChevronRight className="h-3 w-3 transition group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Analyses Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Analisis Terkini
          </h2>
          {recentAnalyses.length > 0 && (
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>Lihat semua</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {!currentUser ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <p className="text-sm text-slate-600">
              Silakan masuk untuk menyimpan dan meninjau analisis riwayat Anda.
            </p>
            <button
              onClick={onOpenAuth}
              className="mt-4 inline-flex items-center space-x-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow-sm"
            >
              <span>Masuk / Buat Akun</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : recentAnalyses.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Belum Ada Catatan Analisis</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
              Belum ada riwayat analisis pertandingan yang tersimpan. Upload screenshot jadwal pertandingan untuk memulai analisis AI.
            </p>
            <button
              onClick={() => onNavigate('analyze')}
              className="mt-4 inline-flex items-center space-x-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow-sm"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Mulai Analisis Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAnalyses.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 shadow-xs gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 border border-blue-100 shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{item.sport}</span>
                      <span>•</span>
                      <span>{item.league}</span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(item.createdAt).toLocaleDateString('id-ID')}</span>
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm sm:text-base mt-0.5">
                      {item.analysis?.match ||
                        (item.multiAnalysis?.matches
                           ? `${item.multiAnalysis.matches.length} Pertandingan (Multi-Analisis)`
                           : item.matches?.[0]
                           ? `${item.matches[0].homeTeam} vs ${item.matches[0].awayTeam}`
                           : 'Pertandingan Olahraga')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-3">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Rekomendasi</div>
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        item.recommendation === 'BET'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.recommendation === 'WATCH'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {item.recommendation}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Risiko</div>
                    <span
                      className={`text-xs font-bold ${
                        item.riskLevel === 'LOW'
                          ? 'text-emerald-600'
                          : item.riskLevel === 'HIGH'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {item.riskLevel}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate('parlay', { addLegFromAnalysis: item })}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                  >
                    + Parlay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
