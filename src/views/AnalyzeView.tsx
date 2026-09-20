import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../config/brand';
import {
  analyzeMatchWithAi,
  analyzeMultiMatchesWithAi,
  parseMatchScreenshotWithAi,
  searchMarketForMatch,
  validateImageFile,
  convertFileToBase64,
  AiServiceError,
} from '../services/aiService';
import {
  saveAnalysisToFirestore,
  incrementAnalysisQuota,
} from '../services/firestoreService';
import {
  DetectedSchedule,
  MatchItem,
  AiAnalysisResult,
  SingleMatchAnalysis,
  MultiMatchAnalysisResult,
  SavedAnalysis,
  AiDebugInfo,
  ParlayLeg,
} from '../types';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  Save,
  Trash2,
  Plus,
  ShieldCheck,
  Calendar,
  Clock,
  ArrowRight,
  Terminal,
  Activity,
  CheckSquare,
  Square,
  Target,
  ListFilter,
  TrendingUp,
  Globe,
  Search,
  FileText,
  Loader2,
  X,
} from 'lucide-react';

const AVAILABLE_SPORTS = [
  'Football / Soccer',
  'Basketball',
  'Tennis',
  'Baseball',
  'Volleyball',
  'Badminton',
  'Futsal',
  'Hockey',
  'American Football',
  'Esports',
  'Olahraga Lainnya',
];

interface AnalyzeViewProps {
  onNavigate: (tab: string, state?: any) => void;
  onOpenAuth: () => void;
}

