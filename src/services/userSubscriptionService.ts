import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  deleteDoc,
  deleteField,
  addDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  IFlexUser,
  IFlexUserSubscriptionDetails,
  PaymentMethod,
  Plan,
  SubscriptionTier,
} from '../types/payment';

/**
 * Format a Date object into an exact readable French date & time (with hours and minutes).
 * Example: "03 nov. 2026 à 14:35"
 */
export function formatExactDateTime(date: Date): string {
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Erases all past payment & transaction history from Firestore when an
 * subscription has ended:
 * 1. Resets `subscriptionTier` to `'free'` on `users/{userId}`.
 * 2. Deletes payment tracking fields from `users/{userId}`.
 * 3. Deletes all transaction records associated with this user from `transactions` collection.
 * 4. Deletes any legacy records in `payments` collection.
 */
export async function cleanExpiredUserHistory(
  userId: string,
  userEmail: string
): Promise<void> {
  try {
    const cleanEmail = userEmail.trim().toLowerCase();

    // 1. Remove payment and subscription fields from users/{userId}
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      subscriptionTier: 'free',
      paymentMethod: deleteField(),
      paymentPhone: deleteField(),
      subscriptionStartDate: deleteField(),
      subscriptionEndDate: deleteField(),
      subscriptionDetails: deleteField(),
    });

    const deletePromises: Promise<void>[] = [];

    // 2. Erase from `transactions` by userId
    try {
      const qTxUser = query(collection(db, 'transactions'), where('userId', '==', userId));
      const snapTxUser = await getDocs(qTxUser);
      snapTxUser.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
    } catch (e) {
      console.warn('Notice querying transactions by userId:', e);
    }

    // 3. Erase from `transactions` by userEmail
    if (cleanEmail) {
      try {
        const qTxEmail = query(collection(db, 'transactions'), where('userEmail', '==', cleanEmail));
        const snapTxEmail = await getDocs(qTxEmail);
        snapTxEmail.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
      } catch (e) {
        console.warn('Notice querying transactions by userEmail:', e);
      }
    }

    // 4. Erase from `payments` collection by email
    if (cleanEmail) {
      try {
        const qPayments = query(collection(db, 'payments'), where('email', '==', cleanEmail));
        const snapPayments = await getDocs(qPayments);
        snapPayments.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
      } catch (e) {
        console.warn('Notice querying payments by email:', e);
      }
    }

    if (deletePromises.length > 0) {
      await Promise.allSettled(deletePromises);
    }
  } catch (err) {
    console.warn('Error during expired user history cleanup:', err);
  }
}

/**
 * 1. Automatic check on site open:
 * Scans all users in `users/{userId}` and if any user's subscriptionEndDate
 * has passed:
 * - Resets their `subscriptionTier` back to `'free'`.
 * - Erases their payment and transaction history from Firestore.
 */
export async function syncExpiredSubscriptionsOnLoad(): Promise<number> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const nowMs = Date.now();
    let expiredCount = 0;

    const cleanupPromises: Promise<void>[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const currentTier = data.subscriptionTier as SubscriptionTier | undefined;

      // Only check users who are not already on 'free'
      if (currentTier && currentTier !== 'free') {
        const rawEndDate: string | undefined =
          data.subscriptionEndDate ||
          data.subscriptionDetails?.endDate ||
          data.subscription?.endDate;

        if (rawEndDate) {
          const endMs = new Date(rawEndDate).getTime();
          if (!isNaN(endMs) && nowMs >= endMs) {
            expiredCount += 1;
            const userEmail = (data.email || '').toString().trim();
            // Erase payment and transaction history for this expired user
            cleanupPromises.push(cleanExpiredUserHistory(docSnap.id, userEmail));
          }
        }
      }
    });

    if (cleanupPromises.length > 0) {
      await Promise.allSettled(cleanupPromises);
    }

    return expiredCount;
  } catch (error) {
    console.warn('Sync expired subscriptions notice:', error);
    return 0;
  }
}

/**
 * 2. Look up a user in `users/{userId}` by their email address.
 * Compares the entered email with Firestore `users` collection.
 */
