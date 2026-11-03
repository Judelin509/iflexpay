import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAo0gz2fAdykNE9ZhVNJNLQn0GKm_W9ARk",
  authDomain: "master-airline-g2w8r.firebaseapp.com",
  projectId: "master-airline-g2w8r",
  storageBucket: "master-airline-g2w8r.firebasestorage.app",
  messagingSenderId: "769686036332",
  appId: "1:769686036332:web:31c98bb87f5eb6aafe5d49"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const WEBHOOK_SECRET = 'whsec_f9071e419e543adab15b8571328daf1d708a42c456fd6de15eb6883ad852e5db';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const signature = req.headers['x-tranzak-signature'] || req.headers['x-signature'] || '';

    // Verify webhook signature if provided
    if (signature && WEBHOOK_SECRET) {
      const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
      if (signature !== hmac && signature !== `sha256=${hmac}`) {
        console.warn('Invalid Tranzak webhook signature');
      }
    }

    const payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody || '{}');
    const { status, reference, amount, payment_method, customer_email, transaction_id } = payload?.data || payload || {};

    const isSuccess = status === 'completed' || status === 'SUCCESSFUL' || status === 'SUCCESS' || payload.event === 'payment.collection.completed';

    if (isSuccess && customer_email) {
      const cleanEmail = customer_email.trim().toLowerCase();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const userDoc = snap.docs[0];
        const numAmount = Number(amount) || 500;
        
        let planTier = 'vip_1week';
        let planDays = 7;
        let planLabel = '1 Semaine';
        if (numAmount <= 100) {
          planTier = 'vip_1day';
          planDays = 1;
          planLabel = '1 Jour';
        } else if (numAmount >= 1500) {
          planTier = 'vip_1month';
          planDays = 30;
          planLabel = '1 Mois';
        }

        const now = new Date();
        const endDate = new Date(now.getTime() + planDays * 24 * 60 * 60 * 1000);

        // Update exact user document
        await updateDoc(doc(db, 'users', userDoc.id), {
          subscriptionTier: planTier,
          paymentMethod: payment_method || 'moncash',
          subscriptionStartDate: now.toISOString(),
          subscriptionEndDate: endDate.toISOString(),
          subscriptionDetails: {
            paymentMethod: payment_method || 'moncash',
            amountHTG: numAmount,
            planDuration: planLabel,
            subscriptionTier: planTier,
            purchaseDate: now.toISOString(),
            endDate: endDate.toISOString(),
            status: 'active'
          }
        });

        // Record in transactions collection
        await addDoc(collection(db, 'transactions'), {
          transactionId: transaction_id || reference || `TRZ-${Date.now()}`,
          userId: userDoc.id,
          userEmail: cleanEmail,
          amount: numAmount,
          currency: 'HTG',
          paymentMethod: payment_method || 'moncash',
          status: 'SUCCESS',
          createdAt: now.toISOString()
        });
      }
    }

    return res.status(200).json({ received: true, status: 'processed' });
  } catch (err: any) {
    console.error('Error processing Tranzak webhook:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err?.message });
  }
}
