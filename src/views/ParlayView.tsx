import React, { useState, useEffect } from 'react';
import { ParlayLeg, SavedAnalysis } from '../types';
import { useAuth } from '../context/AuthContext';
import { getUserAnalyses } from '../services/firestoreService';
import {
  Layers,
  AlertTriangle,
  Plus,
  Trash2,
  Calculator,
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  Flame,
  ShieldAlert,
  Download,
  Share2,
} from 'lucide-react';

interface ParlayViewProps {
  incomingState?: any;
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const ParlayView: React.FC<ParlayViewProps> = ({
  incomingState,
  onNavigate,
  onOpenAuth,
}) => {
  const { currentUser } = useAuth();
  const [legs, setLegs] = useState<ParlayLeg[]>([]);
  const [userAnalyses, setUserAnalyses] = useState<SavedAnalysis[]>([]);
  const [showLoadModal, setShowLoadModal] = useState(false);

  // Handle incoming legs passed from AnalyzeView or Dashboard
  useEffect(() => {
    if (incomingState?.addLegs && Array.isArray(incomingState.addLegs)) {
      const incomingLegs: ParlayLeg[] = incomingState.addLegs;
      setLegs((prev) => {
        const existingNames = new Set(prev.map((l) => l.match));
        const filtered = incomingLegs.filter((l) => !existingNames.has(l.match));
        return [...prev, ...filtered];
      });
    } else if (incomingState?.addLeg) {
      const newLeg: ParlayLeg = incomingState.addLeg;
      setLegs((prev) => {
        if (prev.some((l) => l.match === newLeg.match)) {
          return prev;
        }
        return [...prev, newLeg];
      });
    } else if (incomingState?.addLegFromAnalysis) {
      const a: SavedAnalysis = incomingState.addLegFromAnalysis;
      if (a.multiAnalysis && a.multiAnalysis.parlaySummary?.suggestedLegs?.length > 0) {
        const batchLegs: ParlayLeg[] = a.multiAnalysis.parlaySummary.suggestedLegs.map((s, idx) => ({
          id: `leg_${Date.now()}_${idx}`,
          match: s.match,
          sport: s.sport,
          league: s.league,
          market: s.market,
          pick: s.pick,
          odds: s.odds || '',
          confidence: s.confidence,
          risk: s.risk,
          recommendation: 'BET',
          reason: s.reason,
        }));
        setLegs((prev) => {
          const existingNames = new Set(prev.map((l) => l.match));
          const filtered = batchLegs.filter((l) => !existingNames.has(l.match));
          return [...prev, ...filtered];
        });
      } else {
        const matchName = a.analysis?.match || (a.matches?.[0]?.homeTeam ? `${a.matches[0].homeTeam} vs ${a.matches[0].awayTeam}` : 'Match');
        const newLeg: ParlayLeg = {
          id: `leg_${Date.now()}`,
          match: matchName,
          sport: a.sport,
          league: a.league,
          market: 'Moneyline',
          pick:
            a.analysis?.marketAnalysis?.moneyline?.pick !== 'N/A' && a.analysis?.marketAnalysis?.moneyline?.pick
              ? a.analysis.marketAnalysis.moneyline.pick
              : a.recommendation,
          odds: a.matches?.[0]?.odds?.home || a.matches?.[0]?.odds?.away || '',
          confidence: a.confidence,
          risk: a.riskLevel,
          recommendation: a.recommendation,
        };
        setLegs((prev) => [...prev, newLeg]);
      }
    }
  }, [incomingState]);

  // Load existing analyses for selection
  useEffect(() => {
    if (currentUser?.uid) {
      getUserAnalyses(currentUser.uid)
        .then((data) => setUserAnalyses(data))
        .catch((err) => console.error('Error fetching user analyses for parlay:', err));
    }
  }, [currentUser]);

  const handleAddCustomLeg = () => {
    const newLeg: ParlayLeg = {
      id: `leg_${Date.now()}_${legs.length}`,
      match: '',
      sport: 'Football / Soccer',
      league: '',
      market: 'Moneyline',
      pick: '',
      odds: '',
      confidence: 'N/A',
      risk: 'MEDIUM',
      recommendation: 'BET',
    };
    setLegs([...legs, newLeg]);
  };

  const handleRemoveLeg = (id: string) => {
    setLegs(legs.filter((l) => l.id !== id));
  };

  const handleUpdateLeg = (id: string, field: keyof ParlayLeg, value: string) => {
    setLegs(legs.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleAddFromSavedAnalysis = (analysis: SavedAnalysis) => {
    if (analysis.multiAnalysis && analysis.multiAnalysis.parlaySummary?.suggestedLegs?.length > 0) {
      const batchLegs: ParlayLeg[] = analysis.multiAnalysis.parlaySummary.suggestedLegs.map((s, idx) => ({
        id: `leg_${Date.now()}_${idx}`,
        match: s.match,
        sport: s.sport,
        league: s.league,
        market: s.market,
        pick: s.pick,
        odds: s.odds || '',
        confidence: s.confidence,
        risk: s.risk,
        recommendation: 'BET',
        reason: s.reason,
      }));
      setLegs((prev) => {
        const existingNames = new Set(prev.map((l) => l.match));
        const filtered = batchLegs.filter((l) => !existingNames.has(l.match));
        return [...prev, ...filtered];
      });
      setShowLoadModal(false);
      return;
    }

    const matchName =
      analysis.analysis?.match ||
      (analysis.matches?.[0] ? `${analysis.matches[0].homeTeam} vs ${analysis.matches[0].awayTeam}` : 'Match');
    const newLeg: ParlayLeg = {
      id: `leg_${Date.now()}_${legs.length}`,
      match: matchName,
      sport: analysis.sport,
      league: analysis.league,
      market: 'Moneyline',
      pick:
        analysis.analysis?.marketAnalysis?.moneyline?.pick !== 'N/A' && analysis.analysis?.marketAnalysis?.moneyline?.pick
          ? analysis.analysis.marketAnalysis.moneyline.pick
          : analysis.recommendation,
      odds: analysis.matches?.[0]?.odds?.home || analysis.matches?.[0]?.odds?.away || '',
      confidence: analysis.confidence,
      risk: analysis.riskLevel,
      recommendation: analysis.recommendation,
    };
    setLegs((prev) => [...prev, newLeg]);
    setShowLoadModal(false);
  };

  // Combined Odds Calculation (Rule 16)
  const calculateCombinedOdds = (): { combinedOdds: string | null; allOddsValid: boolean } => {
    if (legs.length === 0) return { combinedOdds: null, allOddsValid: false };

    let total = 1.0;
    let allValid = true;

    for (const leg of legs) {
      const oddVal = parseFloat(leg.odds || '0');
      if (isNaN(oddVal) || oddVal <= 1.0) {
        allValid = false;
        break;
      }
      total *= oddVal;
    }

    if (!allValid) {
      return { combinedOdds: null, allOddsValid: false };
    }

    return { combinedOdds: total.toFixed(2), allOddsValid: true };
  };

  const { combinedOdds, allOddsValid } = calculateCombinedOdds();

  // Rekomendasi 4: Export Parlay Slip to Image (Canvas render)
  const [isExporting, setIsExporting] = useState(false);

  const handleExportSlipToImage = () => {
    if (legs.length === 0) return;
    setIsExporting(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsExporting(false);
        return;
      }

      const width = 800;
      const baseHeight = 360;
      const legHeight = 90;
      const height = baseHeight + legs.length * legHeight;

      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Card Container
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(24, 24, width - 48, height - 48, 24);
      ctx.fill();
      ctx.stroke();

      // Header Bar
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(24, 24, width - 48, 80, [24, 24, 0, 0]);
      ctx.fill();

      // Brand Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('MAX AI ANALIS PARLAY', 48, 65);

      ctx.fillStyle = '#bfdbfe';
      ctx.font = '13px sans-serif';
      ctx.fillText('Official AI Sports Research Slip • ' + new Date().toLocaleDateString('id-ID'), 48, 88);

      // Odds Badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      const oddsText = allOddsValid && combinedOdds ? `Total Odds: @${combinedOdds}` : `${legs.length} Matches`;
      ctx.fillText(oddsText, width - 210, 72);

      // Legs Content
      let y = 140;
      legs.forEach((leg, index) => {
        // Leg box
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.roundRect(48, y, width - 96, 75, 14);
        ctx.fill();

        // Index & League
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`LEG ${index + 1} • ${(leg.sport || 'SPORT').toUpperCase()} • ${leg.league || 'LEAGUE'}`, 64, y + 24);

        // Match Title
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(leg.match, 64, y + 46);

        // Market & Pick
        ctx.fillStyle = '#475569';
        ctx.font = '13px sans-serif';
        ctx.fillText(`Pasar: ${leg.market || 'Pick'} ➔ `, 64, y + 64);

        ctx.fillStyle = '#16a34a';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(leg.pick || '-', 165, y + 64);

        // Odds & Confidence Right
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(leg.odds ? `@${leg.odds}` : '@1.90', width - 140, y + 36);

        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(leg.confidence || '75% Conf', width - 140, y + 56);

        y += legHeight;
      });

      // Footer
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(48, y + 10, width - 96, 1);

      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText('Risiko Parlay: Semakin banyak leg, semakin tinggi risiko satu leg gagal.', 48, y + 36);
      ctx.fillText('max-ai-sports.applet • Analisis Berbasis Data Riil Faktual', 48, y + 54);

      // Download trigger
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `MAX_AI_Parlay_Slip_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export parlay slip:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div id="parlay-view" className="space-y-6 animate-in fade-in pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 rounded-full bg-blue-50 px-3 py-1 border border-blue-200 text-xs font-bold text-blue-600">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            <span>Kalkulator & Penggabung Tiket</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Parlay Builder
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Susun multi-leg pertandingan dari riset AI ke dalam satu tiket parlay presisi. Perhitungan odds mengacu pada data pasar nyata.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {currentUser && userAnalyses.length > 0 && (
            <button
              onClick={() => setShowLoadModal(true)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition shadow-xs"
            >
              + Ambil dari Riwayat ({userAnalyses.length})
            </button>
          )}
          <button
            id="btn-add-custom-leg"
            onClick={handleAddCustomLeg}
            className="flex items-center space-x-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Leg Baru</span>
          </button>
        </div>
      </div>

      {/* Mandatory Parlay Risk Warning */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start space-x-3 shadow-xs">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-900 text-sm">Peringatan Manajemen Risiko Parlay:</p>
          <p className="mt-0.5 leading-relaxed text-amber-800">
            <strong>"Semakin banyak leg yang dikombinasikan, semakin tinggi risiko satu leg gagal."</strong> Batasi kombinasi parlay Anda ke match bernilai ekspektasi positif (high confidence) untuk mitigasi risiko.
          </p>
        </div>
      </div>

      {/* Legs List */}
      <div className="space-y-4">
        {legs.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100">
              <Layers className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Belum Ada Leg di Tiket Parlay</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
              Pilih pertandingan langsung dari hasil Analisis AI, ambil dari riwayat tersimpan, atau input manual melalui tombol di bawah.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onNavigate('analyze')}
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 transition"
              >
                Analisis Pertandingan Baru
              </button>
              <button
                onClick={handleAddCustomLeg}
                className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-600 transition shadow-xs"
              >
                + Tambah Manual
              </button>
            </div>
          </div>
        ) : (
          legs.map((leg, index) => (
            <div
              key={leg.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 transition hover:border-blue-200 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-xs border border-blue-200">
                    {index + 1}
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    Leg #{index + 1}
                  </span>
                  {leg.sport && (
                    <span className="rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      {leg.sport}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveLeg(leg.id)}
                  className="text-xs text-slate-400 hover:text-rose-600 flex items-center space-x-1 p-1.5 rounded-full hover:bg-rose-50 transition"
                  title="Hapus Leg Ini"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Leg Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Pertandingan (Match)
                  </label>
                  <input
                    type="text"
                    value={leg.match}
                    onChange={(e) => handleUpdateLeg(leg.id, 'match', e.target.value)}
                    placeholder="Tim Home vs Tim Away"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Pasaran (Market)
                  </label>
                  <select
                    value={leg.market}
                    onChange={(e) => handleUpdateLeg(leg.id, 'market', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none transition shadow-xs"
                  >
                    <option value="Moneyline">Moneyline</option>
                    <option value="Handicap">Handicap / Spread</option>
                    <option value="Total">Total / Over-Under</option>
                    <option value="Double Chance">Double Chance</option>
                    <option value="BTTS">Both Teams to Score</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Pilihan Pick
                  </label>
                  <input
                    type="text"
                    value={leg.pick}
                    onChange={(e) => handleUpdateLeg(leg.id, 'pick', e.target.value)}
                    placeholder="Home / Over / dll"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Odds Nyata
                  </label>
                  <input
                    type="text"
                    value={leg.odds || ''}
                    onChange={(e) => handleUpdateLeg(leg.id, 'odds', e.target.value)}
                    placeholder="1.85 (Opsional)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none font-mono transition shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Risiko & Konfidensi
                  </label>
                  <div className="flex items-center space-x-2 pt-1.5">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        leg.risk === 'LOW'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : leg.risk === 'HIGH'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {leg.risk || 'MEDIUM'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ({leg.confidence || 'N/A'})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Parlay Slip Summary */}
      {legs.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-blue-600">
              <Calculator className="h-4 w-4" />
              <span>Ringkasan Kalkulasi Tiket Parlay ({legs.length} Leg)</span>
            </div>

            {/* Tombol Export Slip Image (Rekomendasi 4) */}
            <button
              id="btn-export-parlay-slip"
              type="button"
              disabled={isExporting}
              onClick={handleExportSlipToImage}
              className="inline-flex items-center space-x-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 text-blue-400" />
              <span>{isExporting ? 'Mencetak Slip...' : 'Download Slip Gambar (.PNG)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <span className="text-xs text-slate-500 block mb-1">Jumlah Leg Pertandingan</span>
              <span className="font-teko text-3xl font-bold text-slate-900">
                {legs.length} {legs.length > 1 ? 'Legs' : 'Single Leg'}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <span className="text-xs text-slate-500 block mb-1">Combined Odds (Hasil Perkalian)</span>
              {allOddsValid && combinedOdds ? (
                <div className="flex items-baseline space-x-2">
                  <span className="font-teko text-4xl font-bold text-blue-600">
                    @{combinedOdds}
                  </span>
                  <span className="text-[11px] text-slate-500">Perkalian desimal valid</span>
                </div>
              ) : (
                <div className="mt-1">
                  <span className="text-sm font-bold text-slate-700">Odds tidak lengkap</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Masukkan odds nyata di seluruh leg di atas untuk menghitung total odds tiket.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <span className="text-xs text-slate-500 block mb-1">Estimasi Tingkat Risiko</span>
              <span
                className={`font-teko text-3xl font-bold ${
                  legs.length <= 2
                    ? 'text-emerald-600'
                    : legs.length <= 4
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {legs.length <= 2
                  ? 'MODERATE RISK'
                  : legs.length <= 4
                  ? 'HIGH RISK'
                  : 'VERY HIGH RISK'}
              </span>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Berdasarkan jumlah akumulasi event yang harus tembus bersamaan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Load from Saved Analyses */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Pilih Analisis Tersimpan</h3>
              <button
                onClick={() => setShowLoadModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition"
              >
                Tutup
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {userAnalyses.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">
                  Belum ada riwayat analisis yang tersimpan.
                </p>
              ) : (
                userAnalyses.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleAddFromSavedAnalysis(item)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 hover:border-blue-300 hover:bg-blue-50/30 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[10px] text-blue-600 font-semibold">
                        {item.sport} • {item.league}
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">
                        {item.analysis?.match ||
                          (item.multiAnalysis
                            ? `${item.multiAnalysis.matches.length} Match (${item.multiAnalysis.matches.map((m) => m.match).join(', ')})`
                            : item.matches?.[0]
                            ? `${item.matches[0].homeTeam} vs ${item.matches[0].awayTeam}`
                            : 'Analisis Pertandingan')}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {item.recommendation}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