export async function findUserByEmail(emailInput: string): Promise<IFlexUser | null> {
  const cleanEmail = emailInput.trim();
  const lowerEmail = cleanEmail.toLowerCase();
  const usersRef = collection(db, 'users');

  // 1st attempt: direct query on lowercase email
  const qLower = query(usersRef, where('email', '==', lowerEmail));
  const snapLower = await getDocs(qLower);

  let matchedDoc = snapLower.docs[0];

  // 2nd attempt: if exact lowercase didn't match and input had uppercase characters
  if (!matchedDoc && cleanEmail !== lowerEmail) {
    const qExact = query(usersRef, where('email', '==', cleanEmail));
    const snapExact = await getDocs(qExact);
    matchedDoc = snapExact.docs[0];
  }

  // 3rd attempt: case-insensitive scan across `users` collection in case stored email has mixed case
  if (!matchedDoc) {
    const allUsersSnap = await getDocs(usersRef);
    matchedDoc = allUsersSnap.docs.find((d) => {
      const docEmail = (d.data().email || '').toString().trim().toLowerCase();
      return docEmail === lowerEmail;
    })!;
  }

  if (!matchedDoc) {
    return null;
  }

  const data = matchedDoc.data();
  let effectiveTier: SubscriptionTier = data.subscriptionTier || 'free';

  // Check if this specific user's subscription has expired right now
  const rawEndDate: string | undefined =
    data.subscriptionEndDate || data.subscriptionDetails?.endDate;
  if (effectiveTier !== 'free' && rawEndDate) {
    const endMs = new Date(rawEndDate).getTime();
    if (!isNaN(endMs) && Date.now() >= endMs) {
      effectiveTier = 'free';
      // Erase expired payment and transaction history immediately
      await cleanExpiredUserHistory(matchedDoc.id, lowerEmail);
    }
  }

  return {
    docId: matchedDoc.id,
    id: data.id || matchedDoc.id,
    email: data.email || lowerEmail,
    displayName: data.displayName || '',
    role: data.role || 'user',
    subscriptionTier: effectiveTier,
    coinsBalance: typeof data.coinsBalance === 'number' ? data.coinsBalance : 0,
    totalCoinsSpent: typeof data.totalCoinsSpent === 'number' ? data.totalCoinsSpent : 0,
    totalAdsWatched: typeof data.totalAdsWatched === 'number' ? data.totalAdsWatched : 0,
    totalWatchTimeMinutes: data.totalWatchTimeMinutes,
    unlockedSeriesViaWhatsApp: data.unlockedSeriesViaWhatsApp,
    status: data.status || 'active',
    createdAt: data.createdAt || new Date().toISOString(),
    paymentMethod: data.paymentMethod,
    paymentPhone: data.paymentPhone,
    subscriptionStartDate: data.subscriptionStartDate,
    subscriptionEndDate: data.subscriptionEndDate,
    subscriptionDetails: data.subscriptionDetails,
  };
}

/**
 * 3. Activate the subscription on the exact matched user in `users/{userId}`
 * AND record the transaction in the `transactions` collection.
 */
export async function activateUserSubscription(params: {
  userDocId: string;
  userEmail: string;
  plan: Plan;
  paymentMethod: PaymentMethod;
  formattedPhone: string;
}): Promise<{
  subscriptionDetails: IFlexUserSubscriptionDetails;
  transactionId: string;
}> {
  const { userDocId, userEmail, plan, paymentMethod, formattedPhone } = params;

  const purchaseDateObj = new Date();
  const endDateObj = new Date(purchaseDateObj.getTime() + plan.durationMs);

  const purchaseDateISO = purchaseDateObj.toISOString();
  const endDateISO = endDateObj.toISOString();
  const purchaseDateFormatted = formatExactDateTime(purchaseDateObj);
  const endDateFormatted = formatExactDateTime(endDateObj);

  // Generate Tranzak payment reference
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const transactionId = `TRZ-${paymentMethod.toUpperCase()}-${Date.now().toString().slice(-4)}-${randomSuffix}`;

  const subscriptionDetails: IFlexUserSubscriptionDetails = {
    paymentMethod,
    phoneNumber: formattedPhone,
    amountHTG: plan.priceHTG,
    planDuration: plan.duration,
    subscriptionTier: plan.tier,
    purchaseDate: purchaseDateISO,
    purchaseDateFormatted,
    endDate: endDateISO,
    endDateFormatted,
    status: 'active',
  };

  // 1. Update the exact user in users/{userId}
  const userRef = doc(db, 'users', userDocId);
  await updateDoc(userRef, {
    subscriptionTier: plan.tier,
    paymentMethod,
    paymentPhone: formattedPhone,
    subscriptionStartDate: purchaseDateISO,
    subscriptionEndDate: endDateISO,
    subscriptionDetails,
  });

  // 2. Record the transaction in the `transactions` collection
  try {
    await addDoc(collection(db, 'transactions'), {
      transactionId,
      userId: userDocId,
      userEmail: userEmail.trim().toLowerCase(),
      amount: plan.priceHTG,
      currency: 'HTG',
      paymentMethod,
      phoneNumber: formattedPhone,
      planId: plan.id,
      subscriptionTier: plan.tier,
      status: 'SUCCESS',
      createdAt: purchaseDateISO,
    });
  } catch (e) {
    console.warn('Notice recording to transactions collection:', e);
  }

  return { subscriptionDetails, transactionId };
}
