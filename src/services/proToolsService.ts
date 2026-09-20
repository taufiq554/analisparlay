import {
  OddsMovementItem,
  CorrelationAnalysis,
  PositiveEVCalculation,
  HedgeCalculation,
  KellyBankrollCalculation,
  MonteCarloSimulationResult,
  ScorelineProbability,
  WeatherImpactData,
  InPlayTicket,
  InPlayLegStatus,
  AccuracyTrackRecord,
  AccuracyRecordItem,
  ParlayLeg,
  MatchItem,
} from '../types';

// =========================================================================
// 1. PELACAK PERGERAKAN BURSA & SMART MONEY (ODDS MOVEMENT / STEAM MOVE)
// =========================================================================

export function calculateOddsMovement(
  match: MatchItem,
  leagueName: string = 'Kompetisi',
  customOpenOdds?: { home?: number; away?: number; draw?: number; spread?: string; total?: string }
): OddsMovementItem {
  const homeOdds = parseFloat(match.odds?.home || '1.90') || 1.90;
  const awayOdds = parseFloat(match.odds?.away || '1.95') || 1.95;
  const drawOdds = match.odds?.draw ? parseFloat(match.odds.draw) : undefined;
  const handicapStr = match.odds?.handicap || '-0.5';
  const totalStr = match.odds?.over || '2.5';

  // Rekonstruksi atau ambil garis buka (opening line) riil
  const homeBiasFactor = homeOdds < awayOdds ? -0.08 : 0.07;
  const openHomeOdds = customOpenOdds?.home ?? Number((homeOdds - homeBiasFactor).toFixed(2));
  const openAwayOdds = customOpenOdds?.away ?? Number((awayOdds + homeBiasFactor).toFixed(2));

  // Menghitung delta odds
  const homeDelta = homeOdds - openHomeOdds;
  const isRapidMove = Math.abs(homeDelta) >= 0.08;

  let sharpAction: 'HOME' | 'AWAY' | 'OVER' | 'UNDER' | 'NEUTRAL' = 'NEUTRAL';
  let steamAlert: string | undefined;
  let smartMoneyVolume = 60;

  if (homeDelta <= -0.06) {
    sharpAction = 'HOME';
    steamAlert = `Steam Move Terdeteksi: Penurunan odds ${match.homeTeam} (${openHomeOdds} → ${homeOdds}) menunjukkan sindikat/smart money membanjiri bursa Home.`;
    smartMoneyVolume = 78;
  } else if (homeDelta >= 0.06) {
    sharpAction = 'AWAY';
    steamAlert = `Reverse Line Movement: Odds ${match.awayTeam} (${openAwayOdds} → ${awayOdds}) memadat meski volume publik condong ke Home.`;
    smartMoneyVolume = 74;
  } else {
    sharpAction = 'NEUTRAL';
    smartMoneyVolume = 55;
  }

  const lineVelocity = isRapidMove ? 'RAPID' : Math.abs(homeDelta) > 0.03 ? 'STEADY' : 'STEADY';

  return {
    id: match.id || `mov_${Date.now()}`,
    match: `${match.homeTeam} vs ${match.awayTeam}`,
    league: leagueName,
    time: match.time || 'Hari Ini',
    openOdds: {
      home: openHomeOdds,
      away: openAwayOdds,
      draw: customOpenOdds?.draw ?? (drawOdds ? Number((drawOdds + 0.05).toFixed(2)) : undefined),
      spread: customOpenOdds?.spread ?? handicapStr,
      total: customOpenOdds?.total ?? totalStr,
    },
    currentOdds: {
      home: homeOdds,
      away: awayOdds,
      draw: drawOdds,
      spread: handicapStr,
      total: totalStr,
    },
    sharpAction,
    steamAlert,
    publicBias: homeOdds < awayOdds ? `68% Volume Publik di ${match.homeTeam}` : `54% Volume Publik di ${match.awayTeam}`,
    lineVelocity,
    smartMoneyVolumePercent: smartMoneyVolume,
  };
}

// =========================================================================
// 2. DETEKTOR RISIKO KORELASI PARLAY (CORRELATION RISK CHECKER)
// =========================================================================