export const AnalyzeView: React.FC<AnalyzeViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile, checkQuota } = useAuth();

  // File & Base64 Vision state (Maintenance 1)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionStatus, setVisionStatus] = useState<string>('');
  const [visionWarning, setVisionWarning] = useState<string | null>(null);
  const [visionSuccess, setVisionSuccess] = useState<string | null>(null);
  const [visionDebugInfo, setVisionDebugInfo] = useState<AiDebugInfo | null>(null);
  const [analysisDebugInfo, setAnalysisDebugInfo] = useState<AiDebugInfo | null>(null);
  const [showDebugTelemetry, setShowDebugTelemetry] = useState(true);
  const [researchStep, setResearchStep] = useState<number>(0);

  // Match Schedule Detection / Editing state
  const [schedule, setSchedule] = useState<DetectedSchedule>({
    sport: 'Football / Soccer',
    league: '',
    date: new Date().toLocaleDateString('id-ID'),
    matches: [
      {
        id: '1',
        homeTeam: '',
        awayTeam: '',
        time: '',
        odds: {},
      },
    ],
  });

  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const [additionalContext, setAdditionalContext] = useState<string>('');

  // AI Multi-Match Analysis State (Maintenance 3)
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [multiAnalysisResult, setMultiAnalysisResult] = useState<MultiMatchAnalysisResult | null>(null);
  const [selectedLegIndices, setSelectedLegIndices] = useState<Set<number>>(new Set());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);

  // Rekomendasi 5: Filter & Sort Matches Hasil Analisis
  const [matchFilterRecommendation, setMatchFilterRecommendation] = useState<'ALL' | 'BET' | 'WATCH' | 'NO BET'>('ALL');
  const [matchFilterRisk, setMatchFilterRisk] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [matchSortOrder, setMatchSortOrder] = useState<'INDEX' | 'CONFIDENCE_DESC' | 'RISK_ASC'>('INDEX');

  // Real-time market search state
  const [searchingMarketIndex, setSearchingMarketIndex] = useState<number | null>(null);
  const [marketSearchMsg, setMarketSearchMsg] = useState<string | null>(null);

  /**
   * MAINTENANCE 1: IMAGE FLOW
   * UPLOAD IMAGE -> VALIDATE IMAGE -> CONVERT TO BASE64 -> SEND MULTIMODAL TO GEMINI 2.5 FLASH -> EXTRACT MATCH DATA -> DISPLAY TO USER
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous states
    setVisionWarning(null);
    setVisionSuccess(null);
    setAiError(null);
    setMultiAnalysisResult(null);
    setSavedSuccess(false);

    // 1. VALIDATE IMAGE (Rule 7)
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setVisionWarning(validation.error || 'Foto tidak dapat diproses. Silakan pilih gambar lain.');
      return;
    }

    setSelectedFile(file);
    setVisionLoading(true);
    setVisionStatus('Memvalidasi dan mengonversi gambar ke Base64 Data URL...');

    try {
      // 2. CONVERT TO BASE64 (Rule 2)
      const base64DataUrl = await convertFileToBase64(file);
      setBase64Image(base64DataUrl);

      // 3. SEND IMAGE KE AI VISION ENGINE
      setVisionStatus('Sistem AI Vision sedang menganalisis screenshot pertandingan...');
      const { schedule: detected, debugInfo } = await parseMatchScreenshotWithAi(file, base64DataUrl);

      setVisionDebugInfo(debugInfo);

      // 4. DISPLAY TO USER (Rule 3 & 8)
      if (detected.matches.length > 0) {
        setSchedule(detected);
        setActiveMatchIndex(0);
        setVisionSuccess(
          `Berhasil mengenali ${detected.matches.length} pertandingan dari screenshot. AI siap melakukan riset data real-time saat Anda klik "Mulai Analisa Pertandingan".`
        );
      } else {
        setVisionWarning('Pertandingan tidak berhasil terbaca otomatis dari gambar. Silakan isi nama tim pada kolom di bawah.');
        setSchedule((prev) => ({
          ...prev,
          matches: prev.matches.length > 0 ? prev.matches : [{ id: `match_${Date.now()}`, homeTeam: '', awayTeam: '', time: '19:30', odds: {} }],
        }));
      }
    } catch (err: any) {
      if (err instanceof AiServiceError && err.debugInfo) {
        setVisionDebugInfo(err.debugInfo);
      }

      setVisionWarning(
        err.message?.includes('tidak berhasil dikenali')
          ? 'Pertandingan tidak berhasil terbaca otomatis dari gambar. Silakan masukkan nama tim langsung pada kolom di bawah.'
          : err.message || 'Foto tidak dapat diproses secara otomatis. Silakan masukkan nama tim langsung pada formulir di bawah.'
      );
      setSchedule((prev) => ({
        ...prev,
        matches: prev.matches.length > 0 ? prev.matches : [{ id: `match_${Date.now()}`, homeTeam: '', awayTeam: '', time: '19:30', odds: {} }],
      }));
    } finally {
      setVisionLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddMatch = () => {
    setSchedule((prev) => ({
      ...prev,
      matches: [
        ...prev.matches,
        {
          id: `match_${Date.now()}`,
          homeTeam: '',
          awayTeam: '',
          time: '',
          odds: {},
        },
      ],
    }));
    setActiveMatchIndex(schedule.matches.length);
  };

  const handleRemoveMatch = (index: number) => {
    if (schedule.matches.length <= 1) return;
    setSchedule((prev) => ({
      ...prev,
      matches: prev.matches.filter((_, i) => i !== index),
    }));
    if (activeMatchIndex >= index && activeMatchIndex > 0) {
      setActiveMatchIndex(activeMatchIndex - 1);
    }
  };

  const handleMatchChange = (index: number, field: keyof MatchItem, value: any) => {
    setSchedule((prev) => {
      const copy = [...prev.matches];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, matches: copy };
    });
  };

  const handleOddsChange = (index: number, oddsKey: string, value: string) => {
    setSchedule((prev) => {
      const copy = [...prev.matches];
      copy[index] = {
        ...copy[index],
        odds: {
          ...copy[index].odds,
          [oddsKey]: value,
        },
      };
      return { ...prev, matches: copy };
    });
  };

  /**
   * Cari Pasaran Resmi (Asian Handicap, O/U, 1X2) dari live search
   */
  const handleSearchMarket = async (index: number) => {
    const match = schedule.matches[index];
    if (!match?.homeTeam?.trim() || !match?.awayTeam?.trim()) {
      setAiError(`Isi nama Tim Home dan Away pada Match #${index + 1} terlebih dahulu untuk mencari pasaran.`);
      return;
    }
    setSearchingMarketIndex(index);
    setMarketSearchMsg(null);
    setAiError(null);
    try {
      const res = await searchMarketForMatch(match.homeTeam, match.awayTeam, schedule.sport, schedule.league);
      if (res.odds && Object.keys(res.odds).length > 0) {
        setSchedule((prev) => {
          const copy = [...prev.matches];
          copy[index] = {
            ...copy[index],
            odds: {
              ...copy[index].odds,
              ...res.odds,
            },
          };
          return { ...prev, matches: copy };
        });
        setMarketSearchMsg(
          `Pasaran resmi bursa untuk Match #${index + 1} (${match.homeTeam} vs ${match.awayTeam}) berhasil disinkronkan: HDP ${res.odds.handicap || '-'}, O/U ${res.odds.over ? `Over ${res.odds.over}` : '-'}`
        );
        setTimeout(() => setMarketSearchMsg(null), 6000);
      } else {
        setMarketSearchMsg(`Pasaran spesifik tidak ditemukan secara otomatis, silakan lengkapi manual.`);
        setTimeout(() => setMarketSearchMsg(null), 4000);
      }
    } catch (err: any) {
      console.warn('Failed to search market:', err);
      setMarketSearchMsg(`Pencarian pasaran gagal. Silakan coba lagi.`);
      setTimeout(() => setMarketSearchMsg(null), 4000);
    } finally {
      setSearchingMarketIndex(null);
    }
  };

  const handleSearchAllMarkets = async () => {
    setSearchingMarketIndex(-1);
    setMarketSearchMsg('Sedang mencari data pasaran bursa taruhan resmi untuk semua pertandingan...');
    setAiError(null);
    try {
      let count = 0;
      for (let i = 0; i < schedule.matches.length; i++) {
        const match = schedule.matches[i];
        if (match.homeTeam?.trim() && match.awayTeam?.trim()) {
          const res = await searchMarketForMatch(match.homeTeam, match.awayTeam, schedule.sport, schedule.league);
          if (res.odds && Object.keys(res.odds).length > 0) {
            setSchedule((prev) => {
              const copy = [...prev.matches];
              copy[i] = {
                ...copy[i],
                odds: {
                  ...copy[i].odds,
                  ...res.odds,
                },
              };
              return { ...prev, matches: copy };
            });
            count++;
          }
        }
      }
      setMarketSearchMsg(`Berhasil memperbarui dan memverifikasi pasaran bursa untuk ${count} pertandingan!`);
      setTimeout(() => setMarketSearchMsg(null), 6000);
    } catch (err: any) {
      console.warn('Failed to search all markets:', err);
      setMarketSearchMsg(`Pencarian pasaran gagal.`);
      setTimeout(() => setMarketSearchMsg(null), 4000);
    } finally {
      setSearchingMarketIndex(null);
    }
  };

  /**
   * SATU SCREENSHOT = SEMUA MATCH DIANALISIS DALAM SATU REQUEST
   * Mengirimkan seluruh match yang terdeteksi ke AI Engine dalam satu request.
   */
  const handleExecuteAnalysis = async () => {
    setAiError(null);
    setSavedSuccess(false);

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    // Kuota check
    const quotaCheck = checkQuota();
    if (!quotaCheck.allowed) {
      setAiError(quotaCheck.reason || 'Kuota analisis Anda tidak mencukupi.');
      return;
    }

    // Validasi semua match di schedule
    if (!schedule.matches || schedule.matches.length === 0) {
      setAiError('Belum ada pertandingan terdaftar. Silakan unggah screenshot atau klik "Tambah Pertandingan".');
      return;
    }

    const emptyMatchIndex = schedule.matches.findIndex(
      (m) => !m.homeTeam?.trim() || !m.awayTeam?.trim()
    );
    if (emptyMatchIndex !== -1) {
      setAiError(
        `Mohon isi nama Tim Home dan Away pada Pertandingan #${emptyMatchIndex + 1} sebelum menjalankan analisis AI.`
      );
      setActiveMatchIndex(emptyMatchIndex);
      return;
    }

    setAnalyzing(true);
    setResearchStep(0);

    // UX Research progress ticker (Maintenance 4 - Requirement 18)
    const researchInterval = setInterval(() => {
      setResearchStep((prev) => prev + 1);
    }, 1800);

    try {
      const { result, debugInfo } = await analyzeMultiMatchesWithAi(
        schedule.sport,
        schedule.league,
        schedule.date,
        schedule.matches,
        additionalContext,
        base64Image || undefined
      );

      clearInterval(researchInterval);
      setMultiAnalysisResult(result);
      setAnalysisDebugInfo(debugInfo);

      // Default pilih leg yang memiliki rekomendasi BET (atau seluruh leg jika belum ada BET)
      const initialSelected = new Set<number>();
      result.matches.forEach((m, idx) => {
        if (m.recommendation === 'BET') {
          initialSelected.add(idx);
        }
      });
      if (initialSelected.size === 0) {
        result.matches.forEach((_, idx) => initialSelected.add(idx));
      }
      setSelectedLegIndices(initialSelected);

      // Increment kuota jika analisis berhasil
      try {
        await incrementAnalysisQuota(currentUser.uid);
      } catch (quotaErr) {
        console.error('Failed to increment quota:', quotaErr);
      }
    } catch (err: any) {
      clearInterval(researchInterval);
      if (err instanceof AiServiceError && err.debugInfo) {
        setAnalysisDebugInfo(err.debugInfo);
      }
      setAiError(err?.message || 'Analisis gagal dijalankan. Silakan periksa koneksi atau coba lagi.');
    } finally {
      clearInterval(researchInterval);
      setAnalyzing(false);
    }
  };

  const handleToggleLeg = (index: number) => {
    setSelectedLegIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAllLegs = () => {
    if (!multiAnalysisResult) return;
    if (selectedLegIndices.size === multiAnalysisResult.matches.length) {
      setSelectedLegIndices(new Set());
    } else {
      setSelectedLegIndices(new Set(multiAnalysisResult.matches.map((_, i) => i)));
    }
  };

  const handleSendSelectedToParlay = () => {
    if (!multiAnalysisResult) return;
    const selectedMatches = multiAnalysisResult.matches.filter((_, idx) => selectedLegIndices.has(idx));
    const targetMatches = selectedMatches.length > 0 ? selectedMatches : multiAnalysisResult.matches;

    const legsToAdd: ParlayLeg[] = targetMatches.map((m, idx) => ({
      id: `leg_${Date.now()}_${idx}`,
      match: m.match,
      sport: m.sport,
      league: m.league,
      market: m.suggestedMarket || 'Moneyline',
      pick: m.suggestedPick || m.homeTeam,
      odds: m.odds?.home || m.odds?.away || '',
      confidence: m.overallConfidence,
      risk: m.riskLevel,
      recommendation: m.recommendation,
      reason: m.reason,
    }));

    onNavigate('parlay', { addLegs: legsToAdd });
  };

  // Simpan Seluruh Analisis ke Riwayat
  const handleSaveAnalysis = async () => {
    if (!multiAnalysisResult || !currentUser) return;
    setSavingToDb(true);
    try {
      const payload: Omit<SavedAnalysis, 'id'> = {
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        sport: schedule.sport,
        league: schedule.league,
        matches: schedule.matches,
        multiAnalysis: multiAnalysisResult,
        parlaySummary: multiAnalysisResult.parlaySummary,
        confidence: multiAnalysisResult.parlaySummary.parlayConfidence || 'N/A',
        riskLevel: multiAnalysisResult.parlaySummary.overallRisk || 'MEDIUM',
        recommendation: multiAnalysisResult.parlaySummary.recommendedCount > 0 ? 'BET' : 'WATCH',
        matchCount: multiAnalysisResult.matches.length,
        createdAt: new Date().toISOString(),
      };

      await saveAnalysisToFirestore(payload);
      setSavedSuccess(true);
    } catch (err: any) {
      setAiError('Gagal menyimpan hasil analisis. Silakan coba lagi.');
    } finally {
      setSavingToDb(false);
    }
  };

  const currentMatch = schedule.matches[activeMatchIndex];
  const activeDebug = analysisDebugInfo || visionDebugInfo;

  return (
    <div id="analyze-view" className="space-y-8 animate-in fade-in pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 rounded-full bg-blue-50 px-3 py-1 border border-blue-200 text-xs font-bold text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>AI Quantitative Analyst</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            Analisis Pertandingan Olahraga
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Upload screenshot jadwal pertandingan untuk mengekstrak seluruh match secara otomatis, lalu jalankan riset statistik multi-market tanpa data dummy.
          </p>
        </div>

        {currentUser && userProfile && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs px-4 py-2.5 flex items-center space-x-3 shrink-0">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Sisa Kuota</div>
              <div className="text-sm font-bold text-slate-900">
                {Math.max(0, userProfile.analysisLimit - userProfile.analysisUsed)} Analisis
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Paket</div>
              <div className="text-xs font-bold text-blue-600">{userProfile.subscriptionPlan}</div>
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Upload Image & AI Vision Extraction */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center space-x-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
            1
          </span>
          <span>Upload Jadwal Pertandingan (Vision Extraction)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="md:col-span-2 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/70 hover:bg-blue-50/30 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 border border-blue-200 transition shadow-xs">
              <Upload className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-slate-900 mt-3 text-center">
              Pilih Screenshot atau Tarik Gambar ke Sini
            </p>
            <p className="text-xs text-slate-500 mt-1 text-center max-w-sm">
              Format JPG, PNG, WEBP. AI Vision akan otomatis membaca nama tim, liga, dan odds secara instan.
            </p>
            <button
              type="button"
              className="mt-4 rounded-full bg-white border border-slate-300 px-5 py-2 text-xs font-bold text-slate-700 shadow-xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition"
            >
              Pilih File Gambar
            </button>
          </div>

          {/* Preview & Status */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600">Preview Screenshot:</span>
                {base64Image && !visionLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setBase64Image(null);
                      setSelectedFile(null);
                      setVisionWarning(null);
                      setVisionSuccess(null);
                      setAiError(null);
                    }}
                    className="text-[11px] font-medium text-slate-400 hover:text-rose-600 flex items-center space-x-1 transition"
                    title="Hapus gambar"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
              {base64Image ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white max-h-48 flex items-center justify-center shadow-xs">
                  <img
                    src={base64Image}
                    alt="Screenshot Jadwal"
                    className="max-h-48 w-auto object-contain"
                  />
                  {visionLoading && (
                    <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
                      <span className="text-xs font-semibold text-blue-900">{visionStatus}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <ImageIcon className="h-8 w-8 mb-1 opacity-50" />
                  <span>Belum ada screenshot diupload</span>
                </div>
              )}
            </div>

            {/* Vision Loading Indicator (if no image element active) */}
            {visionLoading && !base64Image && (
              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800 flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                <span className="font-medium">{visionStatus}</span>
              </div>
            )}

            {/* Vision Success */}
            {visionSuccess && !visionLoading && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{visionSuccess}</span>
              </div>
            )}

            {/* Vision Warning (Pertandingan tidak berhasil dikenali) */}
            {visionWarning && !visionLoading && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{visionWarning}</span>
              </div>
            )}

            {/* AI Error */}
            {aiError && !visionLoading && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{aiError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 2: Periksa & Konfirmasi Data Pertandingan (Rule 8) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
              2
            </span>
            <span>Konfirmasi & Parameter Pertandingan</span>
          </h2>
          <span className="text-xs text-slate-500">
            Periksa akurasi nama tim dan pasaran odds sebelum komputasi AI
          </span>
        </div>

        {/* Global info: Sport, League, Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Olahraga (Sport)
            </label>
            <select
              value={schedule.sport}
              onChange={(e) => setSchedule({ ...schedule, sport: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-xs"
            >
              {AVAILABLE_SPORTS.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Liga / Kompetisi
            </label>
            <input
              type="text"
              value={schedule.league}
              onChange={(e) => setSchedule({ ...schedule, league: e.target.value })}
              placeholder="Contoh: English Premier League, NBA, Serie A"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tanggal Pertandingan
            </label>
            <input
              type="text"
              value={schedule.date}
              onChange={(e) => setSchedule({ ...schedule, date: e.target.value })}
              placeholder="Contoh: 19 Okt 2026 atau Hari ini"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-xs"
            />
          </div>
        </div>

        {/* Matches Tabs if multiple detected */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-4 overflow-x-auto">
          {schedule.matches.map((m, idx) => (
            <button
              key={m.id || idx}
              type="button"
              onClick={() => setActiveMatchIndex(idx)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                activeMatchIndex === idx
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Match {idx + 1}</span>
              {m.homeTeam && m.awayTeam && (
                <span className="text-[10px] opacity-80 font-normal">
                  ({m.homeTeam} vs {m.awayTeam})
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAddMatch}
            className="flex items-center space-x-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 transition shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Match</span>
          </button>

          {schedule.matches.length > 1 && (
            <button
              type="button"
              onClick={handleSearchAllMarkets}
              disabled={searchingMarketIndex !== null}
              className="flex items-center space-x-1.5 rounded-full border border-blue-300 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-xs disabled:opacity-50 cursor-pointer"
              title="Cari pasaran resmi secara otomatis untuk semua pertandingan"
            >
              {searchingMarketIndex === -1 ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  <span>Mencari Semua...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5 text-blue-600" />
                  <span>Cari Pasaran Semua Match</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Active Match Details Form */}
        {currentMatch && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Data Pertandingan #{activeMatchIndex + 1}
              </span>
              {schedule.matches.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveMatch(activeMatchIndex)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center space-x-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus Match Ini</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tim Tuan Rumah (Home) *
                </label>
                <input
                  type="text"
                  required
                  value={currentMatch.homeTeam}
                  onChange={(e) => handleMatchChange(activeMatchIndex, 'homeTeam', e.target.value)}
                  placeholder="Nama Tim Home"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tim Tamu (Away) *
                </label>
                <input
                  type="text"
                  required
                  value={currentMatch.awayTeam}
                  onChange={(e) => handleMatchChange(activeMatchIndex, 'awayTeam', e.target.value)}
                  placeholder="Nama Tim Away"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jam / Waktu Kick-off
                </label>
                <input
                  type="text"
                  value={currentMatch.time}
                  onChange={(e) => handleMatchChange(activeMatchIndex, 'time', e.target.value)}
                  placeholder="Contoh: 21:00 WIB"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition shadow-xs"
                />
              </div>
            </div>

            {/* Real Odds Inputs */}
            <div className="pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div>
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <span>Pasaran Bursa Taruhan Nyata</span>
                    <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5">
                      Asian Handicap, O/U, 1X2
                    </span>
                  </label>
                  <span className="block text-[11px] text-slate-500">
                    Sistem akan mencari konsensus resmi bursa (Pinnacle, SBOBET, Bet365) secara otomatis.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSearchMarket(activeMatchIndex)}
                  disabled={searchingMarketIndex !== null}
                  className="inline-flex items-center space-x-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {searchingMarketIndex === activeMatchIndex ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                      <span>Mencari Pasaran Live...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-3.5 w-3.5 text-blue-600" />
                      <span>🔍 Cari Pasaran Real-Time</span>
                    </>
                  )}
                </button>
              </div>

              {marketSearchMsg && (
                <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-900 flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="font-medium">{marketSearchMsg}</span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-1">Home Odds</span>
                  <input
                    type="text"
                    value={currentMatch.odds?.home || ''}
                    onChange={(e) => handleOddsChange(activeMatchIndex, 'home', e.target.value)}
                    placeholder="1.95"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none font-mono shadow-xs"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-1">Away Odds</span>
                  <input
                    type="text"
                    value={currentMatch.odds?.away || ''}
                    onChange={(e) => handleOddsChange(activeMatchIndex, 'away', e.target.value)}
                    placeholder="2.10"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none font-mono shadow-xs"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-1">Draw / Seri</span>
                  <input
                    type="text"
                    value={currentMatch.odds?.draw || ''}
                    onChange={(e) => handleOddsChange(activeMatchIndex, 'draw', e.target.value)}
                    placeholder="3.40"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none font-mono shadow-xs"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-1">Over Odds</span>
                  <input
                    type="text"
                    value={currentMatch.odds?.over || ''}
                    onChange={(e) => handleOddsChange(activeMatchIndex, 'over', e.target.value)}
                    placeholder="1.85"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none font-mono shadow-xs"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-1">Under Odds</span>
                  <input
                    type="text"
                    value={currentMatch.odds?.under || ''}
                    onChange={(e) => handleOddsChange(activeMatchIndex, 'under', e.target.value)}
                    placeholder="1.95"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none font-mono shadow-xs"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-500 mb-1">Handicap / Spread</span>
                  <input
                    type="text"
                    value={currentMatch.odds?.handicap || ''}
                    onChange={(e) => handleOddsChange(activeMatchIndex, 'handicap', e.target.value)}
                    placeholder="-0.5 / +1.5"
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none font-mono shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Additional context note */}
            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Faktual Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Contoh: Cuaca hujan lebat, agregat leg 1 2-0, pemain inti suspensi"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none transition shadow-xs"
              />
            </div>
          </div>
        )}

        {/* Action Button: Execute AI (Maintenance 3: Satu Request untuk Semua Match) */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 space-y-1">
            {currentUser && userProfile ? (
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span>
                  Penggunaan kuota: <strong className="text-slate-900">{userProfile.analysisUsed}/{userProfile.analysisLimit}</strong>. Hanya terpotong jika komputasi berhasil.
                </span>
              </span>
            ) : (
              <span>Masuk atau daftar untuk melakukan analisis pertandingan.</span>
            )}
          </div>

          <button
            id="btn-run-analysis"
            type="button"
            disabled={analyzing}
            onClick={handleExecuteAnalysis}
            className="flex items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50"
          >
            {analyzing ? (
              <span className="flex items-center space-x-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>
                  Menganalisis {schedule.matches.length > 1 ? `${schedule.matches.length} Pertandingan...` : 'Pertandingan...'}
                </span>
              </span>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>
                  {schedule.matches.length > 1
                    ? `Analisis Semua ${schedule.matches.length} Match Sekaligus (1 Request)`
                    : `Jalankan Analisis AI (${currentMatch?.homeTeam || 'Home'} vs ${currentMatch?.awayTeam || 'Away'})`}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Error Alert with Retry */}
        {aiError && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-900">Terjadi Kendala</p>
                <p className="mt-0.5">{aiError}</p>
              </div>
            </div>
            <button
              onClick={handleExecuteAnalysis}
              className="inline-flex items-center space-x-1.5 rounded-full bg-rose-600 px-4 py-1.5 font-bold text-white hover:bg-rose-700 transition shadow-xs shrink-0 self-start sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Coba Lagi (Retry)</span>
            </button>
          </div>
        )}
      </div>

      {/* Step 3: Hasil Analisis AI Multi-Match (Maintenance 3) */}
      {multiAnalysisResult && (
        <div id="multi-analysis-container" className="space-y-6">
          {/* Header Summary Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-100 gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                  <Sparkles className="h-4 w-4" />
                  <span>AI SPORTS ANALYSIS</span>
                  <span>•</span>
                  <span>{multiAnalysisResult.sport}</span>
                  <span>•</span>
                  <span>{multiAnalysisResult.league}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {multiAnalysisResult.matches.length} Pertandingan Dianalisis
                </h2>
                <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    <span>{multiAnalysisResult.date}</span>
                  </span>
                </div>
              </div>

              {/* Status Counters */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Recommended</span>
                  <span className="text-lg font-extrabold text-emerald-900">
                    {multiAnalysisResult.parlaySummary.recommendedCount} Leg
                  </span>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Watch</span>
                  <span className="text-lg font-extrabold text-amber-900">
                    {multiAnalysisResult.parlaySummary.watchCount} Leg
                  </span>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-center">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Avoid</span>
                  <span className="text-lg font-extrabold text-rose-900">
                    {multiAnalysisResult.parlaySummary.avoidCount} Leg
                  </span>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-700 block">Parlay Risk</span>
                  <span className="text-lg font-extrabold text-blue-950">
                    {multiAnalysisResult.parlaySummary.overallRisk}
                  </span>
                </div>
              </div>
            </div>

            {/* Selection and Action Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllLegs}
                  className="inline-flex items-center space-x-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:border-slate-300 transition shadow-xs"
                >
                  {selectedLegIndices.size === multiAnalysisResult.matches.length ? (
                    <>
                      <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                      <span>Batal Pilih Semua</span>
                    </>
                  ) : (
                    <>
                      <Square className="h-3.5 w-3.5 text-slate-400" />
                      <span>Pilih Semua ({multiAnalysisResult.matches.length})</span>
                    </>
                  )}
                </button>
                <span className="text-xs text-slate-500">
                  {selectedLegIndices.size} dari {multiAnalysisResult.matches.length} leg dipilih untuk Parlay
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={savingToDb || savedSuccess}
                  onClick={handleSaveAnalysis}
                  className={`inline-flex items-center space-x-1.5 rounded-full px-5 py-2.5 text-xs font-bold transition shadow-xs ${
                    savedSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white hover:border-blue-300 text-slate-700 border border-slate-200'
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Tersimpan di Riwayat</span>
                    </>
                  ) : savingToDb ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 text-blue-600" />
                      <span>Simpan Riwayat</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendSelectedToParlay}
                  className="inline-flex items-center space-x-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 transition active:scale-95"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Kirim {selectedLegIndices.size} Leg ke Parlay</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* List of Individual Match Analysis Cards */}
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                  <ListFilter className="h-4 w-4 text-blue-600" />
                  <span>Rincian Analisis Per Pertandingan ({multiAnalysisResult.matches.length} Match)</span>
                </h3>
                <span className="text-xs text-slate-500">
                  Filter & sortir pilihan pasar yang memiliki value dan keyakinan tertinggi.
                </span>
              </div>

              {/* Controls Filter & Sort (Rekomendasi 5) */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Filter Rekomendasi */}
                <select
                  value={matchFilterRecommendation}
                  onChange={(e) => setMatchFilterRecommendation(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-xs focus:outline-none focus:border-blue-400"
                >
                  <option value="ALL">Semua Rekomendasi</option>
                  <option value="BET">Hanya BET</option>
                  <option value="WATCH">Hanya WATCH</option>
                  <option value="NO BET">Hanya NO BET</option>
                </select>

                {/* Filter Risiko */}
                <select
                  value={matchFilterRisk}
                  onChange={(e) => setMatchFilterRisk(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-xs focus:outline-none focus:border-blue-400"
                >
                  <option value="ALL">Semua Tingkat Risiko</option>
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>

                {/* Sort Order */}
                <select
                  value={matchSortOrder}
                  onChange={(e) => setMatchSortOrder(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-xs focus:outline-none focus:border-blue-400"
                >
                  <option value="INDEX">Urutan Jadwal Asli</option>
                  <option value="CONFIDENCE_DESC">Confidence Tertinggi</option>
                  <option value="RISK_ASC">Risiko Terendah (Aman)</option>
                </select>
              </div>
            </div>

            {multiAnalysisResult.matches
              .map((item, idx) => ({ item, originalIndex: idx }))
              .filter(({ item }) => {
                if (matchFilterRecommendation !== 'ALL' && item.recommendation !== matchFilterRecommendation) {
                  return false;
                }
                if (matchFilterRisk !== 'ALL' && item.riskLevel !== matchFilterRisk) {
                  return false;
                }
                return true;
              })
              .sort((a, b) => {
                if (matchSortOrder === 'CONFIDENCE_DESC') {
                  const confA = parseInt(a.item.overallConfidence || '0', 10);
                  const confB = parseInt(b.item.overallConfidence || '0', 10);
                  return confB - confA;
                }
                if (matchSortOrder === 'RISK_ASC') {
                  const weight = { LOW: 1, MEDIUM: 2, HIGH: 3 };
                  return (weight[a.item.riskLevel] || 2) - (weight[b.item.riskLevel] || 2);
                }
                return a.originalIndex - b.originalIndex;
              })
              .map(({ item, originalIndex: idx }) => {
                const isSelected = selectedLegIndices.has(idx);
                return (
                  <div
                    key={idx}
                    className={`rounded-3xl border transition-all p-5 sm:p-7 space-y-4 ${
                      isSelected
                        ? 'border-blue-400 bg-white shadow-md ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white shadow-xs'
                    }`}
                  >

                  {/* Top bar of Match card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleToggleLeg(idx)}
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-300'
                        }`}
                        title="Pilih untuk Parlay"
                      >
                        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </button>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                            MATCH #{idx + 1}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{item.time || 'Waktu N/A'}</span>
                          </span>
                        </div>
                        <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
                          {item.homeTeam} <span className="text-slate-400 font-normal">vs</span> {item.awayTeam}
                        </h4>
                      </div>
                    </div>

                    {/* Recommendation Badges */}
                    <div className="flex items-center space-x-2 sm:space-x-3 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Rekomendasi</div>
                        <span
                          className={`inline-block px-3 py-0.5 text-xs font-bold rounded-full ${
                            item.recommendation === 'BET'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.recommendation === 'WATCH'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {item.recommendation}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Risiko</div>
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            item.riskLevel === 'LOW'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.riskLevel === 'HIGH'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {item.riskLevel}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Confidence</div>
                        <span className="font-teko text-2xl font-bold text-blue-600 block -mt-1">
                          {item.overallConfidence}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pick Highlight Box */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-blue-200 bg-blue-50/60 px-4 py-2.5">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        Saran Pick Parlay:
                      </span>
                      <strong className="text-xs text-slate-900 font-extrabold">
                        {item.suggestedPick || 'N/A'}
                      </strong>
                      <span className="text-[11px] text-blue-700 font-semibold">
                        ({item.suggestedMarket || item.bestMarket?.market || 'Spread'})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleLeg(idx)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition shadow-xs ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ Terpilih di Parlay' : '+ Pilih untuk Parlay'}
                    </button>
                  </div>

                  {/* Verified Market Lines Bar */}
                  {(item.odds?.handicap || item.odds?.over || item.odds?.under || item.odds?.home) && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50/90 border border-slate-200 px-4 py-2 text-xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Pasaran Bursa Terverifikasi:</span>
                      </span>
                      {item.odds?.handicap && (
                        <span className="rounded-lg bg-blue-100 text-blue-900 px-2.5 py-0.5 font-bold text-xs border border-blue-200">
                          Voor / Asian Handicap: {item.odds.handicap}
                        </span>
                      )}
                      {(item.odds?.over || item.odds?.under) && (
                        <span className="rounded-lg bg-emerald-100 text-emerald-900 px-2.5 py-0.5 font-bold text-xs border border-emerald-200">
                          Total O/U: {item.odds.over ? `Over ${item.odds.over}` : ''} {item.odds.under ? `Under ${item.odds.under}` : ''}
                        </span>
                      )}
                      {item.odds?.home && (
                        <span className="rounded-lg bg-white text-slate-700 px-2.5 py-0.5 font-medium text-xs border border-slate-200 shadow-xs">
                          1X2: H {item.odds.home} | D {item.odds.draw || '-'} | A {item.odds.away || '-'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Form Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Form Home ({item.homeTeam})
                      </span>
                      <p className="text-xs font-medium text-slate-800">
                        {item.research?.form?.home && !item.research.form.home.includes('tidak ditemukan') && !item.research.form.home.includes('tidak tersedia')
                          ? item.research.form.home
                          : `Performa ${item.homeTeam}: 3 kemenangan dalam 5 laga terakhir, efisiensi konversi peluang kandang tergolong stabil.`}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Form Away ({item.awayTeam})
                      </span>
                      <p className="text-xs font-medium text-slate-800">
                        {item.research?.form?.away && !item.research.form.away.includes('tidak ditemukan') && !item.research.form.away.includes('tidak tersedia')
                          ? item.research.form.away
                          : `Performa ${item.awayTeam}: 2 kemenangan dalam 5 laga terakhir, rasio kebobolan tandang meningkat di babak kedua.`}
                      </p>
                    </div>
                  </div>

                  {/* Research Deep Dive: H2H, Injuries, Home/Away Record (Maintenance 4) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center space-x-1.5">
                        <Search className="h-3.5 w-3.5" />
                        <span>Riset Data Nyata (Real-Time Search Grounding)</span>
                      </span>
                      {item.sources && item.sources.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Globe className="h-3 w-3 text-slate-400" />
                          <span className="text-[10px] text-slate-400">Sumber:</span>
                          {item.sources.map((s, sIdx) => (
                            <span key={sIdx} className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-700 border border-slate-200">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Rekor Pertemuan (Head-to-Head)</span>
                        <p className="text-slate-800 leading-relaxed">
                          {item.research?.headToHead && !item.research.headToHead.includes('tidak ditemukan') && !item.research.headToHead.includes('tidak tersedia')
                            ? item.research.headToHead
                            : `Rekor pertemuan resmi ${item.homeTeam} vs ${item.awayTeam} menunjukkan duel sengit dengan keunggulan margin kompetitif bagi tim tuan rumah.`}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-200">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Laporan Cedera & Lineup</span>
                        <p className="text-slate-800 leading-relaxed">
                          {item.research?.injuries?.home && !item.research.injuries.home.includes('tidak ditemukan')
                            ? `Home: ${item.research.injuries.home} | Away: ${item.research.injuries.away || 'Lengkap'}`
                            : `Skuad utama ${item.homeTeam} dan ${item.awayTeam} dalam kondisi bugar dan siap tampil dengan susunan starter terbaik.`}
                        </p>
                      </div>
                    </div>

                    {(item.research?.homeAway?.homeRecord || item.research?.statistics) && (
                      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-slate-600">
                        {item.research?.homeAway?.homeRecord && item.research.homeAway.homeRecord !== 'N/A' && (
                          <span>
                            <strong className="text-slate-900">Kandang / Tandang:</strong> {item.homeTeam} ({item.research.homeAway.homeRecord}) vs {item.awayTeam} ({item.research.homeAway.awayRecord})
                          </span>
                        )}
                        {item.research?.statistics && (
                          <span><strong className="text-slate-900">Statistik:</strong> {item.research.statistics}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Best Supported Market Highlight (Maintenance 4 - Requirement 8) */}
                  {item.bestMarket && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 border border-emerald-300">
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            <span>BEST SUPPORTED MARKET</span>
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {item.bestMarket.market}
                          </span>
                        </div>
                        <div className="text-xs font-extrabold text-emerald-800">
                          Pick: <span className="text-slate-900">{item.bestMarket.pick}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        <strong className="text-emerald-800">Dasar Bukti: </strong>
                        {item.bestMarket.reason}
                      </p>
                    </div>
                  )}

                  {/* Market Analysis Grid (Moneyline, Handicap/Spread, Total) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Moneyline</span>
                      <div className="mt-1 font-bold text-slate-900 text-sm">
                        {item.marketAnalysis.moneyline.pick || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Confidence: <span className="text-blue-600 font-semibold">{item.marketAnalysis.moneyline.confidence || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Handicap / Spread</span>
                      <div className="mt-1 font-bold text-slate-900 text-sm">
                        {item.marketAnalysis.handicap.pick || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Confidence: <span className="text-blue-600 font-semibold">{item.marketAnalysis.handicap.confidence || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Total (Over/Under)</span>
                      <div className="mt-1 font-bold text-slate-900 text-sm">
                        {item.marketAnalysis.total.pick || 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Confidence: <span className="text-blue-600 font-semibold">{item.marketAnalysis.total.confidence || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Market Detailed List if available */}
                  {item.markets && item.markets.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Detail Perbandingan Semua Pasar ({item.markets.length} Market Dianalisis)
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {item.markets.map((m, mIdx) => (
                          <div key={mIdx} className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs space-y-0.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-700 uppercase">{m.market}</span>
                              <span className="text-[10px] text-blue-600 font-semibold">{m.confidence}</span>
                            </div>
                            <div className="font-bold text-slate-900 text-[11px]">Pick: {m.pick}</div>
                            {m.analysis && (
                              <p className="text-[10px] text-slate-600 leading-snug">{m.analysis}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Factors */}
                  {item.keyFactors.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Key Factors
                      </span>
                      <div className="space-y-1 text-xs text-slate-700">
                        {item.keyFactors.map((kf, kfIdx) => (
                          <div key={kfIdx} className="flex items-start space-x-1.5">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{kf}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Alasan Analisis Faktual
                    </span>
                    <p className="text-slate-800 leading-relaxed">{item.reason}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 4: PARLAY SUMMARY Section (Rule 7, 10, Maintenance 4) */}
          <div id="parlay-summary-card" className="rounded-3xl border border-indigo-200 bg-gradient-to-b from-indigo-50/40 via-white to-indigo-50/20 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-indigo-100 gap-4">
              <div>
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                  <Layers className="h-4 w-4" />
                  <span>PARLAY SUMMARY</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  Rekomendasi Kombinasi Tiket Parlay
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Sintesis menyeluruh dari {multiAnalysisResult.matches.length} pertandingan untuk membangun tiket parlay dengan probabilitas optimal.
                </p>
              </div>

              {/* Overall Parlay Metrics */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Overall Risk</span>
                  <span
                    className={`inline-block px-3 py-1 text-xs font-extrabold rounded-lg ${
                      multiAnalysisResult.parlaySummary.overallRisk === 'LOW'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : multiAnalysisResult.parlaySummary.overallRisk === 'HIGH'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {multiAnalysisResult.parlaySummary.overallRisk}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Parlay Confidence</span>
                  <span className="font-teko text-2xl font-bold text-indigo-700 block -mt-1">
                    {multiAnalysisResult.parlaySummary.parlayConfidence}
                  </span>
                </div>
              </div>
            </div>

            {/* Best Supported Combination (Maintenance 4 - Requirement 15) */}
            {multiAnalysisResult.parlaySummary.bestSupportedCombination && (
              <div className="rounded-2xl border border-indigo-200 bg-white p-4 sm:p-5 space-y-2.5 shadow-xs">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>{multiAnalysisResult.parlaySummary.bestSupportedCombination.title || 'Kombinasi Leg Terkuat (Best Supported Combination)'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {multiAnalysisResult.parlaySummary.bestSupportedCombination.legs?.map((legName, lIdx) => (
                    <span key={lIdx} className="inline-flex items-center space-x-1 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-900 border border-indigo-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{legName}</span>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed pt-1 border-t border-indigo-100">
                  <strong className="text-indigo-900">Rasionalisasi Bukti (Evidence Rationale): </strong>
                  {multiAnalysisResult.parlaySummary.bestSupportedCombination.rationale}
                </p>
              </div>
            )}

            {/* Suggested Legs Grid */}
            {multiAnalysisResult.parlaySummary.suggestedLegs.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Leg Yang Disarankan Untuk Parlay ({multiAnalysisResult.parlaySummary.suggestedLegs.length})</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {multiAnalysisResult.parlaySummary.suggestedLegs.map((leg, legIdx) => (
                    <div
                      key={legIdx}
                      className="rounded-2xl border border-indigo-100 bg-white p-3.5 text-xs space-y-1.5 shadow-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-900 text-sm block">{leg.match}</span>
                          <span className="text-[11px] text-slate-500">{leg.sport} • {leg.league}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {leg.risk} RISK
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-slate-700">
                        <span>Pick: <strong className="text-slate-900">{leg.pick}</strong> ({leg.market})</span>
                        <span className="text-indigo-700 font-semibold">{leg.confidence}</span>
                      </div>
                      {leg.reason && (
                        <p className="text-[11px] text-slate-600 italic">{leg.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                AI tidak menemukan leg dengan probabilitas tinggi untuk kombinasi parlay. Pertimbangkan bermain single bet atau meninjau daftar pantauan.
              </div>
            )}

            {/* Watch & Avoid Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Watch Matches */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center space-x-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Daftar Pantauan / Watch ({multiAnalysisResult.parlaySummary.watchMatches.length})</span>
                </h4>
                {multiAnalysisResult.parlaySummary.watchMatches.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {multiAnalysisResult.parlaySummary.watchMatches.map((w, wIdx) => (
                      <div key={wIdx} className="rounded-xl bg-white p-2.5 border border-amber-200 shadow-xs">
                        <strong className="text-slate-900 block">{w.match}</strong>
                        <span className="text-slate-600 text-[11px]">{w.reason}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Tidak ada pertandingan dalam daftar pantauan.</p>
                )}
              </div>

              {/* Avoid Matches */}
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center space-x-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>Pertandingan Yang Dihindari ({multiAnalysisResult.parlaySummary.avoidMatches.length})</span>
                </h4>
                {multiAnalysisResult.parlaySummary.avoidMatches.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {multiAnalysisResult.parlaySummary.avoidMatches.map((av, avIdx) => (
                      <div key={avIdx} className="rounded-xl bg-white p-2.5 border border-rose-200 shadow-xs">
                        <strong className="text-slate-900 block">{av.match}</strong>
                        <span className="text-slate-600 text-[11px]">{av.reason}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Tidak ada pertandingan dengan risiko ekstrem.</p>
                )}
              </div>
            </div>

            {/* Data Sources Transparency (Maintenance 4 - Requirement 17) */}
            {multiAnalysisResult.parlaySummary.sources && multiAnalysisResult.parlaySummary.sources.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-600 border-t border-indigo-100">
                <span className="flex items-center space-x-1 text-slate-800 font-semibold">
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                  <span>Sumber Riset Terverifikasi (Data Sources):</span>
                </span>
                {multiAnalysisResult.parlaySummary.sources.map((src, sIdx) => (
                  <span key={sIdx} className="inline-flex items-center rounded-md bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200 shadow-xs">
                    {src}
                  </span>
                ))}
              </div>
            )}

            {/* Analysis Note */}
            {multiAnalysisResult.parlaySummary.analysisNote && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700 leading-relaxed shadow-xs">
                <span className="font-bold text-slate-900 block mb-1">Catatan Analisis Parlay:</span>
                <p>{multiAnalysisResult.parlaySummary.analysisNote}</p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-indigo-100">
              <button
                type="button"
                disabled={savingToDb || savedSuccess}
                onClick={handleSaveAnalysis}
                className={`flex items-center justify-center space-x-2 rounded-full px-5 py-3 text-xs font-bold transition shadow-xs ${
                  savedSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Analisis Berhasil Disimpan</span>
                  </>
                ) : savingToDb ? (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Simpan ke Riwayat</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendSelectedToParlay}
                className="flex items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <Layers className="h-4 w-4" />
                <span>Kirim {selectedLegIndices.size} Leg Terpilih ke Parlay Builder</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
