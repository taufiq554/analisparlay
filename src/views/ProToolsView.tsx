import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  Calculator,
  PieChart,
  BarChart3,
  Share2,
  CloudSun,
  Activity,
  Award,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Info,
  DollarSign,
  Layers,
  Sparkles,
  ExternalLink,
  Search,
  X,
  Clock,
  Calendar,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserAnalyses } from '../services/firestoreService';
import { searchMarketForMatch } from '../services/aiService';
import {
  calculateOddsMovement,
  evaluateCorrelationRisk,
  calculatePositiveEV,
  calculateHedging,
  calculateKellyStake,
  runMonteCarloSimulation,
  analyzeWeatherImpact,
  getSavedInPlayTickets,
  saveInPlayTicket,
  deleteInPlayTicket,
  recalculateTicketPayout,
  getAccuracyTrackRecord,
  addAuditRecord,
} from '../services/proToolsService';
import {
  OddsMovementItem,
  CorrelationAnalysis,
  PositiveEVCalculation,
  HedgeCalculation,
  KellyBankrollCalculation,
  MonteCarloSimulationResult,
  WeatherImpactData,
  InPlayTicket,
  AccuracyTrackRecord,
  ParlayLeg,
  MatchItem,
  SavedAnalysis,
  InPlayLegStatus,
} from '../types';
import { SocialShareModal } from '../components/SocialShareModal';

interface ProToolsViewProps {
  onNavigate: (tab: string, state?: any) => void;
  onOpenAuth: () => void;
}