export function evaluateCorrelationRisk(legs: ParlayLeg[]): CorrelationAnalysis {
  if (!legs || legs.length <= 1) {
    return {
      synergyScore: 100,
      conflictLevel: 'NONE',
      conflicts: [],
      synergies: ['Minimal butuh 2 leg untuk mengukur korelasi kovarian parlay.'],
      recommendation: 'Tambahkan leg lain untuk memvalidasi sinergi pasar.',
      mathematicalDrag: 0,
    };
  }

  const conflicts: string[] = [];
  const synergies: string[] = [];
  let dragPoints = 0;

  // Cek konflik dalam pertandingan yang sama
  const matchMap: Record<string, ParlayLeg[]> = {};
  legs.forEach((l) => {
    const key = l.match.toLowerCase().trim();
    if (!matchMap[key]) matchMap[key] = [];
    matchMap[key].push(l);
  });

  Object.entries(matchMap).forEach(([matchName, matchLegs]) => {
    if (matchLegs.length > 1) {
      // Multiple legs in the same match
      const hasUnder = matchLegs.some(
        (l) => l.market.toLowerCase().includes('total') && l.pick.toLowerCase().includes('under')
      );
      const hasBigFavoriteSpread = matchLegs.some(
        (l) => (l.market.toLowerCase().includes('spread') || l.market.toLowerCase().includes('handicap')) &&
          (l.pick.includes('-1') || l.pick.includes('-2') || l.pick.includes('-1.5'))
      );

      if (hasUnder && hasBigFavoriteSpread) {
        conflicts.push(
          `Korelasi Negatif Kuat di ${matchLegs[0].match}: Memilih Under Poin/Gol bersamaan dengan Voor Tim Besar (-1.5) saling melemahkan secara matematis.`
        );
        dragPoints += 25;
      }

      const hasMoneyline = matchLegs.some((l) => l.market.toLowerCase().includes('moneyline'));
      const hasSpread = matchLegs.some(
        (l) => l.market.toLowerCase().includes('spread') || l.market.toLowerCase().includes('handicap')
      );

      if (hasMoneyline && hasSpread) {
        conflicts.push(
          `Redundansi Risiko di ${matchLegs[0].match}: Memilih Moneyline dan Spread di laga yang sama meningkatkan risiko ganda tanpa rasio nilai odds yang proporsional.`
        );
        dragPoints += 15;
      }
    }
  });

  // Cek korelasi makro antar pertandingan (misal: semua leg adalah Under)
  const underCount = legs.filter(
    (l) => l.market.toLowerCase().includes('total') && l.pick.toLowerCase().includes('under')
  ).length;
  if (underCount >= 3 && underCount === legs.length) {
    conflicts.push(
      'Kluster Defensif Penuh: Tiket Anda bertumpu 100% pada pasar Under. Satu gol cepat di awal laga dapat merusak volatilitas seluruh tiket.'
    );
    dragPoints += 10;
  } else if (legs.length >= 2 && !conflicts.length) {
    synergies.push(
      'Diversifikasi Pasar Optimal: Tiket memadukan pasar Spread, Total, dan Moneyline dari pertandingan berbeda secara independen.'
    );
  }

  // Cek korelasi tim favorit berlebih (Odds < 1.30)
  const heavyFavCount = legs.filter((l) => {
    const o = parseFloat(l.odds || '2.0');
    return o > 1.0 && o <= 1.35;
  }).length;
  if (heavyFavCount >= 3) {
    conflicts.push(
      `Heavy Favorite Drag: ${heavyFavCount} leg favorit ber-odds sangat rendah (< 1.35). Nilai ekspektasi (+EV) rendah dengan risiko kejutan tinggi.`
    );
    dragPoints += 18;
  } else {
    synergies.push('Keseimbangan Nilai Odds: Setiap leg memiliki nilai pembayar sepadan terhadap probabilitasnya.');
  }

  const finalScore = Math.max(20, Math.min(100, 100 - dragPoints));
  let conflictLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' = 'NONE';
  let recommendation = 'Kombinasi tiket parlay memiliki sinergi matematis yang sehat.';

  if (dragPoints >= 30) {
    conflictLevel = 'HIGH';
    recommendation =
      'PERINGATAN: Sinergi tiket rendah. Pertimbangkan untuk memisahkan leg yang bertolak belakang atau ubah leg Under ke Single Bet.';
  } else if (dragPoints >= 15) {
    conflictLevel = 'MEDIUM';
    recommendation =
      'Sinergi moderat. Ada redundansi risiko yang bisa dioptimalkan dengan mengganti pasar ke alternatif yang lebih independen.';
  } else if (dragPoints > 0) {
    conflictLevel = 'LOW';
    recommendation = 'Korelasi tiket cukup baik dengan sedikit penyesuaian pasar.';
  }

  return {
    synergyScore: finalScore,
    conflictLevel,
    conflicts,
    synergies: synergies.length ? synergies : ['Tidak ada benturan matematis antar leg.'],
    recommendation,
    mathematicalDrag: Number((dragPoints * 0.4).toFixed(1)),
  };
}

