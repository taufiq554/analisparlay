import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Clock, Zap, ArrowRight, X } from 'lucide-react';

interface SubscriptionAlertProps {
  onNavigate: (tab: string) => void;
}

export const SubscriptionAlert: React.FC<SubscriptionAlertProps> = ({ onNavigate }) => {
  const { userProfile, currentUser } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!currentUser || !userProfile || dismissed) return null;

  // Cek apakah langganan aktif dan punya batas waktu
  const isPaidPlan = userProfile.subscriptionPlan && userProfile.subscriptionPlan.toLowerCase() !== 'free';
  const hasExpiry = Boolean(userProfile.subscriptionEnd);

  // Cek kuota habis
  const isQuotaDepleted = userProfile.analysisUsed >= userProfile.analysisLimit;
  const isQuotaNear = userProfile.analysisLimit - userProfile.analysisUsed <= 2 && !isQuotaDepleted;

  let daysRemaining: number | null = null;
  let isExpired = false;
  let isExpiringSoon = false;

  if (hasExpiry && userProfile.subscriptionEnd) {
    const endMs = new Date(userProfile.subscriptionEnd).getTime();
    const nowMs = Date.now();
    const diffDays = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24));
    daysRemaining = diffDays;

    if (diffDays <= 0) {
      isExpired = true;
    } else if (diffDays <= 5) {
      isExpiringSoon = true;
    }
  }

  // Jika tidak ada masalah kuota atau masa aktif, tidak perlu munculkan alert
  if (!isExpired && !isExpiringSoon && !isQuotaDepleted && !isQuotaNear) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-2">
      <div
        className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border transition shadow-xs ${
          isExpired || isQuotaDepleted
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-start space-x-3">
          <div
            className={`p-2 rounded-xl mt-0.5 shrink-0 ${
              isExpired || isQuotaDepleted ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {isExpired || isQuotaDepleted ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <Clock className="h-5 w-5" />
            )}
          </div>

          <div className="pr-6 sm:pr-0">
            <h4 className="text-xs sm:text-sm font-bold">
              {isExpired
                ? `Masa Aktif Paket ${userProfile.subscriptionPlan} Telah Berakhir`
                : isQuotaDepleted
                ? `Kuota Analisis Harian Anda Telah Habis (${userProfile.analysisUsed}/${userProfile.analysisLimit})`
                : isExpiringSoon
                ? `Masa Aktif Paket Berakhir dalam ${daysRemaining} Hari Lagi!`
                : `Sisa Kuota Menipis: Tinggal ${userProfile.analysisLimit - userProfile.analysisUsed} Analisis Lagi`}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
              {isExpired || isQuotaDepleted
                ? 'Upgrade atau perpanjang paket Anda sekarang untuk membuka kuota analisis pertandingan tanpa hambatan.'
                : 'Perpanjang paket langganan Anda lebih awal agar riset parlay AI Anda tetap berjalan lancar.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => onNavigate('plans')}
            className={`inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-xs transition active:scale-95 ${
              isExpired || isQuotaDepleted
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Perpanjang / Upgrade Paket</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-white/60 transition"
            title="Tutup Notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
