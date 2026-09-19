export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'inactive' | 'expired';
  analysisLimit: number;
  analysisUsed: number;
  subscriptionStart?: string;
  subscriptionEnd?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // in IDR
  duration: string; // e.g. "bulan"
  analysisLimit: number;
  features: string[];
  active: boolean;
}

export interface MatchOdds {
  home?: string;
  away?: string;
  draw?: string;
  over?: string;
  under?: string;
  handicap?: string;
}

export interface MatchItem {
  id?: string;
  homeTeam: string;
  awayTeam: string;
  time: string;
  odds: MatchOdds;
}

export interface DetectedSchedule {
  sport: string;
  league: string;
  date: string;
  matches: MatchItem[];
}

export interface MarketAnalysisPick {
  pick: string;
  confidence: string;
  analysis?: string;
}

export interface MatchResearchData {
  form?: {
    home: string;
    away: string;
  };
  headToHead?: string;
  injuries?: {
    home: string;
    away: string;
  };
  homeAway?: {
    homeRecord: string;
    awayRecord: string;
  };
  statistics?: string;
  news?: string;
}

export interface MarketDetailAnalysis {
  market: string;
  pick: string;
  confidence: string;
  analysis?: string;
}

export interface BestSupportedMarket {
  market: string;
  pick: string;
  reason: string;
}

export interface SingleMatchAnalysis {
  matchIndex: number;
  matchId?: string;
  homeTeam: string;
  awayTeam: string;
  match: string;
  sport: string;
  league: string;
  time: string;
  odds?: MatchOdds;
  form?: {
    home: string;
    away: string;
  };
  research?: MatchResearchData;
  markets?: MarketDetailAnalysis[];
  marketAnalysis: {
    moneyline: MarketAnalysisPick;
    handicap: MarketAnalysisPick;
    total: MarketAnalysisPick;
    [key: string]: MarketAnalysisPick | undefined;
  };
  bestMarket?: BestSupportedMarket;
  keyFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  overallConfidence: string;
  recommendation: 'BET' | 'WATCH' | 'NO BET';
  reason: string;
  reasoning?: string;
  suggestedPick?: string;
  suggestedMarket?: string;
  sources?: string[];
  date?: string;
  modelUsed?: string;
  provider?: string;
  rawResponse?: string;
}

export type AiAnalysisResult = SingleMatchAnalysis;

export interface ParlayLegSuggestion {
  matchIndex: number;
  match: string;
  sport: string;
  league: string;
  market: string;
  pick: string;
  odds?: string;
  confidence: string;
  risk: string;
  reason?: string;
}

export interface BestSupportedCombination {
  title?: string;
  legs: string[];
  rationale: string;
}

export interface ParlaySummary {
  totalMatches: number;
  recommendedCount: number;
  watchCount: number;
  avoidCount: number;
  suggestedLegs: ParlayLegSuggestion[];
  recommendedLegs?: ParlayLegSuggestion[];
  watchMatches: { match: string; reason: string }[];
  avoidMatches: { match: string; reason: string }[];
  watch?: { match: string; reason: string }[];
  avoid?: { match: string; reason: string }[];
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  parlayConfidence: string; // e.g. "68%" or "N/A"
  bestSupportedCombination?: BestSupportedCombination;
  analysisNote?: string;
  sources?: string[];
}

export interface MultiMatchAnalysisResult {
  sport: string;
  league: string;
  date: string;
  matches: SingleMatchAnalysis[];
  parlaySummary: ParlaySummary;
  modelUsed?: string;
  provider?: string;
  rawResponse?: string;
  sources?: string[];
}

export interface SavedAnalysis {
  id?: string;
  userId: string;
  userEmail?: string;
  sport: string;
  league: string;
  matches: MatchItem[];
  analysis?: AiAnalysisResult;
  multiAnalysis?: MultiMatchAnalysisResult;
  parlaySummary?: ParlaySummary;
  confidence: string;
  riskLevel: string;
  recommendation: string;
  matchCount?: number;
  createdAt: string;
}

export interface ParlayLeg {
  id: string;
  match: string;
  sport: string;
  league: string;
  market: string;
  pick: string;
  odds?: string;
  confidence: string;
  risk: string;
  recommendation: string;
  reason?: string;
}

export interface AiDebugInfo {
  provider: string;
  model: string;
  imageDetected: boolean;
  mimeType?: string;
  imageSizeFormatted?: string;
  imageSizeBytes?: number;
  httpStatus?: number | string;
  requestStatus: 'success' | 'failed' | 'fallback';
  openRouterErrorMessage?: string;
  responseValid: boolean;
  matchesExtractedCount?: number;
  maxTokens?: number;
  timestamp: string;
  details?: string;
}

export interface ParsedScreenshotResult {
  schedule: DetectedSchedule;
  debugInfo: AiDebugInfo;
  rawJson?: any;
}

export interface PaymentTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  planId: string;
  planName: string;
  amount: number;
  paymentMethod: string; // e.g. "QRIS", "BCA", "GoPay", "DANA", "Mandiri"
  senderAccountName: string;
  transferTime?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface AdminAuditLog {
  id: string;
  adminEmail: string;
  adminUid: string;
  targetUserId?: string;
  targetUserEmail?: string;
  action: string;
  details: string;
  timestamp: string;
}