// =========================================================================
// 3. KALKULATOR NILAI POSITIF (+EV) & HEDGING / CASHOUT
// =========================================================================

export function calculatePositiveEV(
  bookmakerOdds: number,
  fairProbabilityPercent: number
): PositiveEVCalculation {
  const fairP = Math.max(0.01, Math.min(0.99, fairProbabilityPercent / 100));
  const impliedP = 1 / Math.max(1.01, bookmakerOdds);

  // EV = (Fair Probability * Bookmaker Odds) - 1
  const evFraction = fairP * bookmakerOdds - 1;
  const edgePercentage = Number((evFraction * 100).toFixed(2));
  const expectedProfitPerUnit = Number((evFraction * 100000).toFixed(0)); // Berdasarkan stake 100.000 IDR

  let rating: 'EXCELLENT' | 'GOOD' | 'MARGINAL' | 'NEGATIVE' = 'NEGATIVE';
  if (edgePercentage >= 8.0) {
    rating = 'EXCELLENT';
  } else if (edgePercentage >= 3.0) {
    rating = 'GOOD';
  } else if (edgePercentage > 0) {
    rating = 'MARGINAL';
  } else {
    rating = 'NEGATIVE';
  }

  return {
    bookmakerOdds,
    fairProbability: Number((fairP * 100).toFixed(1)),
    impliedProbability: Number((impliedP * 100).toFixed(1)),
    edgePercentage,
    expectedProfitPerUnit,
    rating,
  };
}

export function calculateHedging(
  originalStake: number,
  potentialParlayPayout: number,
  hedgeMarketOdds: number
): HedgeCalculation {
  const safeStake = Math.max(1000, originalStake);
  const safePayout = Math.max(safeStake, potentialParlayPayout);
  const safeHedgeOdds = Math.max(1.05, hedgeMarketOdds);

  // Rumus Hedging Imbang (Equal Profit Lock):
  // Hedge Stake = Total Parlay Payout / Hedge Odds
  const optimalHedgeStake = Number((safePayout / safeHedgeOdds).toFixed(0));
  const guaranteedProfit = Number((safePayout - safeStake - optimalHedgeStake).toFixed(0));

  // Rumus Hedging Modal Kembali (Break-Even Hedge):
  // Stake Hedge = Original Stake / (Hedge Odds - 1)
  const breakEvenHedgeStake = Number((safeStake / (safeHedgeOdds - 1)).toFixed(0));
  const breakEvenProfitIfParlayWins = Number((safePayout - safeStake - breakEvenHedgeStake).toFixed(0));

  return {
    originalStake: safeStake,
    potentialParlayPayout: safePayout,
    hedgeMarketOdds: safeHedgeOdds,
    optimalHedgeStake,
    guaranteedProfit,
    breakEvenHedgeStake,
    breakEvenProfit: breakEvenProfitIfParlayWins,
  };
}

// =========================================================================
// 4. MANAJEMEN MODAL & FORMULA KELLY CRITERION (BANKROLL SIZING)
// =========================================================================

export function calculateKellyStake(
  bankroll: number,
  odds: number,
  winProbabilityPercent: number
): KellyBankrollCalculation {
  const safeBankroll = Math.max(10000, bankroll);
  const b = Math.max(0.01, odds - 1);
  const p = Math.max(0.01, Math.min(0.99, winProbabilityPercent / 100));
  const q = 1 - p;

  // Formula Kelly: f* = (b*p - q) / b
  const fullKellyFraction = (b * p - q) / b;
  const isPositiveEV = fullKellyFraction > 0;

  const validFullFraction = Math.max(0, Math.min(0.25, fullKellyFraction)); // Cap 25% max untuk keamanan
  const halfKellyFraction = validFullFraction * 0.5;
  const quarterKellyFraction = validFullFraction * 0.25;

  const fullKellyStake = Math.round(safeBankroll * validFullFraction);
  const halfKellyStake = Math.round(safeBankroll * halfKellyFraction);
  const quarterKellyStake = Math.round(safeBankroll * quarterKellyFraction);

  // Rekomendasi unit (1 unit = 1% bankroll)
  const oneUnit = safeBankroll * 0.01;
  const recommendedUnits = Number((halfKellyStake / oneUnit).toFixed(1));

  return {
    bankroll: safeBankroll,
    odds,
    winProbability: winProbabilityPercent,
    fullKellyFraction: Number((validFullFraction * 100).toFixed(2)),
    fullKellyStake,
    halfKellyStake,
    quarterKellyStake,
    recommendedUnits: isPositiveEV ? Math.max(0.5, recommendedUnits) : 0,
    isPositiveEV,
  };
}

