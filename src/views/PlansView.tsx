import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSubscriptionPlans, createPaymentTicket, subscribeToUserTickets } from '../services/firestoreService';
import { SubscriptionPlan, PaymentTicket } from '../types';
import { BRAND } from '../config/brand';
import {
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Send,
  Users,
  ExternalLink,
  QrCode,
  Sparkles,
  X,
  FileCheck,
  Check,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface PlansViewProps {
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const PlansView: React.FC<PlansViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<SubscriptionPlan | null>(null);

  // Form konfirmasi pembayaran (Solusi 1 + C)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [senderAccountName, setSenderAccountName] = useState('');
  const [transferTime, setTransferTime] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<PaymentTicket | null>(null);
  const [myTickets, setMyTickets] = useState<PaymentTicket[]>([]);

  useEffect(() => {
    if (currentUser?.uid) {
      const unsub = subscribeToUserTickets(currentUser.uid, (data) => {
        setMyTickets(data);
      });
      return () => unsub();
    }
  }, [currentUser]);

  useEffect(() => {
    getSubscriptionPlans()
      .then((data) => {
        const sorted = data.sort((a, b) => a.price - b.price);
        setPlans(sorted);
      })
      .catch((err) => console.error('Error loading plans from Firestore:', err))
      .finally(() => setLoading(false));
  }, []);

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const currentPlanName = userProfile?.subscriptionPlan || 'FREE';

  return (
    <div id="plans-view" className="space-y-10 animate-in fade-in pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center space-x-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-600 shadow-sm">
          <Zap className="h-3.5 w-3.5 text-blue-600" />
          <span>Paket Kuota & Langganan SaaS</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Pilihan Paket Analisis Olahraga
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Tingkatkan kuota analisis AI harian dan bulanan Anda. Kapasitas kuota otomatis tersinkronisasi langsung dengan database akun Anda.
        </p>
      </div>

      {/* Telegram Community VIP Group Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/15 max-w-5xl mx-auto">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Users className="h-3.5 w-3.5 text-white" />
              <span>Komunitas Analis Resmi</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Gabung ke Grup Telegram Analis AI Parlay
            </h2>
            <p className="text-xs sm:text-sm text-sky-100 max-w-xl leading-relaxed">
              Dapatkan diskusi strategi parlay, update jadwal terkini, tips handicap & total odds, serta berbagi insight bersama komunitas analis AI.
            </p>
          </div>

          <a
            href={BRAND.telegramGroupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center justify-center space-x-2 rounded-full bg-white px-6 py-3.5 text-xs sm:text-sm font-bold text-blue-700 shadow-lg shadow-black/10 transition hover:bg-sky-50 active:scale-95"
          >
            <Send className="h-4 w-4 text-blue-600" />
            <span>Gabung Grup Telegram</span>
            <ExternalLink className="h-3.5 w-3.5 ml-1 text-slate-400" />
          </a>
        </div>
      </div>

      {/* User's current plan status card */}
      {currentUser && userProfile && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-4xl mx-auto shadow-sm">
          <div>
            <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">Paket Aktif Akun Anda:</div>
            <div className="flex items-center space-x-3 mt-1.5">
              <span className="font-teko text-3xl font-bold text-slate-900 tracking-wide">
                {userProfile.subscriptionPlan}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                {userProfile.subscriptionStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Penggunaan kuota: <strong className="text-slate-900">{userProfile.analysisUsed}</strong> dari <strong className="text-slate-900">{userProfile.analysisLimit}</strong> analisis tersedia.
            </p>
          </div>

          <button
            onClick={() => onNavigate('analyze')}
            className="rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow-md shadow-blue-500/20 shrink-0"
          >
            Mulai Analisis
          </button>
        </div>
      )}

      {/* Plans Pricing Grid */}
      {loading ? null : plans.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Paket langganan sedang dimuat...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = currentPlanName.toUpperCase() === plan.name.toUpperCase();
            const isPopular = plan.name.toUpperCase() === 'PRO';

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border flex flex-col justify-between p-6 sm:p-7 transition-all ${
                  isPopular
                    ? 'border-blue-500 bg-gradient-to-b from-white via-blue-50/30 to-indigo-50/20 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500/40'
                    : isCurrent
                    ? 'border-emerald-300 bg-emerald-50/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md shadow-sm'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                    Paling Populer
                  </span>
                )}

                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="font-teko text-3xl font-bold tracking-wide text-slate-900">
                      {plan.name}
                    </h3>
                    {isCurrent && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                        Aktif
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {plan.price === 0 ? 'Rp0' : formatIDR(plan.price)}
                    </span>
                    <span className="text-xs text-slate-500 ml-1.5">/ {plan.duration}</span>
                  </div>

                  <div className="mt-3 inline-flex items-center space-x-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                    <Zap className="h-3.5 w-3.5 text-blue-600" />
                    <span>{plan.analysisLimit} Analisis / bulan</span>
                  </div>

                  {/* Features list */}
                  <ul className="mt-6 space-y-3 text-xs text-slate-600">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full rounded-full bg-slate-100 py-2.5 text-xs font-bold text-slate-400 cursor-default border border-slate-200"
                    >
                      Paket Anda Saat Ini
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          onOpenAuth();
                        } else {
                          setSelectedPlanForPayment(plan);
                        }
                      }}
                      className={`w-full rounded-full py-2.5 text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                        isPopular
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20'
                          : 'border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-400 text-slate-800'
                      }`}
                    >
                      <span>Beli & Upgrade {plan.name}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QRIS & Payment Section */}
      <div
        id="manual-subscription-info"
        className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-9 max-w-4xl mx-auto space-y-6 shadow-md"
      >
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-600">
          <CreditCard className="h-4 w-4" />
          <span>Instruksi Pembayaran & QRIS Resmi</span>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* QRIS Image Card with 256:255 aspect ratio */}
          <div className="w-full sm:w-72 shrink-0 flex flex-col items-center text-center p-4 rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-sm">
            <div className="relative w-56 max-w-full rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md bg-white">
              <img
                src={BRAND.qrisUrl}
                alt="QRIS Pembayaran MAX AI"
                style={{ aspectRatio: '256 / 255' }}
                className="w-full h-auto object-contain block"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = 'https://files.catbox.moe/ru49zu.jpg';
                }}
              />
            </div>
            <div className="mt-3 flex items-center space-x-1.5 text-xs font-bold text-slate-800">
              <QrCode className="h-4 w-4 text-blue-600" />
              <span>Scan QRIS untuk Pembayaran</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Bisa dari BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay, dsb.
            </p>
          </div>

          {/* Steps & Telegram Confirmation */}
          <div className="space-y-4 flex-1">
            <h2 className="text-xl font-extrabold text-slate-900">
              Cara Pembayaran & Konfirmasi Cepat
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Setelah melakukan transfer/scan barcode QRIS di samping sesuai nominal paket yang Anda pilih, segera lakukan konfirmasi langsung ke Telegram agar admin langsung mengaktifkan kuota dan paket di akun Anda.
            </p>

            <div className="space-y-3">
              <div className="flex items-start space-x-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                  1
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Scan & Transfer via QRIS</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Scan barcode QRIS di samping menggunakan aplikasi m-Banking atau E-Wallet pilihan Anda.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                  2
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Kirim Bukti Pembayaran ke Telegram</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Kirim screenshot bukti transfer serta email akun Anda ke Telegram resmi <strong>@{BRAND.telegramAdmin}</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                  3
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Aktivasi Real-time oleh Admin</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Admin langsung memvalidasi dan mengaktifkan kuota di Admin Panel. Data paket di akun Anda seketika aktif.
                  </p>
                </div>
              </div>
            </div>

            {/* Telegram Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={BRAND.telegramAdminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition hover:from-sky-400 hover:to-blue-500 active:scale-95"
              >
                <Send className="h-4 w-4" />
                <span>Konfirmasi ke Telegram @{BRAND.telegramAdmin}</span>
              </a>

              <a
                href={BRAND.telegramGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 rounded-full border border-sky-200 bg-sky-50/80 px-5 py-3 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
              >
                <Users className="h-4 w-4" />
                <span>Gabung Grup Diskusi</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Payment Modal when clicking a plan */}
      {selectedPlanForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
            <button
              onClick={() => setSelectedPlanForPayment(null)}
              className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-1">
              <span className="inline-block rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-blue-600 border border-blue-100">
                Pemesanan Paket
              </span>
              <h3 className="text-2xl font-black text-slate-900 font-teko tracking-wide">
                PAKET {selectedPlanForPayment.name}
              </h3>
              <div className="text-xl font-extrabold text-blue-600">
                {selectedPlanForPayment.price === 0 ? 'GRATIS' : formatIDR(selectedPlanForPayment.price)}
                <span className="text-xs font-normal text-slate-500"> / {selectedPlanForPayment.duration}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-48 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <img
                  src={BRAND.qrisUrl}
                  alt="QRIS Pembayaran"
                  style={{ aspectRatio: '256 / 255' }}
                  className="w-full h-auto object-contain block"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center">
                Scan QRIS di atas sesuai nominal <strong>{formatIDR(selectedPlanForPayment.price)}</strong>
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Tombol Utama: Kirim Konfirmasi di Website (Solusi 1 + C) */}
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    onOpenAuth();
                    return;
                  }
                  setConfirmModalOpen(true);
                }}
                className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition active:scale-95"
              >
                <FileCheck className="h-4 w-4" />
                <span>Saya Sudah Transfer (Konfirmasi Tiket)</span>
              </button>

              {/* Tombol Cadangan: Kirim langsung via Telegram */}
              <a
                href={`${BRAND.telegramAdminUrl}?text=Halo%20Admin%20MAX%20AI,%20saya%20sudah%20bayar%20paket%20${selectedPlanForPayment.name}%20nominal%20${selectedPlanForPayment.price}.%20Email%20akun%20saya:%20${encodeURIComponent(userProfile?.email || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-sky-50 border border-sky-200 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition active:scale-95"
              >
                <Send className="h-4 w-4 text-sky-600" />
                <span>Kirim Bukti ke Telegram @{BRAND.telegramAdmin}</span>
              </a>

              <button
                onClick={() => setSelectedPlanForPayment(null)}
                className="w-full rounded-2xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FORM TIKET KONFIRMASI PEMBAYARAN (100% GRATIS TANPA FIREBASE STORAGE) */}
      {confirmModalOpen && selectedPlanForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95">
            <button
              onClick={() => {
                setConfirmModalOpen(false);
                setSubmittedTicket(null);
              }}
              className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <span className="inline-block rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                Verifikasi Pembayaran 1-Klik
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-teko tracking-wide">
                Konfirmasi Transfer Paket {selectedPlanForPayment.name}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Isi data rekening/e-wallet pengirim di bawah. Admin akan langsung memverifikasi mutasi dan mengaktifkan paket akun Anda.
              </p>
            </div>

            {submittedTicket ? (
              <div className="space-y-4 py-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Tiket Konfirmasi Berhasil Dibuat!</h4>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                    ID Tiket: <strong className="font-mono text-emerald-800">#{submittedTicket.id.slice(-6)}</strong>. Data Anda telah masuk ke antrean verifikasi Admin Panel.
                  </p>
                </div>

                {/* Opsi C: Tombol otomatis kirim teks lengkap ke Telegram Admin */}
                <div className="space-y-2">
                  <a
                    href={`${BRAND.telegramAdminUrl}?text=Halo%20Admin%20@${BRAND.telegramAdmin},%20saya%20sudah%20buat%20tiket%20konfirmasi%20bayar%20di%20web%20MAX%20AI:%0A%E2%80%A2%20ID%20Tiket:%20%23${submittedTicket.id.slice(-6)}%0A%E2%80%A2%20Email:%20${encodeURIComponent(currentUser?.email || '')}%0A%E2%80%A2%20Paket:%20${encodeURIComponent(submittedTicket.planName)}%20(${formatIDR(submittedTicket.amount)})%0A%E2%80%A2%20Pengirim:%20${encodeURIComponent(submittedTicket.senderAccountName)}%20(${encodeURIComponent(submittedTicket.paymentMethod)})%0A%E2%80%A2%20Waktu:%20${encodeURIComponent(submittedTicket.transferTime || 'Baru Saja')}%0AMohon%20bantuannya%20untuk%20di-approve.%20Terima%20kasih!`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:from-sky-400 hover:to-blue-500 transition active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                    <span>Kirim Foto Struk ke Telegram Admin (Biar Cepat)</span>
                  </a>

                  <button
                    onClick={() => {
                      setConfirmModalOpen(false);
                      setSelectedPlanForPayment(null);
                      setSubmittedTicket(null);
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Selesai & Kembali
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!currentUser || !userProfile) {
                    onOpenAuth();
                    return;
                  }
                  if (!senderAccountName.trim()) {
                    alert('Mohon masukkan nama pemilik rekening/e-wallet pengirim.');
                    return;
                  }

                  setSubmittingTicket(true);
                  try {
                    const ticketId = await createPaymentTicket({
                      userId: currentUser.uid,
                      userEmail: currentUser.email || '',
                      userName: userProfile.name || currentUser.email?.split('@')[0] || 'User',
                      planId: selectedPlanForPayment.id,
                      planName: selectedPlanForPayment.name,
                      amount: selectedPlanForPayment.price,
                      paymentMethod,
                      senderAccountName: senderAccountName.trim(),
                      transferTime: transferTime.trim() || new Date().toLocaleTimeString('id-ID'),
                      notes: notes.trim(),
                    });

                    setSubmittedTicket({
                      id: ticketId,
                      userId: currentUser.uid,
                      userEmail: currentUser.email || '',
                      userName: userProfile.name || '',
                      planId: selectedPlanForPayment.id,
                      planName: selectedPlanForPayment.name,
                      amount: selectedPlanForPayment.price,
                      paymentMethod,
                      senderAccountName: senderAccountName.trim(),
                      transferTime: transferTime.trim() || new Date().toLocaleTimeString('id-ID'),
                      notes: notes.trim(),
                      status: 'pending',
                      createdAt: new Date().toISOString(),
                    });
                  } catch (err: any) {
                    alert('Gagal mengirim tiket konfirmasi: ' + (err.message || String(err)));
                  } finally {
                    setSubmittingTicket(false);
                  }
                }}
                className="space-y-3.5 text-xs"
              >
                {/* Ringkasan Biaya */}
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 font-medium">Paket Terpilih:</span>
                    <div className="font-bold text-slate-900 text-sm">{selectedPlanForPayment.name}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium">Nominal Transfer:</span>
                    <div className="font-extrabold text-blue-600 text-sm">
                      {formatIDR(selectedPlanForPayment.price)}
                    </div>
                  </div>
                </div>

                {/* Metode Transfer */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="QRIS">QRIS All Payment (GoPay, OVO, DANA, ShopeePay, BCA, dll)</option>
                    <option value="BCA">Transfer Bank BCA</option>
                    <option value="Mandiri">Transfer Bank Mandiri</option>
                    <option value="BRI">Transfer Bank BRI</option>
                    <option value="BNI">Transfer Bank BNI</option>
                    <option value="DANA">E-Wallet DANA</option>
                    <option value="GoPay">E-Wallet GoPay</option>
                    <option value="OVO">E-Wallet OVO</option>
                    <option value="Lainnya">Metode Lainnya</option>
                  </select>
                </div>

                {/* Nama Pemilik Rekening / E-Wallet */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Atas Nama Rekening / E-Wallet Pengirim <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={senderAccountName}
                    onChange={(e) => setSenderAccountName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Pastikan nama sesuai mutasi rekening pengirim agar admin bisa memverifikasi langsung.
                  </p>
                </div>

                {/* Jam Transfer (Opsional) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Transfer / Referensi (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 21:45 WIB"
                    value={transferTime}
                    onChange={(e) => setTransferTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Catatan Tambahan (Opsional) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Transfer via QRIS Livin Mandiri"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setConfirmModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTicket}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    {submittingTicket ? 'Mengirim...' : 'Kirim Konfirmasi Tiket'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Riwayat Tiket Pembayaran Saya */}
      {currentUser && myTickets.length > 0 && (
        <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Riwayat Tiket Pembayaran Anda</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">
              {myTickets.length} tiket tercatat
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {myTickets.slice(0, 3).map((t) => (
              <div key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    Paket {t.planName} • <span className="font-mono text-[11px] text-slate-500">#{t.id.slice(-6)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t.senderAccountName} ({t.paymentMethod}) • {new Date(t.createdAt).toLocaleDateString('id-ID')}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : t.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                    }`}
                  >
                    {t.status === 'approved' ? 'Disetujui' : t.status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

