import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminUpdateUser } from '../services/firestoreService';
import {
  User,
  Mail,
  Zap,
  Calendar,
  Shield,
  Key,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface ProfileViewProps {
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile, logout, resetPassword, isAdmin } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(userProfile?.name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!currentUser || !userProfile) {
    return (
      <div className="rounded-3xl border border-blue-900/30 bg-gradient-to-b from-[#0d1424] to-[#070b14] p-12 text-center my-8 shadow-xl max-w-xl mx-auto">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 mb-3 border border-blue-500/20">
          <User className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-extrabold text-white">Profil Pengguna</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
          Silakan masuk ke akun Anda untuk melihat dan mengelola profil serta status kuota dan langganan.
        </p>
        <button
          onClick={onOpenAuth}
          className="mt-5 rounded-full bg-blue-600 px-7 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/30"
        >
          Masuk / Daftar Akun
        </button>
      </div>
    );
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameVal.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      await adminUpdateUser(currentUser.uid, { name: nameVal.trim() });
      setMsg({ type: 'success', text: 'Nama profil berhasil diperbarui!' });
      setEditingName(false);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Gagal memperbarui nama: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSendReset = async () => {
    if (!currentUser.email) return;
    setMsg(null);
    try {
      await resetPassword(currentUser.email);
      setMsg({
        type: 'success',
        text: 'Tautan reset kata sandi telah dikirim ke ' + currentUser.email,
      });
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Gagal mengirim email reset: ' + err.message });
    }
  };

  return (
    <div id="profile-view" className="space-y-6 max-w-4xl mx-auto animate-in fade-in pb-20">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 rounded-full bg-blue-50 px-3 py-1 border border-blue-200 text-xs font-bold text-blue-600">
          <User className="h-3.5 w-3.5 text-blue-600" />
          <span>Pengaturan Akun</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
          Profil & Langganan
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Informasi akun, paket langganan, dan rincian kuota analisis Anda.
        </p>
      </div>

      {msg && (
        <div
          className={`flex items-start space-x-2 rounded-2xl p-4 text-xs ${
            msg.type === 'success'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Main Details Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-2xl shadow-md shadow-blue-500/20">
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-extrabold text-slate-900">{userProfile.name}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    userProfile.role === 'admin'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {userProfile.role}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-1">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{userProfile.email}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingName(!editingName);
              setNameVal(userProfile.name);
            }}
            className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition self-start sm:self-auto shadow-xs"
          >
            {editingName ? 'Batal' : 'Ubah Nama'}
          </button>
        </div>

        {/* Edit name form */}
        {editingName && (
          <form onSubmit={handleUpdateName} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">Nama Lengkap Baru</label>
            <div className="flex space-x-2">
              <input
                type="text"
                required
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition shadow-xs"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        )}

        {/* Administrator Quick Entry Banner */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row items-center justify-between rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50/50 p-4 sm:p-5 gap-4 shadow-xs">
            <div className="flex items-center space-x-3.5">
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700 border border-amber-200 shrink-0">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-amber-900">Akun Administrator Terverifikasi</div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Anda memiliki akses penuh untuk mengelola pengguna, kuota, paket, dan riwayat analisis di database.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('admin')}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-5 py-2.5 text-xs font-bold text-white transition shadow-sm active:scale-95"
            >
              <span>Buka Admin Panel</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Subscription & Quota Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Paket Langganan</span>
            <div className="flex items-baseline space-x-2">
              <span className="font-teko text-3xl font-bold text-slate-900">
                {userProfile.subscriptionPlan}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Status Langganan</span>
            <div className="mt-1">
              <span
                className={`inline-block px-3 py-0.5 text-xs font-bold rounded-full ${
                  userProfile.subscriptionStatus === 'active'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {userProfile.subscriptionStatus.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Masa Berlaku</span>
            <div className="text-sm font-semibold text-slate-800 mt-1">
              {userProfile.subscriptionEnd
                ? new Date(userProfile.subscriptionEnd).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Masa aktif aktif / Free tier'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Penggunaan Kuota Analisis</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {userProfile.analysisUsed} <span className="text-xs text-slate-500 font-normal">/ {userProfile.analysisLimit} kali</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Sisa Kuota Saat Ini</span>
            <div className="text-xl font-bold text-blue-600 mt-1">
              {Math.max(0, userProfile.analysisLimit - userProfile.analysisUsed)} <span className="text-xs text-slate-500 font-normal">kali analisis</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Terdaftar Sejak</span>
            <div className="text-xs text-slate-700 mt-1">
              {new Date(userProfile.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Security & Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={handleSendReset}
            className="flex items-center justify-center space-x-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition shadow-xs"
          >
            <Key className="h-4 w-4 text-blue-600" />
            <span>Kirim Link Reset Password</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center justify-center space-x-2 rounded-full border border-rose-200 bg-rose-50 px-6 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>
    </div>
  );
};