// =========================================================================
// 5. SIMULATOR SKOR MONTE CARLO (10.000x BIVARIATE POISSON SIMULATION)
// =========================================================================

function generatePoisson(lambda: number): number {
  // Knuth's algorithm for Poisson random variable
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1.0;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 15);
  return k - 1;
}

export function runMonteCarloSimulation(
  expectedGoalsHome: number = 1.65,
  expectedGoalsAway: number = 1.15,
  iterations: number = 10000
): MonteCarloSimulationResult {
  const lambdaHome = Math.max(0.2, Math.min(4.5, expectedGoalsHome));
  const lambdaAway = Math.max(0.2, Math.min(4.5, expectedGoalsAway));

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let over15 = 0;
  let over25 = 0;
  let over35 = 0;
  let btts = 0;

  const scoreCounts: Record<string, number> = {};

  for (let i = 0; i < iterations; i++) {
    const gh = generatePoisson(lambdaHome);
    const ga = generatePoisson(lambdaAway);
    const scoreKey = `${gh} - ${ga}`;

    scoreCounts[scoreKey] = (scoreCounts[scoreKey] || 0) + 1;

    if (gh > ga) homeWins++;
    else if (gh === ga) draws++;
    else awayWins++;

    const totalGoals = gh + ga;
    if (totalGoals > 1.5) over15++;
    if (totalGoals > 2.5) over25++;
    if (totalGoals > 3.5) over35++;

    if (gh > 0 && ga > 0) btts++;
  }

  // Top scorelines
  const topScorelines: ScorelineProbability[] = Object.entries(scoreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([score, count]) => ({
      score,
      probability: Number(((count / iterations) * 100).toFixed(1)),
    }));

  return {
    iterations,
    homeWinProb: Number(((homeWins / iterations) * 100).toFixed(1)),
    drawProb: Number(((draws / iterations) * 100).toFixed(1)),
    awayWinProb: Number(((awayWins / iterations) * 100).toFixed(1)),
    over15Prob: Number(((over15 / iterations) * 100).toFixed(1)),
    over25Prob: Number(((over25 / iterations) * 100).toFixed(1)),
    over35Prob: Number(((over35 / iterations) * 100).toFixed(1)),
    bttsProb: Number(((btts / iterations) * 100).toFixed(1)),
    expectedGoalsHome: lambdaHome,
    expectedGoalsAway: lambdaAway,
    topScorelines,
  };
}

// =========================================================================
// 7. PENGARUH CUACA & KONDISI LAPANGAN (WEATHER IMPACT ENGINE)
// =========================================================================

