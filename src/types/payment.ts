export type PlanId = '1jour' | '1semaine' | '1mois';
export type SubscriptionTier = 'free' | 'vip_1day' | 'vip_1week' | 'vip_1month' | 'vip_ultra';
export type PaymentMethod = 'moncash' | 'natcash';

export interface Plan {
  id: PlanId;
  tier: SubscriptionTier;
  duration: string;
  durationDays: number;
  durationMs: number;
  priceHTG: number;
  highlight?: boolean;
}

export interface IFlexUserSubscriptionDetails {
  paymentMethod: PaymentMethod;
  phoneNumber: string;
  amountHTG: number;
  planDuration: string;
  subscriptionTier: SubscriptionTier;
  purchaseDate: string; // ISO string
  purchaseDateFormatted: string; // Date exacte avec heure
  endDate: string; // ISO string
  endDateFormatted: string; // Date exacte avec heure de fin
  status: 'active' | 'expired';
}

export interface IFlexUser {
  docId: string; // Document ID in Firestore users/{userId}
  id: string; // UID Firebase Auth
  email: string;
  displayName?: string;
  role: 'admin' | 'editor' | 'user';
  subscriptionTier: SubscriptionTier;
  coinsBalance: number;
  totalCoinsSpent: number;
  totalAdsWatched: number;
  totalWatchTimeMinutes?: number;
  unlockedSeriesViaWhatsApp?: string[];
  status: 'active' | 'suspended';
  createdAt: string;
  // Payment & Subscription tracking fields stored in users/{userId}
  paymentMethod?: PaymentMethod;
  paymentPhone?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionDetails?: IFlexUserSubscriptionDetails;
}

export const PLANS: Plan[] = [
  {
    id: '1jour',
    tier: 'vip_1day',
    duration: '1 Jour',
    durationDays: 1,
    durationMs: 24 * 60 * 60 * 1000,
    priceHTG: 100,
  },
  {
    id: '1semaine',
    tier: 'vip_1week',
    duration: '1 Semaine',
    durationDays: 7,
    durationMs: 7 * 24 * 60 * 60 * 1000,
    priceHTG: 500,
    highlight: true,
  },
  {
    id: '1mois',
    tier: 'vip_1month',
    duration: '1 Mois',
    durationDays: 30,
    durationMs: 30 * 24 * 60 * 60 * 1000,
    priceHTG: 1500,
  },
];
