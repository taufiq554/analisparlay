import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile, SubscriptionPlan, SavedAnalysis, PaymentTicket, AdminAuditLog } from '../types';

const USERS_COLLECTION = 'users';
const PLANS_COLLECTION = 'plans';
const ANALYSES_COLLECTION = 'analyses';
const PAYMENT_TICKETS_COLLECTION = 'payment_tickets';
const AUDIT_LOGS_COLLECTION = 'admin_audit_logs';

// Default initial plans to populate in Firestore if none exist yet
export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'FREE',
    price: 0,
    duration: 'bulan',
    analysisLimit: 3,
    features: [
      '3 Analisis Pertandingan / bulan',
      'Deteksi OCR Jadwal Screenshot',
      'Akses Olahraga Terbatas',
      'Penyimpanan Riwayat Dasar',
    ],
    active: true,
  },
  {
    id: 'starter',
    name: 'STARTER',
    price: 29000,
    duration: 'bulan',
    analysisLimit: 30,
    features: [
      '30 Analisis Pertandingan / bulan',
      'Deteksi OCR Cepat & Akurat',
      'Semua Pilihan Olahraga Lengkap',
      'Market & Odds Analysis Lengkap',
      'Parlay Builder Hingga 5 Leg',
    ],
    active: true,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 59000,
    duration: 'bulan',
    analysisLimit: 100,
    features: [
      '100 Analisis Pertandingan / bulan',
      'Prioritas Kecepatan Analisis AI',
      'Analisis Khusus Form & H2H Lengkap',
      'Full Parlay Builder & Odds Multiplier',
      'Peringatan Risiko & No-Bet Filter',
    ],
    active: true,
  },
  {
    id: 'ultimate',
    name: 'ULTIMATE',
    price: 99000,
    duration: 'bulan',
    analysisLimit: 300,
    features: [
      '300 Analisis Pertandingan / bulan',
      'Semua Fitur Pro Tanpa Hambatan',
      'Penyimpanan Analisis Tak Terbatas',
      'Dukungan Khusus & Update Prioritas',
      'Kalkulasi Risiko Statistik Lanjutan',
    ],
    active: true,
  },
];

/**
 * Initializes or fetches user document in Firestore upon login/register.
 */
export async function syncUserProfile(
  uid: string,
  email: string,
  name?: string
): Promise<UserProfile> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);

  // Nandegg55 is authorized administrator
  const isAdminEmail = email.toLowerCase() === 'nandegg55@gmail.com';

  if (!userSnap.exists()) {
    const newUser: UserProfile = {
      uid,
      name: name || email.split('@')[0],
      email,
      role: isAdminEmail ? 'admin' : 'user',
      subscriptionPlan: 'FREE',
      subscriptionStatus: 'active',
      analysisLimit: 3,
      analysisUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, newUser);
    return newUser;
  }

  const existingData = userSnap.data() as UserProfile;
  // If email matches admin but role isn't admin yet, promote smoothly
  if (isAdminEmail && existingData.role !== 'admin') {
    await updateDoc(userRef, { role: 'admin', updatedAt: new Date().toISOString() });
    existingData.role = 'admin';
  }

  return existingData;
}

/**
 * Realtime listener for the active user's profile
 */
export function subscribeToUserProfile(
  uid: string,
  onUpdate: (profile: UserProfile | null) => void
): () => void {
  const userRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as UserProfile);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Error listening to user profile:', err);
    }
  );
}

/**
 * Increments analysisUsed count by 1 in Firestore
 */
export async function incrementAnalysisQuota(uid: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    analysisUsed: increment(1),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Seeds default subscription plans into Firestore if the plans collection is currently empty
 */
export async function seedPlansIfEmpty(): Promise<SubscriptionPlan[]> {
  try {
    const plansRef = collection(db, PLANS_COLLECTION);
    const snap = await getDocs(plansRef);

    if (snap.empty) {
      for (const p of DEFAULT_PLANS) {
        await setDoc(doc(db, PLANS_COLLECTION, p.id), p);
      }
      return DEFAULT_PLANS;
    }

    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as SubscriptionPlan));
  } catch (err) {
    console.warn('Unable to seed/fetch plans directly from Firestore:', err);
    return [];
  }
}

/**
 * Fetches all subscription plans from Firestore
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const plansRef = collection(db, PLANS_COLLECTION);
    const snap = await getDocs(plansRef);
    if (snap.empty) {
      return await seedPlansIfEmpty();
    }
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as SubscriptionPlan));
  } catch (err) {
    console.error('Error fetching plans:', err);
    return [];
  }
}

/**
 * Saves a completed AI analysis to Firestore
 */
export async function saveAnalysisToFirestore(analysisData: Omit<SavedAnalysis, 'id'>): Promise<string> {
  const analysesRef = collection(db, ANALYSES_COLLECTION);
  const newDocRef = doc(analysesRef);
  const dataWithId: SavedAnalysis = {
    ...analysisData,
    id: newDocRef.id,
  };
  await setDoc(newDocRef, dataWithId);
  return newDocRef.id;
}

/**
 * Fetches analyses belonging to a specific user
 */