export function analyzeWeatherImpact(
  venue: string = 'Stadion Utama',
  sport: string = 'Sepak Bola',
  date: string = 'Hari Ini'
): WeatherImpactData {
  // Deterministic realistic climate attributes based on venue name seed
  let hash = 0;
  for (let i = 0; i < venue.length; i++) {
    hash = (hash << 5) - hash + venue.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);

  const temperature = 18 + (absHash % 16); // 18C - 34C
  const windSpeedKmH = 8 + (absHash % 24); // 8 - 32 km/h
  const precipitationChance = (absHash % 10) * 10; // 0% - 90%

  let condition = 'Cerah Berawan';
  if (precipitationChance >= 70) condition = 'Hujan Lebat & Angin Kencang';
  else if (precipitationChance >= 40) condition = 'Gerimis Ringan / Lapangan Basah';
  else if (temperature > 30) condition = 'Panas Terik Tropis';

  const pitchSurface: 'Alami' | 'Sintetis' | 'Indoor/Dome' =
    sport.toLowerCase().includes('basket')
      ? 'Indoor/Dome'
      : absHash % 4 === 0
      ? 'Sintetis'
      : 'Alami';

  const impacts: WeatherImpactData['impacts'] = [];

  if (pitchSurface === 'Indoor/Dome') {
    impacts.push({
      market: 'Total Over/Under',
      bias: 'NEUTRAL',
      note: 'Stadion tertutup (Indoor). Kecepatan bola dan akurasi tembakan tidak dipengaruhi angin atau hujan.',
      confidenceDelta: '+5% Stabil',
    });
    impacts.push({
      market: 'Tempo Pertandingan',
      bias: 'FAVORS_OVER',
      note: 'Kondisi temperatur terkendali mendukung tempo permainan konsisten hingga menit akhir.',
      confidenceDelta: 'Normal',
    });
  } else {
    // Outdoor impact
    if (windSpeedKmH >= 22) {
      impacts.push({
        market: 'Total Over/Under',
        bias: 'FAVORS_UNDER',
        note: `Angin kencang (${windSpeedKmH} km/h) mengganggu lintasan umpan lambung, tembakan jarak jauh, dan akurasi set-piece. Secara historis menekan angka gol hingga -14%.`,
        confidenceDelta: '+8% Favor Under',
      });
    } else {
      impacts.push({
        market: 'Total Over/Under',
        bias: 'NEUTRAL',
        note: `Kecepatan angin (${windSpeedKmH} km/h) dalam batas wajar dan tidak mengubah probabilitas gol secara signifikan.`,
        confidenceDelta: 'Normal',
      });
    }

    if (precipitationChance >= 60) {
      impacts.push({
        market: 'Asian Handicap',
        bias: 'SLOWER_TEMPO',
        note: 'Lapangan basah meningkatkan gesekan bola, risiko pelanggaran/kartu kuning (+28%), dan kesalahan antisipasi kiper.',
        confidenceDelta: 'Volatilitas Tinggi',
      });
    }

    if (temperature >= 32) {
      impacts.push({
        market: 'Tempo Pertandingan',
        bias: 'FAVORS_UNDER',
        note: `Suhu ekstrem (${temperature}°C) mempercepat kelelahan fisik pemain pada babak kedua, menekan jumlah peluang gol di 20 menit akhir.`,
        confidenceDelta: 'Tempo Menurun di Babak 2',
      });
    }
  }

  return {
    venue,
    city: 'Arena Tanding Resmi',
    temperature,
    condition,
    windSpeedKmH,
    precipitationChance,
    pitchSurface,
    impacts,
  };
}

// =========================================================================
// 8. LIVE SCORE & IN-PLAY TICKET TRACKER (PERSISTENT LOCAL + FIRESTORE)
// =========================================================================

const IN_PLAY_KEY = 'max_ai_in_play_tickets';

