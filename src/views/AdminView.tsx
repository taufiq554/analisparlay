import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAllUsersForAdmin,
  getAllAnalysesForAdmin,
  adminUpdateUser,
  getSubscriptionPlans,
  adminSavePlan,
  subscribeToAllTicketsForAdmin,
  adminApproveTicket,
  adminRejectTicket,
  getAdminAuditLogs,
} from '../services/firestoreService';
import { UserProfile, SavedAnalysis, SubscriptionPlan, PaymentTicket, AdminAuditLog } from '../types';
import {
  ShieldCheck,
  Users,
  CreditCard,
  History,
  Settings,
  Edit2,
  Check,
  X,
  Search,
  Zap,
  Calendar,
  AlertCircle,
  Plus,
  UserCheck,
  Sparkles,
  RefreshCw,
  Clock,
  Sliders,
  ChevronRight,
  Filter,
  FileCheck,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';

interface AdminViewProps {
  onOpenAuth?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onOpenAuth }) => {
  const { isAdmin, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'tickets' | 'plans' | 'analyses' | 'logs'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [tickets, setTickets] = useState<PaymentTicket[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Selected user for editing modal
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Selected plan for editing modal
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [submittingPlan, setSubmittingPlan] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [u, a, p, logs] = await Promise.all([
        getAllUsersForAdmin(),
        getAllAnalysesForAdmin(),
        getSubscriptionPlans(),
        getAdminAuditLogs(30),
      ]);
      setUsers(u);
      setAnalyses(a);
      setPlans(p);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
      // Real-time listener tiket pembayaran
      const unsubTickets = subscribeToAllTicketsForAdmin((ticketList) => {
        setTickets(ticketList);
      });
      return () => {
        unsubTickets();
      };
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-white p-8 sm:p-12 text-center my-8 max-w-xl mx-auto shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3 border border-rose-100">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-rose-700 max-w-md mx-auto mt-2 leading-relaxed">
          {currentUser
            ? `Akun Anda (${currentUser.email}) belum terdaftar sebagai administrator. Silakan login menggunakan akun administrator resmi nandegg55@gmail.com.`
            : 'Halaman Admin Panel hanya dapat diakses setelah Anda masuk dengan akun administrator resmi (nandegg55@gmail.com).'}
        </p>
        {!currentUser && onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="mt-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/20"
          >
            Masuk dengan Akun Admin
          </button>
        )}
      </div>
    );
  }

  const handleSaveUserSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingUser(true);
    setNotification(null);

    try {
      await adminUpdateUser(editingUser.uid, {
        subscriptionPlan: editingUser.subscriptionPlan,
        subscriptionStatus: editingUser.subscriptionStatus,
        subscriptionStart: editingUser.subscriptionStart || '',
        subscriptionEnd: editingUser.subscriptionEnd || '',
        analysisLimit: Number(editingUser.analysisLimit),
        analysisUsed: Number(editingUser.analysisUsed),
        role: editingUser.role,
      });

      setNotification({ type: 'success', text: `Data langganan user ${editingUser.email} berhasil diperbarui.` });
      setEditingUser(null);
      await loadAllData();
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Gagal memperbarui user: ' + err.message });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSubmittingPlan(true);
    setNotification(null);

    try {
      await adminSavePlan(editingPlan);
      setNotification({ type: 'success', text: `Paket ${editingPlan.name} berhasil disimpan.` });
      setEditingPlan(null);
      await loadAllData();
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Gagal menyimpan paket: ' + err.message });
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleQuickAddQuota = async (u: UserProfile, amount: number) => {
    try {
      const newLimit = (Number(u.analysisLimit) || 0) + amount;
      await adminUpdateUser(u.uid, {
        analysisLimit: newLimit,
      });
      setNotification({
        type: 'success',
        text: `+${amount} kuota berhasil ditambahkan untuk ${u.email} (Total Limit: ${newLimit}).`,
      });
      await loadAllData();
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Gagal menambah kuota: ' + err.message });
    }
  };

  const handleQuickResetUsed = async (u: UserProfile) => {
    try {
      await adminUpdateUser(u.uid, {
        analysisUsed: 0,
      });
      setNotification({
        type: 'success',
        text: `Kuota terpakai ${u.email} berhasil direset ke 0.`,
      });
      await loadAllData();
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Gagal mereset pemakaian kuota: ' + err.message });
    }
  };

  const handleQuickSetPlan = async (u: UserProfile, planName: string, limit: number) => {
    try {
      const today = new Date().toISOString();
      const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await adminUpdateUser(u.uid, {
        subscriptionPlan: planName,
        subscriptionStatus: 'active',
        analysisLimit: limit,
        subscriptionStart: today,
        subscriptionEnd: end,
      });
      setNotification({
        type: 'success',
        text: `User ${u.email} berhasil diubah ke paket ${planName} (${limit} kuota, aktif 30 hari).`,
      });
      await loadAllData();
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Gagal update paket: ' + err.message });
    }
  };

  const handleQuickToggleStatus = async (u: UserProfile) => {
    try {
      const newStatus = u.subscriptionStatus === 'active' ? 'inactive' : 'active';
      await adminUpdateUser(u.uid, {
        subscriptionStatus: newStatus,
      });
      setNotification({
        type: 'success',
        text: `Status user ${u.email} diubah menjadi ${newStatus}.`,
      });
      await loadAllData();
    } catch (err: any) {
      setNotification({ type: 'error', text: 'Gagal ubah status: ' + err.message });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesStatus = filterStatus === 'all' || u.subscriptionStatus === filterStatus;
    const matchesPlan = filterPlan === 'all' || u.subscriptionPlan === filterPlan;
    return matchesSearch && matchesRole && matchesStatus && matchesPlan;
  });

  return (
    <div id="admin-view" className="space-y-6 animate-in fade-in pb-20 max-w-7xl mx-auto">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 rounded-full bg-amber-50 px-3 py-1 border border-amber-200 text-xs font-bold text-amber-700">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <span>Panel Administrator Resmi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Admin Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Kelola pengguna, status langganan, kuota akun, dan paket langganan secara terpusat.
          </p>
        </div>

        <button
          onClick={loadAllData}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition shadow-xs"
        >
          Muat Ulang Data
        </button>
      </div>

      {notification && (
        <div
          className={`flex items-start space-x-2 rounded-2xl p-4 text-xs ${
            notification.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Pengguna</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="font-teko text-3xl font-bold text-slate-900 mt-1">{users.length}</div>
          <span className="text-[11px] text-slate-500">Pengguna terdaftar</span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Langganan Aktif</span>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="font-teko text-3xl font-bold text-emerald-600 mt-1">
            {users.filter((u) => u.subscriptionStatus === 'active' && u.subscriptionPlan !== 'FREE').length}
          </div>
          <span className="text-[11px] text-slate-500">Starter, Pro, & Ultimate aktif</span>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Analisis Dibuat</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="font-teko text-3xl font-bold text-slate-900 mt-1">{analyses.length}</div>
          <span className="text-[11px] text-slate-500">Riwayat analisis tersimpan</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-full transition ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Pengguna ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 text-xs font-bold rounded-full transition relative flex items-center space-x-1.5 ${
            activeTab === 'tickets'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="h-3.5 w-3.5" />
          <span>Tiket Pembayaran</span>
          {tickets.filter((t) => t.status === 'pending').length > 0 && (
            <span className="rounded-full bg-rose-500 text-white px-2 py-0.2 text-[10px] font-extrabold ml-1">
              {tickets.filter((t) => t.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 text-xs font-bold rounded-full transition ${
            activeTab === 'plans'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Kelola Paket ({plans.length})
        </button>

        <button
          onClick={() => setActiveTab('analyses')}
          className={`px-4 py-2 text-xs font-bold rounded-full transition ${
            activeTab === 'analyses'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Semua Analisis ({analyses.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-bold rounded-full transition flex items-center space-x-1.5 ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Audit Log ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari user berdasarkan email atau nama..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none shadow-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFilterPlan('all');
                  setFilterStatus('all');
                  setFilterRole('all');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  filterPlan === 'all' && filterStatus === 'all' && filterRole === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus(filterStatus === 'active' ? 'all' : 'active')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  filterStatus === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Aktif ({users.filter((u) => u.subscriptionStatus === 'active').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterRole(filterRole === 'admin' ? 'all' : 'admin')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  filterRole === 'admin'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Admin ({users.filter((u) => u.role === 'admin').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterPlan(filterPlan === 'PRO' ? 'all' : 'PRO')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  filterPlan === 'PRO'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                PRO ({users.filter((u) => u.subscriptionPlan === 'PRO').length})
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium px-1">
            Menampilkan <strong className="text-slate-800">{filteredUsers.length}</strong> dari{' '}
            <strong className="text-slate-800">{users.length}</strong> pengguna terdaftar
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
              <p>Memuat data pengguna...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
              Tidak ada pengguna yang cocok dengan filter pencarian.
            </div>
          ) : (
            <>
              {/* MOBILE CARD VIEW: Designed specifically for smartphones */}
              <div className="block md:hidden space-y-3.5">
                {filteredUsers.map((u) => {
                  const remainingQuota = Math.max(0, (u.analysisLimit || 0) - (u.analysisUsed || 0));
                  const percentage = u.analysisLimit > 0 ? Math.min(100, Math.round((u.analysisUsed / u.analysisLimit) * 100)) : 0;

                  return (
                    <div
                      key={u.uid}
                      className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3 transition"
                    >
                      {/* Top: Avatar, Name, Email, Role */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                            {(u.name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm truncate">
                              {u.name || 'Tanpa Nama'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[190px] font-mono">
                              {u.email}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </div>

                      {/* Badges: Plan & Status */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          PAKET {u.subscriptionPlan}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            u.subscriptionStatus === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {u.subscriptionStatus}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center space-x-1 ml-auto">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>
                            {u.subscriptionEnd
                              ? `Exp: ${new Date(u.subscriptionEnd).toLocaleDateString('id-ID')}`
                              : 'Tanpa Batas'}
                          </span>
                        </span>
                      </div>

                      {/* Quota Meter */}
                      <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-semibold text-slate-600">Penggunaan Kuota:</span>
                          <span className="font-bold text-slate-900">
                            {u.analysisUsed} / {u.analysisLimit} ({remainingQuota} Sisa)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percentage >= 90
                                ? 'bg-rose-500'
                                : percentage >= 70
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Primary Action Button: Large & Super Clear */}
                      <button
                        type="button"
                        onClick={() => setEditingUser({ ...u })}
                        className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-98 transition"
                      >
                        <Sliders className="h-4 w-4" />
                        <span>Kelola & Edit Pengguna</span>
                      </button>

                      {/* Quick 1-Click Action Buttons */}
                      <div className="grid grid-cols-3 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleQuickAddQuota(u, 10)}
                          className="rounded-xl border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition text-center shadow-xs"
                        >
                          +10 Kuota
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickResetUsed(u)}
                          className="rounded-xl border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition text-center shadow-xs"
                        >
                          Reset Kuota
                        </button>
                        {u.subscriptionPlan !== 'PRO' ? (
                          <button
                            type="button"
                            onClick={() => handleQuickSetPlan(u, 'PRO', 100)}
                            className="rounded-xl border border-blue-200 bg-blue-50 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition text-center shadow-xs"
                          >
                            Set PRO
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickToggleStatus(u)}
                            className="rounded-xl border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition text-center shadow-xs"
                          >
                            {u.subscriptionStatus === 'active' ? 'Nonaktif' : 'Aktifkan'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP TABLE VIEW: Full responsive table with horizontal scrolling */}
              <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase font-bold text-slate-600">
                    <tr>
                      <th className="px-5 py-3.5">Nama & Email</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Paket</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Penggunaan Kuota</th>
                      <th className="px-5 py-3.5">Expired</th>
                      <th className="px-5 py-3.5 text-right">Aksi Kelola</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredUsers.map((u) => {
                      const percentage =
                        u.analysisLimit > 0
                          ? Math.min(100, Math.round((u.analysisUsed / u.analysisLimit) * 100))
                          : 0;

                      return (
                        <tr key={u.uid} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-slate-900">{u.name || 'Tanpa Nama'}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {u.subscriptionPlan}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.subscriptionStatus === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {u.subscriptionStatus}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">
                              {u.analysisUsed} / {u.analysisLimit}
                            </div>
                            <div className="h-1.5 w-24 rounded-full bg-slate-200 mt-1 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 text-xs">
                            {u.subscriptionEnd
                              ? new Date(u.subscriptionEnd).toLocaleDateString('id-ID')
                              : 'Tidak ada batasan'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => setEditingUser({ ...u })}
                                className="inline-flex items-center space-x-1 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
                              >
                                <Sliders className="h-3 w-3" />
                                <span>Kelola</span>
                              </button>
                              <button
                                type="button"
                                title="Tambah 10 Kuota Cepat"
                                onClick={() => handleQuickAddQuota(u, 10)}
                                className="rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                title="Reset Kuota Terpakai ke 0"
                                onClick={() => handleQuickResetUsed(u)}
                                className="rounded-full bg-slate-100 hover:bg-amber-50 hover:text-amber-700 border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition"
                              >
                                Reset
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Plans Management */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-600">
              Ubah harga, kuota, atau fitur paket. Perubahan seketika berlaku di halaman Plans pengguna.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="font-teko text-2xl font-bold text-slate-900">{p.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        p.active ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">
                    Rp{p.price.toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs text-blue-600 font-semibold mt-1">
                    {p.analysisLimit} Analisis / {p.duration}
                  </div>
                  <ul className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                    {p.features.map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setEditingPlan({ ...p })}
                    className="w-full rounded-full border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition shadow-xs"
                  >
                    Edit Detail Paket
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Analyses Feed */}
      {activeTab === 'analyses' && (
        <div className="space-y-4">
          {analyses.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500">
              Belum ada riwayat analisis.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase font-bold text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">User Email</th>
                    <th className="px-5 py-3.5">Sport / Liga</th>
                    <th className="px-5 py-3.5">Match</th>
                    <th className="px-5 py-3.5 text-center">Risk</th>
                    <th className="px-5 py-3.5 text-center">Rekomendasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {analyses.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                        {new Date(a.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{a.userEmail || a.userId}</td>
                      <td className="px-5 py-3.5 font-semibold text-blue-600">{a.sport} • {a.league}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {a.analysis?.match ||
                          (a.multiAnalysis?.matches
                            ? `${a.multiAnalysis.matches.length} Match (Multi)`
                            : a.matches?.[0]
                            ? `${a.matches[0].homeTeam} vs ${a.matches[0].awayTeam}`
                            : 'Match')}
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-900">{a.riskLevel}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {a.recommendation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Tiket Pembayaran (Solusi 1 + C, 1-Klik Verifikasi) */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Antrean Konfirmasi Pembayaran</h2>
              <p className="text-xs text-slate-500">
                Pengguna yang melakukan pembayaran transfer dapat langsung diverifikasi mutasinya dan diaktifkan dengan 1-klik.
              </p>
            </div>

            {/* Filter status tiket */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl text-xs">
              <button
                onClick={() => setTicketFilter('all')}
                className={`px-3 py-1 rounded-xl font-semibold transition ${
                  ticketFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({tickets.length})
              </button>
              <button
                onClick={() => setTicketFilter('pending')}
                className={`px-3 py-1 rounded-xl font-semibold transition ${
                  ticketFilter === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Menunggu ({tickets.filter((t) => t.status === 'pending').length})
              </button>
              <button
                onClick={() => setTicketFilter('approved')}
                className={`px-3 py-1 rounded-xl font-semibold transition ${
                  ticketFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Disetujui ({tickets.filter((t) => t.status === 'approved').length})
              </button>
              <button
                onClick={() => setTicketFilter('rejected')}
                className={`px-3 py-1 rounded-xl font-semibold transition ${
                  ticketFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ditolak ({tickets.filter((t) => t.status === 'rejected').length})
              </button>
            </div>
          </div>

          {tickets.filter((t) => (ticketFilter === 'all' ? true : t.status === ticketFilter)).length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Tidak ada tiket pembayaran dalam kategori ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tickets
                .filter((t) => (ticketFilter === 'all' ? true : t.status === ticketFilter))
                .map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`rounded-3xl border p-5 bg-white shadow-xs space-y-3.5 transition ${
                      ticket.status === 'pending'
                        ? 'border-amber-300 ring-2 ring-amber-400/20'
                        : ticket.status === 'approved'
                        ? 'border-emerald-200'
                        : 'border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-500">
                            #{ticket.id.slice(-6)}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              ticket.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ticket.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            {ticket.status === 'approved'
                              ? 'Disetujui'
                              : ticket.status === 'rejected'
                              ? 'Ditolak'
                              : 'Menunggu Review'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">
                          Paket {ticket.planName}
                        </h3>
                        <div className="text-xs text-slate-500">
                          {ticket.userEmail} {ticket.userName ? `(${ticket.userName})` : ''}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block">Nominal</span>
                        <span className="text-base font-extrabold text-blue-600">
                          Rp {ticket.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Metode:</span>
                        <span className="font-semibold text-slate-800">{ticket.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nama Pengirim:</span>
                        <span className="font-bold text-slate-900">{ticket.senderAccountName}</span>
                      </div>
                      {ticket.transferTime && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Waktu Transfer:</span>
                          <span className="text-slate-700">{ticket.transferTime}</span>
                        </div>
                      )}
                      {ticket.notes && (
                        <div className="pt-1 text-slate-600 border-t border-slate-200/60">
                          <span className="font-medium text-slate-500">Catatan:</span> {ticket.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span>Dibuat: {new Date(ticket.createdAt).toLocaleString('id-ID')}</span>
                      {ticket.approvedAt && (
                        <span>Diapprove: {new Date(ticket.approvedAt).toLocaleDateString('id-ID')}</span>
                      )}
                    </div>

                    {/* Aksi 1-Klik Admin */}
                    {ticket.status === 'pending' && (
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!currentUser) return;
                            if (
                              !confirm(
                                `Approve pembayaran dari ${ticket.userEmail} untuk Paket ${ticket.planName} (Rp ${ticket.amount.toLocaleString('id-ID')})?\n\nPaket akun user akan langsung AKTIF 30 hari.`
                              )
                            ) {
                              return;
                            }

                            try {
                              // Tentukan kuota default berdasarkan paket
                              let quota = 50;
                              if (ticket.planName.toUpperCase().includes('STARTER')) quota = 50;
                              else if (ticket.planName.toUpperCase().includes('PRO')) quota = 250;
                              else if (ticket.planName.toUpperCase().includes('ULTIMATE')) quota = 9999;

                              await adminApproveTicket(
                                ticket,
                                { uid: currentUser.uid, email: currentUser.email || 'nandegg55@gmail.com' },
                                quota
                              );
                              setNotification({
                                type: 'success',
                                text: `Tiket #${ticket.id.slice(-6)} berhasil di-approve! Paket ${ticket.planName} akun ${ticket.userEmail} telah aktif.`,
                              });
                              await loadAllData();
                            } catch (err: any) {
                              setNotification({
                                type: 'error',
                                text: 'Gagal approve tiket: ' + (err.message || String(err)),
                              });
                            }
                          }}
                          className="flex-1 flex items-center justify-center space-x-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition active:scale-95"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Approve & Aktifkan Paket</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!currentUser) return;
                            const reason = prompt('Alasan penolakan (misal: dana belum masuk mutasi):');
                            if (reason === null) return;

                            try {
                              await adminRejectTicket(
                                ticket.id,
                                { uid: currentUser.uid, email: currentUser.email || 'nandegg55@gmail.com' },
                                reason || 'Dana belum masuk mutasi bank/QRIS'
                              );
                              setNotification({
                                type: 'success',
                                text: `Tiket #${ticket.id.slice(-6)} ditolak.`,
                              });
                              await loadAllData();
                            } catch (err: any) {
                              setNotification({
                                type: 'error',
                                text: 'Gagal tolak tiket: ' + (err.message || String(err)),
                              });
                            }
                          }}
                          className="px-4 py-2.5 rounded-2xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Audit Log Admin */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Log Aktivitas Administrator</h2>
              <p className="text-xs text-slate-500">
                Catatan riwayat perubahan kuota, paket, dan status persetujuan transaksi untuk audit keamanan.
              </p>
            </div>
            <button
              onClick={loadAllData}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              Refresh Log
            </button>
          </div>

          {auditLogs.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <Activity className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Belum ada aktivitas admin yang tercatat.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase font-bold text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">Waktu</th>
                    <th className="px-5 py-3.5">Admin</th>
                    <th className="px-5 py-3.5">Aksi</th>
                    <th className="px-5 py-3.5">Target</th>
                    <th className="px-5 py-3.5">Detail Perubahan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{log.adminEmail}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            log.action.includes('APPROVE')
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action.includes('REJECT')
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{log.targetUserEmail || log.targetUserId || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : String(log.details || '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* Edit User Subscription Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Kelola Langganan Pengguna</h3>
                <p className="text-xs text-slate-500">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubscription} className="space-y-4 text-xs">
              {/* Quick Presets Toolbar */}
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100 space-y-2">
                <span className="block font-bold text-[11px] uppercase tracking-wider text-slate-500">
                  Preset Cepat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingUser({
                        ...editingUser,
                        analysisLimit: (Number(editingUser.analysisLimit) || 0) + 10,
                      })
                    }
                    className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition shadow-2xs"
                  >
                    +10 Kuota
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingUser({
                        ...editingUser,
                        analysisLimit: (Number(editingUser.analysisLimit) || 0) + 50,
                      })
                    }
                    className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition shadow-2xs"
                  >
                    +50 Kuota
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingUser({
                        ...editingUser,
                        analysisUsed: 0,
                      })
                    }
                    className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 hover:border-amber-200 transition shadow-2xs"
                  >
                    Reset Terpakai (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      setEditingUser({
                        ...editingUser,
                        subscriptionEnd: d.toISOString().substring(0, 10),
                      });
                    }}
                    className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition shadow-2xs"
                  >
                    +30 Hari Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setFullYear(d.getFullYear() + 1);
                      setEditingUser({
                        ...editingUser,
                        subscriptionEnd: d.toISOString().substring(0, 10),
                      });
                    }}
                    className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition shadow-2xs"
                  >
                    +1 Tahun
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingUser({
                        ...editingUser,
                        subscriptionEnd: '',
                      })
                    }
                    className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition shadow-2xs"
                  >
                    Tanpa Expired
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paket Langganan</label>
                <select
                  value={editingUser.subscriptionPlan}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    const matchedPlan = plans.find((p) => p.name === chosen);
                    setEditingUser({
                      ...editingUser,
                      subscriptionPlan: chosen,
                      analysisLimit: matchedPlan ? matchedPlan.analysisLimit : editingUser.analysisLimit,
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="FREE">FREE (3 Kuota)</option>
                  <option value="STARTER">STARTER (30 Kuota)</option>
                  <option value="PRO">PRO (100 Kuota)</option>
                  <option value="ULTIMATE">ULTIMATE (300 Kuota)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Status Langganan</label>
                <select
                  value={editingUser.subscriptionStatus}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      subscriptionStatus: e.target.value as any,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="active">Active (Aktif)</option>
                  <option value="inactive">Inactive (Non-aktif)</option>
                  <option value="expired">Expired (Kadaluarsa)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Kuota (Limit)</label>
                  <input
                    type="number"
                    value={editingUser.analysisLimit}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, analysisLimit: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kuota Terpakai</label>
                  <input
                    type="number"
                    value={editingUser.analysisUsed}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, analysisUsed: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={editingUser.subscriptionStart ? editingUser.subscriptionStart.substring(0, 10) : ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, subscriptionStart: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Berakhir (Expired)</label>
                  <input
                    type="date"
                    value={editingUser.subscriptionEnd ? editingUser.subscriptionEnd.substring(0, 10) : ''}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, subscriptionEnd: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role Akun</label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value as any })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="user">User Biasa</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 font-bold text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                >
                  {submittingUser ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Paket {editingPlan.name}</h3>
              <button
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Paket</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga (Rupiah)</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Kuota Analisis</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.analysisLimit}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, analysisLimit: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Durasi</label>
                <input
                  type="text"
                  value={editingPlan.duration}
                  onChange={(e) => setEditingPlan({ ...editingPlan, duration: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fitur Paket (Pisahkan dengan baris baru / Enter)
                </label>
                <textarea
                  rows={4}
                  value={editingPlan.features.join('\n')}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      features: e.target.value.split('\n').filter((l) => l.trim() !== ''),
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="activePlan"
                  checked={editingPlan.active}
                  onChange={(e) => setEditingPlan({ ...editingPlan, active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="activePlan" className="text-slate-700 font-semibold">
                  Tampilkan paket ini sebagai paket aktif
                </label>
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 font-bold text-white hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                >
                  {submittingPlan ? 'Menyimpan...' : 'Simpan Paket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