export async function getUserAnalyses(userId: string): Promise<SavedAnalysis[]> {
  try {
    const q = query(
      collection(db, ANALYSES_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as SavedAnalysis);
  } catch (err: any) {
    // If composite index is pending, fallback without orderBy
    try {
      const qFallback = query(
        collection(db, ANALYSES_COLLECTION),
        where('userId', '==', userId)
      );
      const snapFallback = await getDocs(qFallback);
      const results = snapFallback.docs.map((d) => d.data() as SavedAnalysis);
      return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (innerErr) {
      console.error('Error loading user analyses:', innerErr);
      return [];
    }
  }
}

/**
 * ADMIN: Get all users from Firestore
 */
export async function getAllUsersForAdmin(): Promise<UserProfile[]> {
  const usersRef = collection(db, USERS_COLLECTION);
  const snap = await getDocs(usersRef);
  return snap.docs.map((d) => d.data() as UserProfile);
}

/**
 * ADMIN: Get all analyses from Firestore
 */
export async function getAllAnalysesForAdmin(): Promise<SavedAnalysis[]> {
  const analysesRef = collection(db, ANALYSES_COLLECTION);
  const snap = await getDocs(analysesRef);
  const results = snap.docs.map((d) => d.data() as SavedAnalysis);
  return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * ADMIN: Update a user's subscription or details
 */
export async function adminUpdateUser(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * ADMIN: Update or create a plan in Firestore
 */
export async function adminSavePlan(plan: SubscriptionPlan): Promise<void> {
  const planRef = doc(db, PLANS_COLLECTION, plan.id);
  await setDoc(planRef, plan, { merge: true });
}

/**
 * PAYMENT TICKET (Solusi 1 + C):
 * Submit konfirmasi pembayaran langsung ke Firestore (100% Gratis, tanpa Firebase Storage)
 */
export async function createPaymentTicket(
  ticket: Omit<PaymentTicket, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const ticketsRef = collection(db, PAYMENT_TICKETS_COLLECTION);
  const newTicketRef = doc(ticketsRef);
  const now = new Date().toISOString();

  const data: PaymentTicket = {
    ...ticket,
    id: newTicketRef.id,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(newTicketRef, data);
  return newTicketRef.id;
}

/**
 * Mendengarkan tiket pembayaran user saat ini (real-time)
 */
export function subscribeToUserTickets(
  userId: string,
  onUpdate: (tickets: PaymentTicket[]) => void
): () => void {
  const q = query(
    collection(db, PAYMENT_TICKETS_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const results = snap.docs.map((d) => d.data() as PaymentTicket);
      results.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(results);
    },
    (err) => {
      console.error('Error listening to user tickets:', err);
    }
  );
}

/**
 * Realtime listener tiket pembayaran untuk Admin Panel
 */
export function subscribeToAllTicketsForAdmin(
  onUpdate: (tickets: PaymentTicket[]) => void
): () => void {
  const ticketsRef = collection(db, PAYMENT_TICKETS_COLLECTION);
  return onSnapshot(
    ticketsRef,
    (snap) => {
      const results = snap.docs.map((d) => d.data() as PaymentTicket);
      results.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(results);
    },
    (err) => {
      console.error('Error listening to admin tickets:', err);
    }
  );
}

/**
 * ADMIN: Approve Payment Ticket & Otomatis Upgrade Akun User
 */
export async function adminApproveTicket(
  ticket: PaymentTicket,
  adminUser: { uid: string; email: string },
  planQuotaLimit: number = 100
): Promise<void> {
  const now = new Date();
  const today = now.toISOString();
  // 30 hari masa aktif
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Update profil user di Firestore
  const userRef = doc(db, USERS_COLLECTION, ticket.userId);
  await updateDoc(userRef, {
    subscriptionPlan: ticket.planName,
    subscriptionStatus: 'active',
    analysisLimit: planQuotaLimit,
    subscriptionStart: today,
    subscriptionEnd: end,
    updatedAt: today,
  });

  // 2. Update status tiket
  const ticketRef = doc(db, PAYMENT_TICKETS_COLLECTION, ticket.id);
  await updateDoc(ticketRef, {
    status: 'approved',
    approvedAt: today,
    approvedBy: adminUser.email,
    updatedAt: today,
  });

  // 3. Catat audit log
  await logAdminAction({
    adminUid: adminUser.uid,
    adminEmail: adminUser.email,
    targetUserId: ticket.userId,
    targetUserEmail: ticket.userEmail,
    action: 'APPROVE_PAYMENT',
    details: `Menyetujui pembayaran tiket #${ticket.id.slice(-6)} untuk paket ${ticket.planName} (Limit: ${planQuotaLimit}, aktif 30 hari).`,
  });
}

/**
 * ADMIN: Tolak tiket pembayaran
 */
export async function adminRejectTicket(
  ticketId: string,
  adminUser: { uid: string; email: string },
  reason: string = 'Dana belum masuk atau bukti tidak valid'
): Promise<void> {
  const now = new Date().toISOString();
  const ticketRef = doc(db, PAYMENT_TICKETS_COLLECTION, ticketId);

  await updateDoc(ticketRef, {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: now,
  });

  await logAdminAction({
    adminUid: adminUser.uid,
    adminEmail: adminUser.email,
    action: 'REJECT_PAYMENT',
    details: `Menolak tiket pembayaran #${ticketId.slice(-6)}: ${reason}`,
  });
}

/**
 * ADMIN AUDIT LOG: Mencatat riwayat aksi admin
 */
export async function logAdminAction(
  entry: Omit<AdminAuditLog, 'id' | 'timestamp'>
): Promise<void> {
  try {
    const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
    const newDoc = doc(logsRef);
    await setDoc(newDoc, {
      ...entry,
      id: newDoc.id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Audit log write skipped or deferred:', err);
  }
}

/**
 * ADMIN: Ambil daftar audit logs
 */
export async function getAdminAuditLogs(limitCount: number = 30): Promise<AdminAuditLog[]> {
  try {
    const logsRef = collection(db, AUDIT_LOGS_COLLECTION);
    const snap = await getDocs(logsRef);
    const results = snap.docs.map((d) => d.data() as AdminAuditLog);
    return results
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limitCount);
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return [];
  }
}