export const ProToolsView: React.FC<ProToolsViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<
    'movement' | 'correlation' | 'ev_hedge' | 'kelly' | 'monte_carlo' | 'share' | 'weather' | 'in_play' | 'accuracy'
  >('movement');

  // Real Saved Analyses from Firestore / Local for seamless integration
  const [userAnalyses, setUserAnalyses] = useState<SavedAnalysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');

  // Tool 1: Odds Movement State (NO DUMMY DATA)
  const [movementList, setMovementList] = useState<OddsMovementItem[]>(() => {
    try {
      const raw = localStorage.getItem('max_ai_monitored_matches');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filter out old dummy demo matches
          return parsed.filter((m: any) => !m.id?.startsWith('mov_1') && !m.id?.startsWith('mov_2'));
        }
      }
    } catch {}
    return [];
  });
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showLiveSearchModal, setShowLiveSearchModal] = useState(false);
  const [liveSearchLoading, setLiveSearchLoading] = useState(false);
  const [liveSearchHome, setLiveSearchHome] = useState('');
  const [liveSearchAway, setLiveSearchAway] = useState('');
  const [liveSearchLeague, setLiveSearchLeague] = useState('');

  // Manual Add Match Form State
  const [formHome, setFormHome] = useState('');
  const [formAway, setFormAway] = useState('');
  const [formLeague, setFormLeague] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formOpenHome, setFormOpenHome] = useState('');
  const [formOpenAway, setFormOpenAway] = useState('');
  const [formCurrHome, setFormCurrHome] = useState('');
  const [formCurrAway, setFormCurrAway] = useState('');
  const [formHandicap, setFormHandicap] = useState('-0.5');
  const [formTotal, setFormTotal] = useState('2.5');

  // Tool 2: Correlation State (Connected to user's real Parlay Builder)
  const [parlayLegs, setParlayLegs] = useState<ParlayLeg[]>(() => {
    try {
      const saved = localStorage.getItem('max_ai_parlay_legs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [correlationResult, setCorrelationResult] = useState<CorrelationAnalysis | null>(null);
  const [showAddLegModal, setShowAddLegModal] = useState(false);
  const [legMatchName, setLegMatchName] = useState('');
  const [legMarket, setLegMarket] = useState('Asian Handicap');
  const [legPick, setLegPick] = useState('');
  const [legOdds, setLegOdds] = useState('1.90');

  // Tool 3: +EV & Hedging State
  const [evOdds, setEvOdds] = useState<number>(2.00);
  const [evWinProb, setEvWinProb] = useState<number>(55);
  const [evResult, setEvResult] = useState<PositiveEVCalculation | null>(null);

  const [hedgeStake, setHedgeStake] = useState<number>(100000);
  const [hedgePayout, setHedgePayout] = useState<number>(850000);
  const [hedgeOdds, setHedgeOdds] = useState<number>(2.20);
  const [hedgeResult, setHedgeResult] = useState<HedgeCalculation | null>(null);

  // Tool 4: Kelly Bankroll State
  const [kellyBankroll, setKellyBankroll] = useState<number>(1000000);
  const [kellyOdds, setKellyOdds] = useState<number>(1.95);
  const [kellyProb, setKellyProb] = useState<number>(56);
  const [kellyResult, setKellyResult] = useState<KellyBankrollCalculation | null>(null);

  // Tool 5: Monte Carlo State
  const [mcMatchTitle, setMcMatchTitle] = useState<string>('Pertandingan Pilihan Anda');
  const [mcHomeTeam, setMcHomeTeam] = useState<string>('Tim Tuan Rumah');
  const [mcAwayTeam, setMcAwayTeam] = useState<string>('Tim Tamu');
  const [mcHomeXg, setMcHomeXg] = useState<number>(1.65);
  const [mcAwayXg, setMcAwayXg] = useState<number>(1.15);
  const [mcResult, setMcResult] = useState<MonteCarloSimulationResult | null>(null);
  const [mcRunning, setMcRunning] = useState<boolean>(false);

  // Tool 6: Social Share Modal
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Tool 7: Weather Impact State
  const [venueName, setVenueName] = useState('Stadion Utama');
  const [weatherData, setWeatherData] = useState<WeatherImpactData | null>(null);

  // Tool 8: In-Play Live Tracker State (NO DUMMY DEMO TICKETS)
  const [inPlayTickets, setInPlayTickets] = useState<InPlayTicket[]>([]);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketStake, setNewTicketStake] = useState('100000');
  const [ticketLegsInput, setTicketLegsInput] = useState<Array<{ match: string; market: string; pick: string; odds: string }>>([
    { match: '', market: 'Asian Handicap', pick: '', odds: '1.85' },
  ]);

  // Tool 9: Accuracy Audit State (NO DUMMY PAST RECORDS)
  const [trackRecord, setTrackRecord] = useState<AccuracyTrackRecord | null>(null);
  const [showRecordAuditModal, setShowRecordAuditModal] = useState(false);
  const [auditMatch, setAuditMatch] = useState('');
  const [auditMarket, setAuditMarket] = useState('Asian Handicap');
  const [auditPick, setAuditPick] = useState('');
  const [auditOdds, setAuditOdds] = useState('1.90');
  const [auditResult, setAuditResult] = useState<'WIN' | 'LOSS' | 'PUSH'>('WIN');
  const [auditConfidence, setAuditConfidence] = useState('75%');

  // Load real user analyses from Firestore
  useEffect(() => {
    if (currentUser?.uid) {
      getUserAnalyses(currentUser.uid)
        .then((data) => {
          setUserAnalyses(data);
        })
        .catch((err) => console.error('Error fetching user analyses for ProTools:', err));
    }
  }, [currentUser]);

  // Sync monitored matches to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('max_ai_monitored_matches', JSON.stringify(movementList));
    } catch {}
  }, [movementList]);

  // Initial calculation runs on mount
  useEffect(() => {
    // 2. Correlation evaluation
    if (parlayLegs.length > 0) {
      setCorrelationResult(evaluateCorrelationRisk(parlayLegs));
    } else {
      setCorrelationResult(null);
    }

    // 3. EV & Hedge
    setEvResult(calculatePositiveEV(evOdds, evWinProb));
    setHedgeResult(calculateHedging(hedgeStake, hedgePayout, hedgeOdds));

    // 4. Kelly
    setKellyResult(calculateKellyStake(kellyBankroll, kellyOdds, kellyProb));

    // 5. Monte Carlo
    setMcResult(runMonteCarloSimulation(mcHomeXg, mcAwayXg, 10000));

    // 7. Weather
    setWeatherData(analyzeWeatherImpact(venueName, 'Sepak Bola'));

    // 8. In-play tickets
    setInPlayTickets(getSavedInPlayTickets());

    // 9. Track record
    setTrackRecord(getAccuracyTrackRecord());
  }, []);

  // Sync legs when parlayLegs changes
  useEffect(() => {
    if (parlayLegs.length > 0) {
      setCorrelationResult(evaluateCorrelationRisk(parlayLegs));
    } else {
      setCorrelationResult(null);
    }
    try {
      localStorage.setItem('max_ai_parlay_legs', JSON.stringify(parlayLegs));
    } catch {}
  }, [parlayLegs]);

  // Handler: Import match from real saved analysis into tools
  const handleSelectRealAnalysis = (analysis: SavedAnalysis) => {
    if (analysis.id) setSelectedAnalysisId(analysis.id);

    // Extract match info
    const matchName =
      analysis.analysis?.match ||
      (analysis.matches?.[0] ? `${analysis.matches[0].homeTeam} vs ${analysis.matches[0].awayTeam}` : 'Pertandingan Terpilih');
    const teams = matchName.split(' vs ');
    const home = teams[0] || 'Tim Tuan Rumah';
    const away = teams[1] || 'Tim Tamu';

    // Populate Monte Carlo
    setMcMatchTitle(matchName);
    setMcHomeTeam(home);
    setMcAwayTeam(away);
    setMcHomeXg(1.70);
    setMcAwayXg(1.10);
    setMcResult(runMonteCarloSimulation(1.70, 1.10, 10000));

    // Populate Weather Venue
    const stadium = `${home} Arena / Stadium`;
    setVenueName(stadium);
    setWeatherData(analyzeWeatherImpact(stadium, analysis.sport || 'Sepak Bola'));

    // Populate EV & Kelly if confidence available
    const confNum = parseInt(analysis.confidence?.replace('%', '') || '70', 10);
    const oddsNum = parseFloat(analysis.matches?.[0]?.odds?.home || '1.92') || 1.92;
    setEvOdds(oddsNum);
    setEvWinProb(confNum);
    setEvResult(calculatePositiveEV(oddsNum, confNum));
    setKellyOdds(oddsNum);
    setKellyProb(confNum);
    setKellyResult(calculateKellyStake(kellyBankroll, oddsNum, confNum));

    // Auto-add to Odds Movement if not present
    const existing = movementList.find((m) => m.match.toLowerCase() === matchName.toLowerCase());
    if (!existing && analysis.matches?.[0]) {
      const mItem = analysis.matches[0];
      const newMovement = calculateOddsMovement(
        {
          id: `match_${Date.now()}`,
          homeTeam: mItem.homeTeam || home,
          awayTeam: mItem.awayTeam || away,
          time: mItem.time || 'Hari Ini',
          odds: mItem.odds || { home: '1.90', away: '1.95', handicap: '-0.5', over: '2.5' },
        },
        analysis.league || 'Kompetisi'
      );
      setMovementList((prev) => [newMovement, ...prev]);
    }
  };

  // Handler: Add Manual Real Match to Odds Movement
  const handleSaveManualMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHome.trim() || !formAway.trim()) return;

    const hOdds = parseFloat(formCurrHome) || 1.90;
    const aOdds = parseFloat(formCurrAway) || 1.95;
    const oHOdds = formOpenHome ? parseFloat(formOpenHome) : undefined;
    const oAOdds = formOpenAway ? parseFloat(formOpenAway) : undefined;

    const matchObj: MatchItem = {
      id: `real_${Date.now()}`,
      homeTeam: formHome.trim(),
      awayTeam: formAway.trim(),
      time: formTime.trim() || 'Hari Ini',
      odds: {
        home: hOdds.toFixed(2),
        away: aOdds.toFixed(2),
        handicap: formHandicap.trim() || '-0.5',
        over: formTotal.trim() || '2.5',
      },
    };

    const movement = calculateOddsMovement(
      matchObj,
      formLeague.trim() || 'Kompetisi',
      oHOdds && oAOdds ? { home: oHOdds, away: oAOdds, spread: formHandicap, total: formTotal } : undefined
    );

    setMovementList((prev) => [movement, ...prev]);
    setShowAddMatchModal(false);

    // Reset Form
    setFormHome('');
    setFormAway('');
    setFormLeague('');
    setFormTime('');
    setFormOpenHome('');
    setFormOpenAway('');
    setFormCurrHome('');
    setFormCurrAway('');
  };

  // Handler: Live Search Market Odds
  const handleExecuteLiveSearch = async () => {
    if (!liveSearchHome.trim() || !liveSearchAway.trim()) return;
    setLiveSearchLoading(true);
    try {
      const res = await searchMarketForMatch(liveSearchHome, liveSearchAway, 'Football / Soccer', liveSearchLeague);
      const hOdds = parseFloat(res.odds?.home || '1.92') || 1.92;
      const aOdds = parseFloat(res.odds?.away || '1.90') || 1.90;

      const matchObj: MatchItem = {
        id: `live_${Date.now()}`,
        homeTeam: liveSearchHome.trim(),
        awayTeam: liveSearchAway.trim(),
        time: 'Terkini',
        odds: {
          home: hOdds.toFixed(2),
          away: aOdds.toFixed(2),
          handicap: res.odds?.handicap || '-0.5',
          over: res.odds?.over || '2.5',
        },
      };

      const movement = calculateOddsMovement(matchObj, liveSearchLeague.trim() || 'Kompetisi');
      setMovementList((prev) => [movement, ...prev]);
      setShowLiveSearchModal(false);
      setLiveSearchHome('');
      setLiveSearchAway('');
      setLiveSearchLeague('');
    } catch (err) {
      console.error('Error fetching live market odds:', err);
    } finally {
      setLiveSearchLoading(false);
    }
  };

  // Handler: Add Custom Leg to Correlation
  const handleSaveLeg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legMatchName.trim() || !legPick.trim()) return;
    const newL: ParlayLeg = {
      id: `leg_${Date.now()}`,
      match: legMatchName.trim(),
      sport: 'Sepak Bola',
      league: 'Kompetisi',
      market: legMarket,
      pick: legPick.trim(),
      odds: legOdds || '1.90',
      confidence: '75%',
      risk: 'LOW',
      recommendation: 'BET',
    };
    setParlayLegs((prev) => [...prev, newL]);
    setShowAddLegModal(false);
    setLegMatchName('');
    setLegPick('');
  };

  // Handler: Import Legs from Parlay Builder into In-Play Ticket
  const handleImportParlayToInPlay = () => {
    if (parlayLegs.length === 0) {
      alert('Tiket Parlay kosong. Tambahkan leg di Parlay Builder atau menu Korelasi terlebih dahulu.');
      return;
    }

    const calculatedTotalOdds = parlayLegs.reduce((acc, l) => acc * (parseFloat(l.odds || '1.0') || 1.0), 1.0);
    const roundedOdds = Number(calculatedTotalOdds.toFixed(2));
    const stake = 100000;

    const inPlayLegs: InPlayLegStatus[] = parlayLegs.map((l, idx) => ({
      id: `inplay_leg_${Date.now()}_${idx}`,
      match: l.match,
      market: l.market,
      pick: l.pick,
      odds: parseFloat(l.odds || '1.90') || 1.90,
      status: 'PENDING',
      currentScore: '0 - 0',
      liveMinute: 'Belum Mulai',
    }));

    const ticket: InPlayTicket = {
      id: `ticket_${Date.now()}`,
      title: `Tiket Parlay Riil (${parlayLegs.length} Leg)`,
      stake: stake,
      originalOdds: roundedOdds,
      currentOdds: roundedOdds,
      status: 'ACTIVE',
      potentialPayout: Math.round(stake * roundedOdds),
      createdAt: new Date().toLocaleDateString('id-ID'),
      updatedAt: 'Live',
      legs: inPlayLegs,
    };

    const updated = saveInPlayTicket(ticket);
    setInPlayTickets(updated);
    setActiveSubTab('in_play');
  };

  // Handler: Create Custom In-Play Ticket
  const handleCreateCustomTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const validLegs = ticketLegsInput.filter((l) => l.match.trim() && l.pick.trim());
    if (validLegs.length === 0) return;

    const stakeNum = parseInt(newTicketStake.replace(/\D/g, ''), 10) || 100000;
    const calculatedTotalOdds = validLegs.reduce((acc, l) => acc * (parseFloat(l.odds || '1.0') || 1.0), 1.0);
    const roundedOdds = Number(calculatedTotalOdds.toFixed(2));

    const inPlayLegs: InPlayLegStatus[] = validLegs.map((l, idx) => ({
      id: `inplay_leg_${Date.now()}_${idx}`,
      match: l.match.trim(),
      market: l.market,
      pick: l.pick.trim(),
      odds: parseFloat(l.odds || '1.85') || 1.85,
      status: 'PENDING',
      currentScore: '0 - 0',
      liveMinute: 'Belum Mulai',
    }));

    const ticket: InPlayTicket = {
      id: `ticket_${Date.now()}`,
      title: newTicketTitle.trim() || `Tiket Taruhan Riil (${validLegs.length} Leg)`,
      stake: stakeNum,
      originalOdds: roundedOdds,
      currentOdds: roundedOdds,
      status: 'ACTIVE',
      potentialPayout: Math.round(stakeNum * roundedOdds),
      createdAt: new Date().toLocaleDateString('id-ID'),
      updatedAt: 'Live',
      legs: inPlayLegs,
    };

    const updated = saveInPlayTicket(ticket);
    setInPlayTickets(updated);
    setShowCreateTicketModal(false);
    setNewTicketTitle('');
    setTicketLegsInput([{ match: '', market: 'Asian Handicap', pick: '', odds: '1.85' }]);
  };

  // Handler: Save Actual Audit Record
  const handleSaveAuditRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditMatch.trim() || !auditPick.trim()) return;

    const oddsNum = parseFloat(auditOdds) || 1.90;
    const unitGain =
      auditResult === 'WIN'
        ? Number((oddsNum - 1).toFixed(2))
        : auditResult === 'LOSS'
        ? -1.0
        : 0.0;

    const updated = addAuditRecord({
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      match: auditMatch.trim(),
      market: auditMarket,
      pick: auditPick.trim(),
      odds: oddsNum,
      result: auditResult,
      unitGain,
      confidence: auditConfidence,
    });

    setTrackRecord(updated);
    setShowRecordAuditModal(false);
    setAuditMatch('');
    setAuditPick('');
  };

  // Handlers for calculations
  const handleRecalculateEV = (o: number, p: number) => {
    setEvOdds(o);
    setEvWinProb(p);
    setEvResult(calculatePositiveEV(o, p));
  };

  const handleRecalculateHedge = (s: number, p: number, o: number) => {
    setHedgeStake(s);
    setHedgePayout(p);
    setHedgeOdds(o);
    setHedgeResult(calculateHedging(s, p, o));
  };

  const handleRecalculateKelly = (b: number, o: number, p: number) => {
    setKellyBankroll(b);
    setKellyOdds(o);
    setKellyProb(p);
    setKellyResult(calculateKellyStake(b, o, p));
  };

  const handleRunMonteCarlo = () => {
    setMcRunning(true);
    setTimeout(() => {
      setMcResult(runMonteCarloSimulation(mcHomeXg, mcAwayXg, 10000));
      setMcRunning(false);
    }, 300);
  };

  const handleCheckWeather = (venue: string) => {
    setVenueName(venue);
    setWeatherData(analyzeWeatherImpact(venue, 'Sepak Bola'));
  };

  const handleUpdateLegStatus = (
    ticketId: string,
    legId: string,
    newStatus: 'PENDING' | 'WIN' | 'HALF_WIN' | 'PUSH' | 'LOSS'
  ) => {
    const updated = inPlayTickets.map((t) => {
      if (t.id !== ticketId) return t;
      const newLegs = t.legs.map((l) => (l.id === legId ? { ...l, status: newStatus } : l));
      return recalculateTicketPayout({ ...t, legs: newLegs });
    });
    setInPlayTickets(updated);
    try {
      localStorage.setItem('max_ai_in_play_tickets', JSON.stringify(updated));
    } catch {}
  };

  const toolTabs = [
    { id: 'movement', label: 'Pergerakan Bursa & Steam', icon: TrendingUp },
    { id: 'correlation', label: 'Detektor Risiko Korelasi', icon: ShieldAlert },
    { id: 'ev_hedge', label: 'Kalkulator +EV & Hedging', icon: Calculator },
    { id: 'kelly', label: 'Modal & Kelly Criterion', icon: DollarSign },
    { id: 'monte_carlo', label: 'Simulasi Monte Carlo (10rb)', icon: BarChart3 },
    { id: 'share', label: 'Generator Slip Iklan', icon: Share2 },
    { id: 'weather', label: 'Pengaruh Cuaca & Lapangan', icon: CloudSun },
    { id: 'in_play', label: 'Live Ticket Tracker', icon: Activity },
    { id: 'accuracy', label: 'Audit Transparansi & ROI', icon: Award },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 rounded-full border border-blue-400/40 bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-200 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-blue-300" />
            <span>9 ASISTEN ANALITIK PROFESIONAL (DATA RIIL)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Pusat Alat Pro & Asisten Parlay
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            Perangkat analitik kuantitatif, kalkulasi probabilitas aktual, proteksi risiko modal, dan generator slip media sosial berbasis data pertandingan riil Anda.
          </p>

          {/* Quick Real Data Context Selector */}
          {userAnalyses.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-blue-200 font-semibold flex items-center space-x-1">
                <Layers className="h-3.5 w-3.5" />
                <span>Pilih Data Riil dari Analisis Anda:</span>
              </span>
              <select
                value={selectedAnalysisId}
                onChange={(e) => {
                  const found = userAnalyses.find((a) => a.id === e.target.value);
                  if (found) handleSelectRealAnalysis(found);
                }}
                className="rounded-xl border border-blue-400/40 bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-blue-400"
              >
                <option value="">-- Pilih Pertandingan yang Dianalisis --</option>
                {userAnalyses.map((a) => {
                  const label =
                    a.analysis?.match ||
                    (a.matches?.[0] ? `${a.matches[0].homeTeam} vs ${a.matches[0].awayTeam}` : `Analisis #${(a.id || '').slice(0, 6)}`);
                  return (
                    <option key={a.id || Math.random().toString()} value={a.id || ''}>
                      {a.league ? `[${a.league}] ` : ''}{label} ({a.confidence || '70%'})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Sub-Navigation Tab Bar */}
      <div className="flex overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 gap-2 border-b border-slate-200">
        {toolTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-tool-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* 1. PELACAK PERGERAKAN BURSA & SMART MONEY (ODDS MOVEMENT) */}
      {/* ================================================================= */}
      {activeSubTab === 'movement' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span>Pelacak Pergerakan Bursa & Steam Move (Smart Money)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Memantau pergeseran odds aktual dari garis buka (*opening line*) hingga garis pasar terkini untuk mendeteksi arus taruhan sindikat (*sharp action*).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAddMatchModal(true)}
                className="flex items-center space-x-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Input Pertandingan Aktual</span>
              </button>
              <button
                onClick={() => setShowLiveSearchModal(true)}
                className="flex items-center space-x-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 text-xs font-bold text-blue-700 transition"
              >
                <Search className="h-3.5 w-3.5 text-blue-600" />
                <span>Cari Pasaran Real-time</span>
              </button>
            </div>
          </div>

          {movementList.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs max-w-xl mx-auto space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <TrendingUp className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Belum Ada Pertandingan Riil yang Dipantau</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                  Tidak ada data dummy. Silakan input pertandingan riil dari bursa Anda, atau tarik dari riwayat analisis AI untuk melacak pergerakan garis bursa & volume smart money secara faktual.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowAddMatchModal(true)}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-bold text-white shadow-sm transition"
                >
                  + Input Pertandingan Aktual
                </button>
                <button
                  onClick={() => onNavigate('analyze')}
                  className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2 text-xs font-bold text-slate-700 transition"
                >
                  Analisis Jadwal Baru
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {movementList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition space-y-4 relative"
                >
                  <button
                    onClick={() => setMovementList((prev) => prev.filter((m) => m.id !== item.id))}
                    className="absolute top-5 right-5 text-slate-400 hover:text-rose-600 transition"
                    title="Hapus dari Pelacak"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="flex items-center justify-between pr-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {item.league} • {item.time}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        item.sharpAction === 'HOME' || item.sharpAction === 'AWAY'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.lineVelocity === 'RAPID' ? '⚡ Pergerakan Cepat' : 'Garis Stabil'}
                    </span>
                  </div>

                  <div className="text-base font-extrabold text-slate-900">{item.match}</div>

                  {/* Odds comparison table */}
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center border border-slate-100">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Garis Buka</span>
                      <div className="text-sm font-bold text-slate-700 mt-0.5">
                        {item.openOdds.home} / {item.openOdds.away}
                      </div>
                      <span className="text-[10px] text-slate-400">Voor: {item.openOdds.spread}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Garis Terkini</span>
                      <div className="text-sm font-extrabold text-blue-600 mt-0.5">
                        {item.currentOdds.home} / {item.currentOdds.away}
                      </div>
                      <span className="text-[10px] text-blue-500 font-semibold">Voor: {item.currentOdds.spread}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Pergeseran</span>
                      <div
                        className={`text-sm font-bold mt-0.5 ${
                          item.currentOdds.home < item.openOdds.home ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {(item.currentOdds.home - item.openOdds.home).toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-500">{item.publicBias}</span>
                    </div>
                  </div>

                  {/* Smart money alert */}
                  {item.steamAlert && (
                    <div className="flex items-start space-x-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 p-3 text-amber-900 text-xs leading-relaxed">
                      <Flame className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{item.steamAlert}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Estimasi Volume Smart Money:</span>
                    <span className="font-bold text-slate-800">{item.smartMoneyVolumePercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Input Pertandingan Aktual */}
      {showAddMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Input Data Pertandingan Aktual</h3>
              <button onClick={() => setShowAddMatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualMatch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Tim Tuan Rumah (Home)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Man City"
                    value={formHome}
                    onChange={(e) => setFormHome(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Tim Tamu (Away)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Arsenal"
                    value={formAway}
                    onChange={(e) => setFormAway(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Liga / Kompetisi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Premier League"
                    value={formLeague}
                    onChange={(e) => setFormLeague(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Waktu / Jam</label>
                  <input
                    type="text"
                    placeholder="Contoh: 22:30 WIB"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="font-bold text-slate-700">Garis Buka Home (Opening Odds)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Contoh: 1.88"
                    value={formOpenHome}
                    onChange={(e) => setFormOpenHome(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Garis Buka Away</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Contoh: 2.05"
                    value={formOpenAway}
                    onChange={(e) => setFormOpenAway(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Garis Terkini Home (Current Odds)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Contoh: 1.76"
                    value={formCurrHome}
                    onChange={(e) => setFormCurrHome(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Garis Terkini Away</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Contoh: 2.18"
                    value={formCurrAway}
                    onChange={(e) => setFormCurrAway(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Pasaran Voor / Handicap</label>
                  <input
                    type="text"
                    placeholder="Contoh: -0.75"
                    value={formHandicap}
                    onChange={(e) => setFormHandicap(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Total Over/Under</label>
                  <input
                    type="text"
                    placeholder="Contoh: 2.75"
                    value={formTotal}
                    onChange={(e) => setFormTotal(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddMatchModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  Simpan & Lacak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cari Pasaran Real-time */}
      {showLiveSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Search className="h-4 w-4 text-blue-600" />
                <span>Cari Pasaran Real-time</span>
              </h3>
              <button onClick={() => setShowLiveSearchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Tim Tuan Rumah</label>
                <input
                  type="text"
                  placeholder="Contoh: Real Madrid"
                  value={liveSearchHome}
                  onChange={(e) => setLiveSearchHome(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Tim Tamu</label>
                <input
                  type="text"
                  placeholder="Contoh: Barcelona"
                  value={liveSearchAway}
                  onChange={(e) => setLiveSearchAway(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700">Liga (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: La Liga"
                  value={liveSearchLeague}
                  onChange={(e) => setLiveSearchLeague(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLiveSearchModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={liveSearchLoading}
                  onClick={handleExecuteLiveSearch}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {liveSearchLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{liveSearchLoading ? 'Mencari...' : 'Tarik Odds Terkini'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. DETEKTOR RISIKO KORELASI PARLAY (CORRELATION RISK CHECKER) */}
      {/* ================================================================= */}
      {activeSubTab === 'correlation' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <ShieldAlert className="h-5 w-5 text-indigo-600" />
                  <span>Detektor Risiko Korelasi & Sinergi Tiket Parlay</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Memvalidasi apakah leg parlay riil Anda saling mendukung atau saling membatalkan (*negative covariance drag*).
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddLegModal(true)}
                  className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs"
                >
                  + Tambah Leg
                </button>
                <button
                  onClick={() => onNavigate('parlay')}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Buka Parlay Builder
                </button>
              </div>
            </div>

            {parlayLegs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
                <ShieldAlert className="h-8 w-8 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-800">Tiket Parlay Anda Belum Berisi Leg</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Tambahkan leg dari Parlay Builder atau masukkan pertandingan aktual untuk mengukur sinergi matematika dan friksi probabilitas.
                </p>
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <button
                    onClick={() => setShowAddLegModal(true)}
                    className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs"
                  >
                    + Input Leg Aktual
                  </button>
                  <button
                    onClick={() => onNavigate('parlay')}
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700"
                  >
                    Buka Parlay Builder
                  </button>
                </div>
              </div>
            ) : (
              <>
                {correlationResult && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Score Card */}
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase text-indigo-700">Skor Sinergi Matematika</span>
                      <div className="text-4xl font-extrabold text-indigo-900 my-2">
                        {correlationResult.synergyScore} / 100
                      </div>
                      <div className="text-xs text-indigo-800">
                        Tingkat Konflik:{' '}
                        <span className="font-bold uppercase tracking-wider">{correlationResult.conflictLevel}</span>
                      </div>
                    </div>

                    {/* Mathematical Drag */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Penurunan Probabilitas Gabungan</span>
                      <div className="text-4xl font-extrabold text-slate-800 my-2">
                        -{correlationResult.mathematicalDrag}%
                      </div>
                      <div className="text-xs text-slate-500">Efek friksi kovarian antar leg tiket</div>
                    </div>

                    {/* Recommendation */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase text-slate-400">Rekomendasi Ahli AI</span>
                      <p className="text-xs font-medium text-slate-700 leading-relaxed my-2">
                        {correlationResult.recommendation}
                      </p>
                      <button
                        onClick={handleImportParlayToInPlay}
                        className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        <span>Lacak di In-Play Tracker</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Leg list */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Leg Aktif di Analisis Korelasi ({parlayLegs.length} Leg):
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parlayLegs.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{l.match}</div>
                          <div className="text-slate-500">
                            {l.market} • <span className="font-semibold text-blue-600">{l.pick}</span> @ {l.odds}
                          </div>
                        </div>
                        <button
                          onClick={() => setParlayLegs((prev) => prev.filter((item) => item.id !== l.id))}
                          className="text-slate-400 hover:text-rose-600"
                          title="Hapus Leg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: Tambah Leg Korelasi */}
      {showAddLegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Tambah Leg Pertandingan Aktual</h3>
              <button onClick={() => setShowAddLegModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeg} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Pertandingan (Tuan Rumah vs Tamu)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Real Madrid vs Sevilla"
                  value={legMatchName}
                  onChange={(e) => setLegMatchName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Pasar Taruhan (Market)</label>
                <select
                  value={legMarket}
                  onChange={(e) => setLegMarket(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                >
                  <option value="Asian Handicap">Asian Handicap / Voor</option>
                  <option value="Total Over/Under">Total Over/Under Gol</option>
                  <option value="Moneyline">1X2 / Moneyline</option>
                  <option value="BTTS">Both Teams to Score (BTTS)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Pilihan (Pick)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Real Madrid -1.0"
                    value={legPick}
                    onChange={(e) => setLegPick(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Odds Desimal</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Contoh: 1.85"
                    value={legOdds}
                    onChange={(e) => setLegOdds(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddLegModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  Tambahkan Leg
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. KALKULATOR +EV & HEDGING / CASHOUT */}
      {/* ================================================================= */}
      {activeSubTab === 'ev_hedge' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Positive EV Calculator */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-emerald-600" />
                <span>Kalkulator Nilai Positif (+EV)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Mengukur keunggulan matematis (*edge*) taruhan jika probabilitas statistik AI lebih tinggi dari implikasi odds bursa.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-600">Odds Bandar Desimal</label>
                <input
                  type="number"
                  step="0.05"
                  value={evOdds}
                  onChange={(e) => handleRecalculateEV(parseFloat(e.target.value) || 1.5, evWinProb)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Probabilitas Menang AI (%)</label>
                <input
                  type="number"
                  value={evWinProb}
                  onChange={(e) => handleRecalculateEV(evOdds, parseFloat(e.target.value) || 50)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {evResult && (
              <div
                className={`rounded-2xl border p-4 space-y-2 ${
                  evResult.edgePercentage > 0
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                    : 'border-rose-200 bg-rose-50/70 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase">Expected Edge (+EV %):</span>
                  <span className="text-xl font-extrabold">{evResult.edgePercentage}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Proyeksi Margin per Rp 100.000:</span>
                  <span className="font-bold">
                    {evResult.edgePercentage > 0 ? '+' : ''}Rp {evResult.expectedProfitPerUnit.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-xs pt-1 border-t border-slate-200/50 leading-relaxed font-medium">
                  Rating Edge: <b className="uppercase">{evResult.rating}</b> • Peluang Riil AI: {evResult.fairProbability}% vs Implikasi Pasar: {evResult.impliedProbability}%
                </div>
              </div>
            )}
          </div>

          {/* Hedging & Cashout Calculator */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-blue-600" />
                <span>Kalkulator Hedging / Cashout Garansi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Kunci keuntungan 100% pada leg penentuan terakhir dengan memasang taruhan lawan yang terhitung presisi.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600">Modal Awal (Rp)</label>
                <input
                  type="number"
                  step="10000"
                  value={hedgeStake}
                  onChange={(e) => handleRecalculateHedge(parseFloat(e.target.value) || 0, hedgePayout, hedgeOdds)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Potensi Payout (Rp)</label>
                <input
                  type="number"
                  step="10000"
                  value={hedgePayout}
                  onChange={(e) => handleRecalculateHedge(hedgeStake, parseFloat(e.target.value) || 0, hedgeOdds)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600">Odds Lawan</label>
                <input
                  type="number"
                  step="0.05"
                  value={hedgeOdds}
                  onChange={(e) => handleRecalculateHedge(hedgeStake, hedgePayout, parseFloat(e.target.value) || 1.5)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-900"
                />
              </div>
            </div>

            {hedgeResult && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Guaranteed Profit Option */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-emerald-800">Opsi Kunci Profit 100%</span>
                  <div className="text-xs text-emerald-950 font-medium">
                    Pasang Lawan: <b>Rp {hedgeResult.optimalHedgeStake.toLocaleString('id-ID')}</b>
                  </div>
                  <div className="text-sm font-extrabold text-emerald-900 pt-1">
                    Laba Bersih Garansi: +Rp {hedgeResult.guaranteedProfit.toLocaleString('id-ID')}
                  </div>
                </div>

                {/* Break-even Option */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-600">Opsi Balik Modal (Aman)</span>
                  <div className="text-xs text-slate-800 font-medium">
                    Pasang Lawan: <b>Rp {hedgeResult.breakEvenHedgeStake.toLocaleString('id-ID')}</b>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 pt-1">
                    Jika Tiket Tembus: +Rp {hedgeResult.breakEvenProfit.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. MANAJEMEN MODAL & KELLY CRITERION */}
      {/* ================================================================= */}
      {activeSubTab === 'kelly' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span>Manajemen Modal & Formula Kelly Criterion</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Menghitung proporsi taruhan optimal berdasarkan total bankroll Anda guna memaksimalkan laju pertumbuhan modal jangka panjang.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600">Total Modal / Bankroll (Rp)</label>
              <input
                type="number"
                step="100000"
                value={kellyBankroll}
                onChange={(e) =>
                  handleRecalculateKelly(parseFloat(e.target.value) || 100000, kellyOdds, kellyProb)
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Odds Tiket / Parlay</label>
              <input
                type="number"
                step="0.05"
                value={kellyOdds}
                onChange={(e) =>
                  handleRecalculateKelly(kellyBankroll, parseFloat(e.target.value) || 1.5, kellyProb)
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Probabilitas Menang Menurut AI (%)</label>
              <input
                type="number"
                value={kellyProb}
                onChange={(e) =>
                  handleRecalculateKelly(kellyBankroll, kellyOdds, parseFloat(e.target.value) || 50)
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {kellyResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Half Kelly */}
              <div className="rounded-2xl border-2 border-blue-500 bg-blue-50/70 p-5 space-y-2 relative">
                <span className="rounded-full bg-blue-600 text-white px-2 py-0.5 text-[9px] font-bold absolute top-4 right-4">
                  DIREKOMENDASIKAN
                </span>
                <span className="text-xs font-bold text-blue-900 uppercase">Half Kelly (Aman & Stabil)</span>
                <div className="text-2xl font-extrabold text-blue-950">
                  Rp {kellyResult.halfKellyStake.toLocaleString('id-ID')}
                </div>
                <div className="text-xs text-blue-700">
                  Rekomendasi Unit: <b>{kellyResult.recommendedUnits} Unit</b> (
                  {(kellyResult.fullKellyFraction * 0.5).toFixed(1)}% Bankroll)
                </div>
              </div>

              {/* Quarter Kelly */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase">Quarter Kelly (Konservatif)</span>
                <div className="text-2xl font-extrabold text-slate-900">
                  Rp {kellyResult.quarterKellyStake.toLocaleString('id-ID')}
                </div>
                <div className="text-xs text-slate-500">
                  Volatilitas sangat rendah untuk menjaga kestabilan modal parlay panjang.
                </div>
              </div>

              {/* Full Kelly */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase">Full Kelly (Agresif)</span>
                <div className="text-2xl font-extrabold text-slate-900">
                  Rp {kellyResult.fullKellyStake.toLocaleString('id-ID')}
                </div>
                <div className="text-xs text-slate-500">
                  Pertumbuhan tercepat namun memiliki risiko varian jangka pendek yang tinggi.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. SIMULATOR SKOR MONTE CARLO (10.000x MATCH SIMULATION) */}
      {/* ================================================================= */}
      {activeSubTab === 'monte_carlo' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-sky-600" />
                <span>Simulator Skor Monte Carlo (10.000 Putaran Berbasis xG)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Menjalankan 10.000 simulasi pertandingan berbasis distribusi Bivariate Poisson dari data Expected Goals (xG) riil.
              </p>
            </div>

            <button
              onClick={handleRunMonteCarlo}
              disabled={mcRunning}
              className="flex items-center space-x-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${mcRunning ? 'animate-spin' : ''}`} />
              <span>{mcRunning ? 'Menyimulasikan...' : 'Jalankan 10.000x Simulasi'}</span>
            </button>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-slate-700">
              Pertandingan yang Disimulasikan: <span className="text-blue-600">{mcMatchTitle}</span>
            </div>
            {userAnalyses.length > 0 && (
              <select
                onChange={(e) => {
                  const a = userAnalyses.find((item) => item.id === e.target.value);
                  if (a) handleSelectRealAnalysis(a);
                }}
                className="text-xs border border-slate-300 rounded-lg p-1 bg-white font-medium text-slate-700"
              >
                <option value="">Ganti Pertandingan dari Analisis...</option>
                {userAnalyses.map((a) => (
                  <option key={a.id || Math.random().toString()} value={a.id || ''}>
                    {a.analysis?.match || `Laga #${(a.id || '').slice(0, 6)}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="text-xs font-bold text-slate-600">Expected Goals (xG) {mcHomeTeam}</label>
              <input
                type="number"
                step="0.05"
                value={mcHomeXg}
                onChange={(e) => setMcHomeXg(parseFloat(e.target.value) || 1.0)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Expected Goals (xG) {mcAwayTeam}</label>
              <input
                type="number"
                step="0.05"
                value={mcAwayXg}
                onChange={(e) => setMcAwayXg(parseFloat(e.target.value) || 1.0)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900"
              />
            </div>
          </div>

          {mcResult && (
            <div className="space-y-6 pt-2">
              {/* Outcome Probabilities Bar */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-blue-50 border border-blue-200/70 p-4">
                  <span className="text-xs font-bold text-blue-700 uppercase">Menang {mcHomeTeam}</span>
                  <div className="text-2xl font-extrabold text-blue-900 mt-1">{mcResult.homeWinProb}%</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <span className="text-xs font-bold text-slate-600 uppercase">Draw (Imbang)</span>
                  <div className="text-2xl font-extrabold text-slate-800 mt-1">{mcResult.drawProb}%</div>
                </div>
                <div className="rounded-2xl bg-indigo-50 border border-indigo-200/70 p-4">
                  <span className="text-xs font-bold text-indigo-700 uppercase">Menang {mcAwayTeam}</span>
                  <div className="text-2xl font-extrabold text-indigo-900 mt-1">{mcResult.awayWinProb}%</div>
                </div>
              </div>

              {/* Goal Totals Probabilities */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-[11px] font-semibold text-slate-500">Over 1.5 Gol</span>
                  <div className="text-lg font-bold text-slate-800">{mcResult.over15Prob}%</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-[11px] font-semibold text-slate-500">Over 2.5 Gol</span>
                  <div className="text-lg font-bold text-blue-600">{mcResult.over25Prob}%</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-[11px] font-semibold text-slate-500">Over 3.5 Gol</span>
                  <div className="text-lg font-bold text-slate-800">{mcResult.over35Prob}%</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-[11px] font-semibold text-slate-500">BTTS (Kedua Tim Cetak Gol)</span>
                  <div className="text-lg font-bold text-emerald-600">{mcResult.bttsProb}%</div>
                </div>
              </div>

              {/* Top Scorelines Probabilities */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Top 8 Skor Paling Berpeluang Terjadi (10.000 Putaran):
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {mcResult.topScorelines.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2 text-xs"
                    >
                      <span className="font-extrabold text-slate-900 text-sm">{item.score}</span>
                      <span className="font-bold text-blue-600">{item.probability}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 6. GENERATOR DESAIN SLIP PROMOSI IKLAN (SHARE CARD) */}
      {/* ================================================================= */}
      {activeSubTab === 'share' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Share2 className="h-5 w-5 text-blue-600" />
                <span>Generator Slip Iklan & Materi Promosi Medsos (9:16 & 1:1)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Hasilkan banner infografis estetis beresolusi tinggi (HD) sekali klik untuk diposting ke Instagram Stories, TikTok, atau WhatsApp Status.
              </p>
            </div>

            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center space-x-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md transition self-start sm:self-auto"
            >
              <Sparkles className="h-4 w-4" />
              <span>Buka Generator Gambar</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-1/2 space-y-3">
              <span className="rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold px-3 py-1">
                SIAP IKLAN • ZERO WATERMARK DISTORTION
              </span>
              <h3 className="text-xl font-extrabold text-slate-900">
                Tampilkan Analisis Terbaik Anda dengan Desain Profesional
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tingkatkan konversi promosi dan kepercayaan calon member dengan slip infografis modern lengkap dengan confidence score, estimasi odds, dan detail pertandingan aktual Anda.
              </p>
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  Generate Poster Sekarang
                </button>
              </div>
            </div>

            <div className="w-full md:w-1/2 flex justify-center">
              <div
                onClick={() => setShareModalOpen(true)}
                className="cursor-pointer group relative rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-6 text-center transition hover:border-blue-500 hover:bg-blue-50 max-w-xs w-full"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md group-hover:scale-105 transition">
                  <Share2 className="h-7 w-7" />
                </div>
                <div className="mt-3 text-sm font-bold text-slate-800">Klik untuk Preview & Download</div>
                <div className="text-xs text-slate-500 mt-0.5">Mendukung format Story (9:16) & Feed (1:1)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 7. PENGARUH CUACA & KONDISI LAPANGAN (WEATHER IMPACT ENGINE) */}
      {/* ================================================================= */}
      {activeSubTab === 'weather' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <CloudSun className="h-5 w-5 text-amber-500" />
              <span>Pengaruh Cuaca & Kondisi Lapangan (Weather Impact Engine)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Menganalisis pengaruh kecepatan angin, curah hujan, dan temperatur arena terhadap probabilitas gol dan tempo laga.
            </p>
          </div>

          {/* Stadium / Venue selector */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-600">Arena / Stadion yang Dianalisis:</span>
            <input
              type="text"
              value={venueName}
              onChange={(e) => handleCheckWeather(e.target.value)}
              placeholder="Ketik nama stadion / kota..."
              className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
            />
          </div>

          {weatherData && (
            <div className="space-y-4">
              {/* Climate summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Suhu Udara</span>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">{weatherData.temperature}°C</div>
                  <span className="text-[11px] text-slate-500">{weatherData.condition}</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Kecepatan Angin</span>
                  <div className="text-xl font-extrabold text-blue-600 mt-0.5">{weatherData.windSpeedKmH} km/h</div>
                  <span className="text-[11px] text-slate-500">
                    {weatherData.windSpeedKmH >= 20 ? 'Angin Kencang (Under Bias)' : 'Normal'}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Peluang Hujan</span>
                  <div className="text-xl font-extrabold text-indigo-600 mt-0.5">
                    {weatherData.precipitationChance}%
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {weatherData.precipitationChance >= 50 ? 'Lapangan Basah' : 'Kering'}
                  </span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Tipe Rumput</span>
                  <div className="text-xl font-extrabold text-emerald-600 mt-0.5">{weatherData.pitchSurface}</div>
                  <span className="text-[11px] text-slate-500">Kondisi Terawat</span>
                </div>
              </div>

              {/* Impact analysis list */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Dampak Kuantitatif terhadap Pasar Taruhan:
                </h3>
                {weatherData.impacts.map((imp, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{imp.market}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            imp.bias === 'FAVORS_UNDER'
                              ? 'bg-blue-100 text-blue-800'
                              : imp.bias === 'FAVORS_OVER'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {imp.bias}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{imp.note}</p>
                    </div>
                    <div className="text-xs font-extrabold text-blue-600 self-start sm:self-center shrink-0">
                      {imp.confidenceDelta}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 8. LIVE SCORE TERINTEGRASI & IN-PLAY TICKET TRACKER */}
      {/* ================================================================= */}
      {activeSubTab === 'in_play' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  <span>Pelacak Tiket Aktif & Live Status (In-Play Tracker)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pantau status setiap leg parlay riil secara langsung. Payout dan odds tiket otomatis dihitung ulang saat terjadi Win, Push, atau Half-Win.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleImportParlayToInPlay}
                  className="rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 text-xs font-bold text-blue-700 transition"
                >
                  Impor dari Parlay Builder
                </button>
                <button
                  onClick={() => setShowCreateTicketModal(true)}
                  className="flex items-center space-x-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Buat Tiket Riil</span>
                </button>
              </div>
            </div>

            {inPlayTickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
                <Activity className="h-8 w-8 text-slate-400 mx-auto" />
                <div className="text-sm font-bold text-slate-800">Belum Ada Tiket Riil yang Sedang Dilacak</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Impor tiket dari Parlay Builder Anda atau buat tiket taruhan aktual di sini untuk memantau status skor dan perubahan payout secara live.
                </p>
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <button
                    onClick={handleImportParlayToInPlay}
                    className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs"
                  >
                    Impor dari Parlay Builder
                  </button>
                  <button
                    onClick={() => setShowCreateTicketModal(true)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-700"
                  >
                    + Buat Tiket Riil Baru
                  </button>
                </div>
              </div>
            ) : (
              inPlayTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 space-y-4 shadow-sm relative"
                >
                  <button
                    onClick={() => {
                      const updated = deleteInPlayTicket(ticket.id);
                      setInPlayTickets(updated);
                    }}
                    className="absolute top-6 right-6 text-slate-400 hover:text-rose-600 transition"
                    title="Hapus Tiket"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 pr-8">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">{ticket.title}</h3>
                      <span className="text-xs text-slate-500">
                        Dibuat: {ticket.createdAt} • Update: {ticket.updatedAt}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Odds</span>
                        <span className="text-base font-extrabold text-blue-600">@ {ticket.currentOdds}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Potensi Payout</span>
                        <span className="text-base font-extrabold text-emerald-600">
                          Rp {ticket.potentialPayout.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          ticket.status === 'WON'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : ticket.status === 'LOST'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  {/* Legs in this ticket */}
                  <div className="space-y-2">
                    {ticket.legs.map((leg) => (
                      <div
                        key={leg.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-slate-900">{leg.match}</div>
                          <div className="text-xs text-slate-500">
                            {leg.market} • <span className="text-blue-600 font-semibold">{leg.pick}</span> @ {leg.odds}
                          </div>
                          {leg.currentScore && (
                            <div className="text-xs text-slate-700 font-medium pt-1">
                              Skor Terkini: <b>{leg.currentScore}</b> ({leg.liveMinute})
                            </div>
                          )}
                        </div>

                        {/* Status changer buttons */}
                        <div className="flex items-center space-x-1.5 self-start sm:self-center">
                          <button
                            onClick={() => handleUpdateLegStatus(ticket.id, leg.id, 'WIN')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              leg.status === 'WIN'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                            }`}
                          >
                            WIN
                          </button>
                          <button
                            onClick={() => handleUpdateLegStatus(ticket.id, leg.id, 'HALF_WIN')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              leg.status === 'HALF_WIN'
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-teal-100 hover:text-teal-800'
                            }`}
                          >
                            HALF
                          </button>
                          <button
                            onClick={() => handleUpdateLegStatus(ticket.id, leg.id, 'PUSH')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              leg.status === 'PUSH'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                            }`}
                          >
                            PUSH
                          </button>
                          <button
                            onClick={() => handleUpdateLegStatus(ticket.id, leg.id, 'LOSS')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                              leg.status === 'LOSS'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-800'
                            }`}
                          >
                            LOSS
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Buat Tiket In-Play Riil */}
      {showCreateTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 max-w-lg w-full shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Buat Tiket Taruhan Riil Baru</h3>
              <button onClick={() => setShowCreateTicketModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomTicket} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Judul Tiket</label>
                  <input
                    type="text"
                    placeholder="Contoh: Parlay Weekend 3 Leg"
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Nominal Taruhan (Rp)</label>
                  <input
                    type="number"
                    step="10000"
                    placeholder="100000"
                    value={newTicketStake}
                    onChange={(e) => setNewTicketStake(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Daftar Leg Pertandingan:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setTicketLegsInput((prev) => [
                        ...prev,
                        { match: '', market: 'Asian Handicap', pick: '', odds: '1.85' },
                      ])
                    }
                    className="text-blue-600 hover:text-blue-700 font-bold"
                  >
                    + Tambah Leg
                  </button>
                </div>

                {ticketLegsInput.map((legItem, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2 relative">
                    {ticketLegsInput.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTicketLegsInput((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Pertandingan</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Chelsea vs Liverpool"
                        value={legItem.match}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTicketLegsInput((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, match: val } : l))
                          );
                        }}
                        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white p-1.5 font-semibold text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Pasar</label>
                        <select
                          value={legItem.market}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTicketLegsInput((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, market: val } : l))
                            );
                          }}
                          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white p-1.5 font-semibold text-slate-900"
                        >
                          <option value="Asian Handicap">Handicap</option>
                          <option value="Total Over/Under">Over/Under</option>
                          <option value="Moneyline">1X2</option>
                          <option value="BTTS">BTTS</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Pick</label>
                        <input
                          type="text"
                          required
                          placeholder="Chelsea -0.5"
                          value={legItem.pick}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTicketLegsInput((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, pick: val } : l))
                            );
                          }}
                          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white p-1.5 font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Odds</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="1.90"
                          value={legItem.odds}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTicketLegsInput((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, odds: val } : l))
                            );
                          }}
                          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white p-1.5 font-semibold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateTicketModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  Simpan & Mulai Pelacakan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 9. DASHBOARD TRANSPARANSI & REKAM JEJAK AKURASI AI (HIT RATE & ROI) */}
      {/* ================================================================= */}
      {activeSubTab === 'accuracy' && trackRecord && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Award className="h-5 w-5 text-amber-500" />
                <span>Dashboard Transparansi & Rekam Jejak Akurasi AI (Hit Rate & ROI)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Audit rekam jejak performa prediksi AI secara terbuka tanpa manipulasi data. Hasil terdokumentasi berbasis rekaman resmi pertandingan selesai.
              </p>
            </div>

            <button
              onClick={() => setShowRecordAuditModal(true)}
              className="flex items-center space-x-2 rounded-2xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md transition self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>+ Catat Hasil Pertandingan</span>
            </button>
          </div>

          {/* Key Metrics Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-5 text-center">
              <span className="text-xs font-bold uppercase text-emerald-800">Win Rate Keseluruhan</span>
              <div className="text-3xl font-extrabold text-emerald-900 mt-1">{trackRecord.overallWinRate}%</div>
              <span className="text-[11px] text-emerald-700">
                {trackRecord.totalWon} Menang / {trackRecord.totalLost} Kalah
              </span>
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-200/80 p-5 text-center">
              <span className="text-xs font-bold uppercase text-blue-800">Return on Investment (ROI)</span>
              <div className="text-3xl font-extrabold text-blue-900 mt-1">
                {trackRecord.roiPercentage > 0 ? `+${trackRecord.roiPercentage}%` : `${trackRecord.roiPercentage}%`}
              </div>
              <span className="text-[11px] text-blue-700">Efisiensi Profit Bersih</span>
            </div>

            <div className="rounded-2xl bg-indigo-50 border border-indigo-200/80 p-5 text-center">
              <span className="text-xs font-bold uppercase text-indigo-800">Total Net Unit</span>
              <div className="text-3xl font-extrabold text-indigo-900 mt-1">
                {trackRecord.netUnitsProfit > 0 ? `+${trackRecord.netUnitsProfit} U` : `${trackRecord.netUnitsProfit} U`}
              </div>
              <span className="text-[11px] text-indigo-700">Akumulasi Laba Bersih</span>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-center">
              <span className="text-xs font-bold uppercase text-slate-500">Total Prediksi Diaudit</span>
              <div className="text-3xl font-extrabold text-slate-800 mt-1">{trackRecord.totalPredictions}</div>
              <span className="text-[11px] text-slate-500">Partai Riil Tercatat</span>
            </div>
          </div>

          {trackRecord.recentRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-3">
              <Award className="h-8 w-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800">Belum Ada Rekam Jejak Audit yang Dicatat</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Catat hasil prediksi dari riwayat analisis Anda setelah partai selesai untuk membangun grafik akurasi dan transparansi ROI yang 100% riil.
              </p>
              <button
                onClick={() => setShowRecordAuditModal(true)}
                className="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs"
              >
                + Catat Hasil Pertandingan Riil
              </button>
            </div>
          ) : (
            <>
              {/* Breakdown By Market */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Akurasi Berdasarkan Jenis Pasar:
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {trackRecord.marketBreakdown.map((m, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{m.market}</span>
                        <span className="text-sm font-extrabold text-blue-600">{m.winRate}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${m.winRate}%` }} />
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {m.wins} Menang dari {m.total} Rekomendasi
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Audited Records Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Log Audit Pertandingan Riil:
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Pertandingan</th>
                        <th className="px-4 py-3">Pasar & Pick AI</th>
                        <th className="px-4 py-3">Odds</th>
                        <th className="px-4 py-3">Hasil</th>
                        <th className="px-4 py-3 text-right">Gain / Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {trackRecord.recentRecords.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{item.date}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{item.match}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-blue-600">{item.pick}</span>{' '}
                            <span className="text-slate-400">({item.market})</span>
                          </td>
                          <td className="px-4 py-3 font-semibold">@ {item.odds}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                item.result === 'WIN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.result === 'PUSH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.result}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-extrabold ${
                              item.unitGain > 0
                                ? 'text-emerald-600'
                                : item.unitGain < 0
                                ? 'text-rose-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.unitGain > 0 ? `+${item.unitGain} U` : `${item.unitGain} U`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal: Catat Hasil Pertandingan Riil */}
      {showRecordAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Catat Hasil Prediksi Riil</h3>
              <button onClick={() => setShowRecordAuditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {userAnalyses.length > 0 && (
              <div className="rounded-xl bg-blue-50 p-2.5 text-xs">
                <span className="font-bold text-blue-900 block mb-1">Ambil dari Riwayat Analisis AI:</span>
                <select
                  onChange={(e) => {
                    const a = userAnalyses.find((item) => item.id === e.target.value);
                    if (a) {
                      const matchStr = a.analysis?.match || (a.matches?.[0] ? `${a.matches[0].homeTeam} vs ${a.matches[0].awayTeam}` : '');
                      setAuditMatch(matchStr);
                      setAuditMarket(a.analysis?.bestMarket?.market || 'Asian Handicap');
                      setAuditPick(a.analysis?.bestMarket?.pick || a.recommendation || '');
                      setAuditConfidence(a.confidence || '75%');
                      setAuditOdds(a.matches?.[0]?.odds?.home || '1.90');
                    }
                  }}
                  className="w-full rounded-lg border border-blue-200 bg-white p-1.5 font-semibold text-slate-800"
                >
                  <option value="">-- Pilih Analisis Pertandingan --</option>
                  {userAnalyses.map((a) => (
                    <option key={a.id || Math.random().toString()} value={a.id || ''}>
                      {a.analysis?.match || `Laga #${(a.id || '').slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSaveAuditRecord} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Pertandingan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Real Madrid vs Barcelona"
                  value={auditMatch}
                  onChange={(e) => setAuditMatch(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Pasar Taruhan</label>
                  <select
                    value={auditMarket}
                    onChange={(e) => setAuditMarket(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  >
                    <option value="Asian Handicap">Asian Handicap</option>
                    <option value="Total Over/Under">Total Over/Under</option>
                    <option value="Moneyline">Moneyline (1X2)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Rekomendasi / Pick</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Over 2.5"
                    value={auditPick}
                    onChange={(e) => setAuditPick(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Odds Desimal</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1.92"
                    value={auditOdds}
                    onChange={(e) => setAuditOdds(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Hasil Akhir Laga</label>
                  <select
                    value={auditResult}
                    onChange={(e) => setAuditResult(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 font-extrabold text-slate-900"
                  >
                    <option value="WIN">WIN (Menang Penuh)</option>
                    <option value="PUSH">PUSH (Seri / Draw)</option>
                    <option value="LOSS">LOSS (Kalah)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRecordAuditModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  Catat ke Riwayat Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Social Share Card Modal (Tool 6) */}
      <SocialShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={parlayLegs.length > 0 ? 'PARLAY RIIL PILIHAN ANDA' : 'TIKET TARUHAN PILIHAN'}
        sport="Sepak Bola"
        league="Kompetisi Terpilih"
        legs={
          parlayLegs.length > 0
            ? parlayLegs.map((l) => ({
                match: l.match,
                pick: l.pick,
                market: l.market,
                odds: l.odds,
                confidence: l.confidence,
              }))
            : [
                {
                  match: mcMatchTitle !== 'Pertandingan Pilihan Anda' ? mcMatchTitle : 'Pertandingan Pilihan',
                  pick: 'Pilihan Analisis',
                  market: 'Asian Handicap',
                  odds: '1.92',
                  confidence: '78%',
                },
              ]
        }
        totalOdds={
          parlayLegs.length > 0
            ? parlayLegs.reduce((acc, l) => acc * (parseFloat(l.odds || '1.0') || 1.0), 1.0).toFixed(2)
            : '1.92'
        }
        confidenceScore="78%"
      />
    </div>
  );
};