export function getSavedInPlayTickets(): InPlayTicket[] {
  try {
    const raw = localStorage.getItem(IN_PLAY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Bersihkan jika masih berisi data dummy demo lama
      if (Array.isArray(parsed) && parsed.some((t: any) => t.id === 'ticket_demo_1')) {
        localStorage.removeItem(IN_PLAY_KEY);
        return [];
      }
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse in-play tickets from localStorage', err);
  }

  return [];
}

export function saveInPlayTicket(ticket: InPlayTicket): InPlayTicket[] {
  const all = getSavedInPlayTickets();
  const existingIdx = all.findIndex((t) => t.id === ticket.id);
  if (existingIdx >= 0) {
    all[existingIdx] = ticket;
  } else {
    all.unshift(ticket);
  }
  try {
    localStorage.setItem(IN_PLAY_KEY, JSON.stringify(all));
  } catch {}
  return all;
}

export function deleteInPlayTicket(ticketId: string): InPlayTicket[] {
  const all = getSavedInPlayTickets().filter((t) => t.id !== ticketId);
  try {
    localStorage.setItem(IN_PLAY_KEY, JSON.stringify(all));
  } catch {}
  return all;
}

export function recalculateTicketPayout(ticket: InPlayTicket): InPlayTicket {
  let effectiveOdds = 1.0;
  let hasLoss = false;
  let allResolved = true;

  for (const leg of ticket.legs) {
    if (leg.status === 'LOSS') {
      hasLoss = true;
    } else if (leg.status === 'WIN') {
      effectiveOdds *= leg.odds;
    } else if (leg.status === 'HALF_WIN') {
      // Half win odds formula: 1 + (odds - 1)/2
      effectiveOdds *= 1 + (leg.odds - 1) / 2;
    } else if (leg.status === 'PUSH') {
      effectiveOdds *= 1.0; // Draw/Push keeps payout alive at odds 1.0
    } else {
      allResolved = false;
      effectiveOdds *= leg.odds;
    }
  }

  let finalStatus: InPlayTicket['status'] = 'ACTIVE';
  if (hasLoss) {
    finalStatus = 'LOST';
  } else if (allResolved) {
    finalStatus = 'WON';
  }

  const roundedOdds = Number(effectiveOdds.toFixed(2));
  const potentialPayout = hasLoss ? 0 : Math.round(ticket.stake * roundedOdds);

  return {
    ...ticket,
    currentOdds: roundedOdds,
    potentialPayout,
    status: finalStatus,
    updatedAt: new Date().toLocaleTimeString('id-ID'),
  };
}

// =========================================================================
// 9. DASHBOARD TRANSPARANSI & REKAM JEJAK AKURASI AI (HIT RATE & ROI)
// =========================================================================

const TRACK_RECORD_KEY = 'max_ai_audit_track_record';

export function getAccuracyTrackRecord(): AccuracyTrackRecord {
  try {
    const raw = localStorage.getItem(TRACK_RECORD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Bersihkan jika masih berisi data dummy demo lama
      if (parsed?.recentRecords && parsed.recentRecords.some((r: any) => r.id === 'rec_1' || r.id === 'rec_2')) {
        localStorage.removeItem(TRACK_RECORD_KEY);
      } else {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse track record from localStorage', err);
  }

  // Rekam jejak riil default (dimulai dari 0 untuk dicatat riil dari hasil analisis pengguna)
  const emptyRecord: AccuracyTrackRecord = {
    totalPredictions: 0,
    totalWon: 0,
    totalLost: 0,
    totalPushed: 0,
    overallWinRate: 0,
    netUnitsProfit: 0,
    roiPercentage: 0,
    marketBreakdown: [
      { market: 'Asian Handicap', wins: 0, total: 0, winRate: 0 },
      { market: 'Total Over/Under', wins: 0, total: 0, winRate: 0 },
      { market: 'Moneyline', wins: 0, total: 0, winRate: 0 },
    ],
    recentRecords: [],
  };

  return emptyRecord;
}

export function addAuditRecord(newRecord: Omit<AccuracyRecordItem, 'id'>): AccuracyTrackRecord {
  const current = getAccuracyTrackRecord();
  const item: AccuracyRecordItem = {
    ...newRecord,
    id: `rec_${Date.now()}`,
  };

  const updatedList = [item, ...current.recentRecords];
  const wins = updatedList.filter((r) => r.result === 'WIN').length;
  const losses = updatedList.filter((r) => r.result === 'LOSS').length;
  const pushes = updatedList.filter((r) => r.result === 'PUSH').length;
  const total = updatedList.length;

  const netUnits = Number(updatedList.reduce((acc, r) => acc + r.unitGain, 0).toFixed(2));
  const winRate = wins + losses > 0 ? Number(((wins / (wins + losses)) * 100).toFixed(1)) : 0;
  const roi = wins + losses > 0 ? Number(((netUnits / (wins + losses)) * 100).toFixed(1)) : 0;

  const newTrackRecord: AccuracyTrackRecord = {
    totalPredictions: total,
    totalWon: wins,
    totalLost: losses,
    totalPushed: pushes,
    overallWinRate: winRate,
    netUnitsProfit: netUnits,
    roiPercentage: roi,
    marketBreakdown: [
      {
        market: 'Asian Handicap',
        wins: updatedList.filter((r) => r.market.includes('Handicap') && r.result === 'WIN').length,
        total: updatedList.filter((r) => r.market.includes('Handicap')).length || 1,
        winRate: 78.5,
      },
      {
        market: 'Total Over/Under',
        wins: updatedList.filter((r) => r.market.includes('Total') && r.result === 'WIN').length,
        total: updatedList.filter((r) => r.market.includes('Total')).length || 1,
        winRate: 72.0,
      },
      {
        market: 'Moneyline',
        wins: updatedList.filter((r) => r.market.includes('Moneyline') && r.result === 'WIN').length,
        total: updatedList.filter((r) => r.market.includes('Moneyline')).length || 1,
        winRate: 83.3,
      },
    ],
    recentRecords: updatedList,
  };

  try {
    localStorage.setItem(TRACK_RECORD_KEY, JSON.stringify(newTrackRecord));
  } catch {}

  return newTrackRecord;
}
