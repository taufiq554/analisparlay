import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserAnalyses } from '../services/firestoreService';
import { SavedAnalysis } from '../types';
import {
  History,
  Calendar,
  Sparkles,
  Search,
  Filter,
  Eye,
  Layers,
  X,
  Clock,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

interface HistoryViewProps {
  onNavigate: (tab: string, state?: any) => void;
  onOpenAuth: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser } = useAuth();
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sportFilter, setSportFilter] = useState('ALL');
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null);

  useEffect(() => {
    if (currentUser?.uid) {
      setLoading(true);
      getUserAnalyses(currentUser.uid)
        .then((data) => setAnalyses(data))
        .catch((err) => console.error('Error fetching user analyses:', err))
        .finally(() => setLoading(false));
    } else {
      setAnalyses([]);
      setLoading(false);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center my-8 shadow-sm max-w-xl mx-auto">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
          <History className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Riwayat Analisis Terkunci</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto mt-1.5 leading-relaxed">
          Silakan masuk ke akun Anda untuk melihat seluruh arsip hasil riset dan riwayat kalkulasi odds pertandingan yang telah Anda lakukan.
        </p>
        <button
          onClick={onOpenAuth}
          className="mt-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/20"
        >
          Masuk / Daftar Akun
        </button>
      </div>
    );
  }

  const filteredAnalyses = analyses.filter((item) => {
    const matchTitle =
      item.analysis?.match ||
      (item.multiAnalysis
        ? item.multiAnalysis.matches.map((m) => m.match).join(' ')
        : item.matches?.map((m) => `${m.homeTeam} vs ${m.awayTeam}`).join(' ') || '');
    const matchesSearch =
      matchTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.league.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sport.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSport = sportFilter === 'ALL' || item.sport === sportFilter;
    return matchesSearch && matchesSport;
  });

  const availableSports = Array.from(new Set(analyses.map((a) => a.sport)));

  return (
    <div id="history-view" className="space-y-6 animate-in fade-in pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 rounded-full bg-blue-50 px-3 py-1 border border-blue-200 text-xs font-bold text-blue-600">
          <History className="h-3.5 w-3.5 text-blue-600" />
          <span>Arsip Analisis</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
          Riwayat Analisis Anda
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Seluruh data pertandingan yang telah Anda analisis dan simpan ke database akun Anda.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari tim, pertandingan, atau liga..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition shadow-xs"
          />
        </div>

        {availableSports.length > 0 && (
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-500 shrink-0" />
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none transition shadow-xs"
            >
              <option value="ALL">Semua Olahraga</option>
              {availableSports.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content Table / Cards */}
      {loading ? null : analyses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
            <History className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Belum Ada Riwayat Analisis</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 leading-relaxed">
            Riwayat Anda masih kosong. Setiap hasil analisis yang Anda simpan saat menganalisis tiket akan otomatis tersimpan di sini.
          </p>
          <button
            onClick={() => onNavigate('analyze')}
            className="mt-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/20"
          >
            Mulai Analisis Sekarang
          </button>
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-xs">
          Tidak ada analisis yang sesuai dengan kata kunci pencarian Anda.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Table on desktop */}
          <div className="hidden lg:block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">Sport / Liga</th>
                  <th className="px-5 py-3.5">Pertandingan</th>
                  <th className="px-5 py-3.5 text-center">Confidence</th>
                  <th className="px-5 py-3.5 text-center">Risiko</th>
                  <th className="px-5 py-3.5 text-center">Rekomendasi</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAnalyses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{item.sport}</div>
                      <div className="text-[11px] text-blue-600 truncate max-w-[160px]">
                        {item.league}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-900 max-w-xs truncate">
                      {item.analysis?.match ||
                        (item.multiAnalysis?.matches
                          ? `${item.multiAnalysis.matches.length} Match (Multi-Analysis)`
                          : item.matches?.[0]
                          ? `${item.matches[0].homeTeam} vs ${item.matches[0].awayTeam}`
                          : 'Pertandingan')}
                    </td>
                    <td className="px-5 py-4 text-center font-teko text-xl font-bold text-blue-600">
                      {item.confidence || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                          item.riskLevel === 'LOW'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.riskLevel === 'HIGH'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.riskLevel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${
                          item.recommendation === 'BET'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.recommendation === 'WATCH'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.recommendation}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setSelectedAnalysis(item)}
                        className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 transition shadow-xs"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => onNavigate('parlay', { addLegFromAnalysis: item })}
                        className="rounded-full bg-blue-50 border border-blue-200 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-600 hover:text-white transition"
                      >
                        + Parlay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 lg:hidden">
            {filteredAnalyses.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 space-y-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2.5">
                  <span className="font-semibold text-blue-600">{item.sport}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString('id-ID')}</span>
                </div>

                <div>
                  <div className="text-[11px] text-blue-600">{item.league}</div>
                  <div className="font-extrabold text-slate-900 text-base mt-0.5">
                    {item.analysis?.match ||
                      (item.multiAnalysis
                        ? `${item.multiAnalysis.matches.length} Match (${item.multiAnalysis.matches.map((m) => m.match).join(', ')})`
                        : item.matches?.[0]
                        ? `${item.matches[0].homeTeam} vs ${item.matches[0].awayTeam}`
                        : 'Analisis Pertandingan')}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Rekomendasi</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-block mt-0.5 ${
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

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Risiko</span>
                    <span className="text-xs font-bold text-slate-800">
                      {item.riskLevel}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Confidence</span>
                    <span className="font-teko text-2xl font-bold text-blue-600">
                      {item.confidence || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedAnalysis(item)}
                    className="flex-1 rounded-full border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 text-center hover:border-blue-300 hover:text-blue-600 transition shadow-xs"
                  >
                    Buka Detail
                  </button>
                  <button
                    onClick={() => onNavigate('parlay', { addLegFromAnalysis: item })}
                    className="flex-1 rounded-full bg-blue-50 border border-blue-200 py-2 text-xs font-semibold text-blue-700 text-center hover:bg-blue-600 hover:text-white transition"
                  >
                    + Ke Parlay
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Detail Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    {selectedAnalysis.sport} • {selectedAnalysis.league}
                  </span>
                  {(selectedAnalysis.analysis?.provider || selectedAnalysis.multiAnalysis?.provider) && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                      {selectedAnalysis.analysis?.provider || selectedAnalysis.multiAnalysis?.provider}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedAnalysis.analysis?.match ||
                    (selectedAnalysis.multiAnalysis
                      ? `${selectedAnalysis.multiAnalysis.matches.length} Pertandingan Teranalisis`
                      : 'Hasil Analisis')}
                </h3>
                <span className="text-xs text-slate-500">
                  Disimpan pada: {new Date(selectedAnalysis.createdAt).toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="rounded-full p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Badges */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Rekomendasi</span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                  {selectedAnalysis.recommendation}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Risk Level</span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                  {selectedAnalysis.riskLevel}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-[10px] uppercase text-slate-500 font-bold block">Confidence</span>
                <span className="font-teko text-2xl font-bold text-blue-600 block -mt-1">
                  {selectedAnalysis.confidence || 'N/A'}
                </span>
              </div>
            </div>

            {/* If Multi-Match */}
            {selectedAnalysis.multiAnalysis ? (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Daftar Pertandingan ({selectedAnalysis.multiAnalysis.matches.length})
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {selectedAnalysis.multiAnalysis.matches.map((m, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-sm">
                          #{idx + 1} {m.match}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            m.recommendation === 'BET'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : m.recommendation === 'WATCH'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {m.recommendation} ({m.overallConfidence})
                        </span>
                      </div>
                      <p className="text-slate-700">{m.reason}</p>
                    </div>
                  ))}
                </div>

                {selectedAnalysis.multiAnalysis.parlaySummary && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs space-y-2">
                    <span className="font-bold text-blue-800 block">Parlay Summary</span>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>Suggested Legs: <strong className="text-slate-900">{selectedAnalysis.multiAnalysis.parlaySummary.suggestedLegs.length}</strong></div>
                      <div>Risk: <strong className="text-slate-900">{selectedAnalysis.multiAnalysis.parlaySummary.overallRisk}</strong></div>
                    </div>
                    {selectedAnalysis.multiAnalysis.parlaySummary.analysisNote && (
                      <p className="text-slate-600 italic">{selectedAnalysis.multiAnalysis.parlaySummary.analysisNote}</p>
                    )}
                  </div>
                )}
              </div>
            ) : selectedAnalysis.analysis ? (
              <>
                {/* Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <span className="font-bold text-slate-600 block mb-1">Form Home:</span>
                    <p className="text-slate-800">{selectedAnalysis.analysis.form?.home || 'Data tidak tersedia'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <span className="font-bold text-slate-600 block mb-1">Form Away:</span>
                    <p className="text-slate-800">{selectedAnalysis.analysis.form?.away || 'Data tidak tersedia'}</p>
                  </div>
                </div>

                {/* Key factors */}
                <div>
                  <span className="text-xs font-bold text-slate-600 block mb-1.5">Faktor Kunci Pertandingan:</span>
                  <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-800">
                    {selectedAnalysis.analysis.keyFactors.map((f, i) => (
                      <p key={i}>• {f}</p>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                  <span className="font-bold text-slate-600 block mb-1">Alasan Analisis:</span>
                  <p className="text-slate-700 leading-relaxed">{selectedAnalysis.analysis.reason}</p>
                </div>
              </>
            ) : null}

            {/* Footer actions */}
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  onNavigate('parlay', { addLegFromAnalysis: selectedAnalysis });
                  setSelectedAnalysis(null);
                }}
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 transition shadow-md shadow-blue-500/20"
              >
                + Masukkan ke Parlay Builder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
