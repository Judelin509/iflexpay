import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  Mail,
  RotateCcw,
  Loader2,
  X,
  UserCheck
} from 'lucide-react';
import {
  PLANS,
  PlanId,
  PaymentMethod,
  IFlexUser,
  IFlexUserSubscriptionDetails,
} from './types/payment';
import {
  syncExpiredSubscriptionsOnLoad,
  findUserByEmail,
  activateUserSubscription,
} from './services/userSubscriptionService';
import { PaymentReturnPage } from './components/PaymentReturnPage';
import { PaymentCancelPage } from './components/PaymentCancelPage';

const LOGO_URL = 'https://i.ibb.co/gnKfwcq/1000320493.png';

// Motion variants for smooth opacity transition between steps
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  duration: 0.22,
  ease: 'easeInOut' as const,
};

export default function App() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  // Dedicated page for Redirect URL (Success): /payment/return
  if (pathname.includes('/payment/return')) {
    return <PaymentReturnPage />;
  }

  // Dedicated page for Cancel URL: /payment/cancel
  if (pathname.includes('/payment/cancel')) {
    return <PaymentCancelPage />;
  }

  // Screen steps:
  // 1 = Choix du plan
  // 2 = Adresse Email (vérification dans Firestore `users`)
  // 3 = Choix MonCash/NatCash & Numéro
  // 4 = Confirmation & Détails de l'abonnement activé
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('1semaine');
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false);
  const [matchedUser, setMatchedUser] = useState<IFlexUser | null>(null);

  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('moncash');
  const [phoneError, setPhoneError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isShockwave, setIsShockwave] = useState<boolean>(false);
  const [activatedDetails, setActivatedDetails] =
    useState<IFlexUserSubscriptionDetails | null>(null);
  const [tranzakTxId, setTranzakTxId] = useState<string>('');

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1];

  // Dès que le site s'ouvre, on met à jour tous les abonnements expirés dans Firestore `users` -> 'free'
  useEffect(() => {
    syncExpiredSubscriptionsOnLoad();
  }, []);

  // Helper email validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  // Helper to format 8 digits as XXXX-XXXX
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 4) return raw;
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  };

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    setPhoneNumber(raw);
    setPhoneError('');

    // Auto-detect carrier prefix
    if (raw.length >= 2) {
      const prefix = raw.slice(0, 2);
      const natcomPrefixes = ['32', '33', '35', '40', '41', '42', '43'];
      if (natcomPrefixes.includes(prefix)) {
        setPaymentMethod('natcash');
      } else {
        setPaymentMethod('moncash');
      }
    }
  };

  const handleSelectPlan = (planId: PlanId) => {
    setSelectedPlanId(planId);
    setStep(2);
  };

  // Étape 2 : Vérifier l'email dans la collection Firestore `users`
  const handleValidateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) {
      setEmailError('Veuillez entrer une adresse email valide.');
      return;
    }

    setEmailError('');
    setIsCheckingEmail(true);

    try {
      const userDoc = await findUserByEmail(email);

      if (!userDoc) {
        setEmailError(
          "Aucun compte IFlex trouvé avec cet email. Vérifie l'adresse email de ton compte IFlex."
        );
        setIsCheckingEmail(false);
        return;
      }

      if (userDoc.status === 'suspended') {
        setEmailError(
          'Ce compte IFlex est actuellement suspendu. Contacte le support iflextv.film@gmail.com.'
        );
        setIsCheckingEmail(false);
        return;
      }

      setMatchedUser(userDoc);
      setIsCheckingEmail(false);
      setStep(3);
    } catch (error) {
      console.error('Erreur lors de la vérification du compte:', error);
      setEmailError(
        'Impossible de vérifier le compte dans Firestore. Vérifie ta connexion ou les règles Firestore.'
      );
      setIsCheckingEmail(false);
    }
  };

  // Étape 3 : Payer et mettre à jour le document exact `users/{userId}` dans Firestore
  const handleConfirmPayment = async () => {
    if (phoneNumber.length !== 8) {
      setPhoneError('Veuillez entrer un numéro haïtien valide à 8 chiffres.');
      return;
    }

    if (!matchedUser) {
      setStep(2);
      return;
    }

    setIsShockwave(true);
    setIsProcessing(true);
    setPhoneError('');

    try {
      const formattedPhone = `+509 ${formatPhone(phoneNumber)}`;
      const { subscriptionDetails: subDetails, transactionId } =
        await activateUserSubscription({
          userDocId: matchedUser.docId,
          userEmail: matchedUser.email,
          plan: selectedPlan,
          paymentMethod,
          formattedPhone,
        });

      setTranzakTxId(transactionId);
      setActivatedDetails(subDetails);
      setMatchedUser((prev) =>
        prev
          ? {
              ...prev,
              subscriptionTier: selectedPlan.tier,
              paymentMethod,
              paymentPhone: formattedPhone,
              subscriptionStartDate: subDetails.purchaseDate,
              subscriptionEndDate: subDetails.endDate,
              subscriptionDetails: subDetails,
            }
          : null
      );

      // Attempt Tranzak online gateway creation
      try {
        const tranzakRes = await fetch('/api/payments/tranzak/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedPlan.priceHTG,
            currency: 'HTG',
            payment_method: paymentMethod,
            phone: formattedPhone,
            customer_email: matchedUser.email,
            reference: transactionId,
          }),
        });
        const tranzakData = await tranzakRes.json();
        if (tranzakData?.paymentUrl) {
          window.location.href = tranzakData.paymentUrl;
          return;
        }
      } catch (e) {
        console.warn('Tranzak create call notice:', e);
      }

      setTimeout(() => {
        setIsProcessing(false);
        setIsShockwave(false);
        setStep(4);
      }, 650);
    } catch (err) {
      console.error('Erreur mise à jour abonnement Firestore:', err);
      setIsProcessing(false);
      setIsShockwave(false);
      setPhoneError(
        "Erreur lors de l'activation sur Firestore. Vérifie les autorisations de la collection users."
      );
    }
  };

  const handleRestart = () => {
    setEmail('');
    setEmailError('');
    setMatchedUser(null);
    setActivatedDetails(null);
    setPhoneNumber('');
    setPhoneError('');
    setStep(1);
    syncExpiredSubscriptionsOnLoad();
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-between selection:bg-[#2563EB] selection:text-white pt-1">
      {/* BARRE DE PROGRESSION VISUELLE FIXE EN HAUT DE L'ÉCRAN */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 sm:h-1.5 bg-[#121826]">
        <motion.div
          className="h-full bg-gradient-to-r from-[#2563EB] to-[#60A5FA] shadow-[0_0_12px_rgba(37,99,235,0.85)]"
          initial={{ width: '25%' }}
          animate={{ width: `${(step / 4) * 100}%` }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </div>

      {/* Mobile container centered on screen */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col px-5 py-6 sm:py-8">
        {/* Navigation Bar / Header */}
        <div className="flex items-center justify-between min-h-[44px] mb-6">
          {step > 1 && step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              className="p-2 -ml-2 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-sm font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour</span>
            </button>
          ) : (
            <div />
          )}

          {/* Step indicator */}
          <div className="text-xs font-mono tracking-wider text-slate-400">
            {step === 1 && 'Étape 1 sur 4'}
            {step === 2 && 'Étape 2 sur 4'}
            {step === 3 && 'Étape 3 sur 4'}
            {step === 4 && 'Étape 4 sur 4 · Validé'}
          </div>
        </div>

        {/* LOGO IFLEX EN HAUT DES PLANS */}
        <div className="flex flex-col items-center justify-center mb-6">
          <img
            src={LOGO_URL}
            alt="IFlex Logo"
            referrerPolicy="no-referrer"
            className="h-16 w-auto object-contain max-w-[200px] drop-shadow-md"
          />
          <span className="text-xs text-blue-400 font-mono tracking-widest mt-2 uppercase">
            paye.iflexstream.site
          </span>
        </div>

        {/* TRANSITION D'OPACITÉ FLUIDE ENTRE LES ÉTAPES */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {/* ========================================================== */}
            {/* ÉCRAN 1 : CHOISIR TON ABONNEMENT IFLEX (LES 3 PLANS)       */}
            {/* ========================================================== */}
            {step === 1 && (
              <motion.div
                key="step-1"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="space-y-4 flex flex-col justify-center"
              >
                <div className="text-center mb-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Choisir ton abonnement IFlex
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Sélectionne le plan de ton choix pour continuer
                  </p>
                </div>

                <div className="space-y-3.5">
                  {PLANS.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => handleSelectPlan(plan.id)}
                        className={`w-full p-5 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#131D36] border-[#2563EB] shadow-lg shadow-blue-900/30 ring-1 ring-[#3B82F6]'
                            : 'bg-[#0E131F] border-[#1E2638] hover:border-slate-600'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                            Abonnement · {plan.tier}
                          </div>
                          <div className="text-lg font-bold text-white mt-0.5">
                            {plan.duration}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-2xl font-extrabold text-white font-mono">
                              {plan.priceHTG}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              Gourdes
                            </div>
                          </div>
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#2563EB] text-white'
                                : 'bg-[#182033] text-slate-400'
                            }`}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ========================================================== */}
            {/* ÉCRAN 2 : ENTRER TON ADRESSE EMAIL (VÉRIFICATION USERS)    */}
            {/* ========================================================== */}
            {step === 2 && (
              <motion.div
                key="step-2"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <form
                  onSubmit={handleValidateEmail}
                  className="space-y-6 flex flex-col justify-center"
                >
                  {/* Forfait sélectionné */}
                  <div className="p-3.5 rounded-xl bg-[#0E131F] border border-[#1E2638] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                        Plan sélectionné ({selectedPlan.tier})
                      </div>
                      <div className="text-sm font-bold text-white">
                        {selectedPlan.duration}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-blue-400">
                        {selectedPlan.priceHTG} Gourdes
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                      Entre ton adresse email
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      L'email de ton compte utilisateur sur l'application IFlex
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div
                      className={`flex items-center bg-[#0E131F] border rounded-2xl overflow-hidden transition-all shadow-md ${
                        isEmailValid
                          ? 'border-emerald-500/80 ring-2 ring-emerald-500/30'
                          : email.trim().length > 0
                          ? 'border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/30'
                          : 'border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-500'
                      }`}
                    >
                      <span className="px-4 py-4 text-slate-400 bg-[#151D2F] border-r border-[#1E2638] select-none flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-400" />
                      </span>
                      <input
                        type="email"
                        autoFocus
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError('');
                        }}
                        placeholder="tonemail@gmail.com"
                        className="w-full px-4 py-4 bg-transparent text-white text-base font-medium placeholder-slate-600 focus:outline-none"
                        required
                      />

                      {/* Indicateur visuel temps réel email (check / croix) */}
                      <div className="pr-4 pl-2 shrink-0 flex items-center">
                        {isEmailValid ? (
                          <motion.div
                            key="valid-email"
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400"
                            title="Format email valide"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </motion.div>
                        ) : email.trim().length > 0 ? (
                          <motion.div
                            key="invalid-email"
                            initial={{ scale: 0.4, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400"
                            title="Format email incomplet"
                          >
                            <X className="w-4 h-4 stroke-[2.5]" />
                          </motion.div>
                        ) : null}
                      </div>
                    </div>

                    {/* État de conformité email */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span
                        className={
                          isEmailValid
                            ? 'text-emerald-400 font-medium'
                            : email.trim().length > 0
                            ? 'text-slate-400'
                            : 'text-slate-500'
                        }
                      >
                        {isEmailValid
                          ? 'Format valide · Vérification du compte IFlex au clic'
                          : email.trim().length > 0
                          ? 'Saisie de l’email en cours'
                          : 'Exemple : utilisateur@gmail.com'}
                      </span>
                    </div>

                    {emailError && (
                      <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300 text-center font-medium">
                        {emailError}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!isEmailValid || isCheckingEmail}
                    className={`w-full py-4 px-6 font-bold text-base rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                      isEmailValid && !isCheckingEmail
                        ? 'bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white shadow-blue-700/30'
                        : 'bg-[#151D2F] text-slate-500 border border-[#1E2638] cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isCheckingEmail ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                        <span>Recherche du compte IFlex...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuer vers le paiement</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ========================================================== */}
            {/* ÉCRAN 3 : CHOISIR MONCASH OU NATCASH & NUMÉRO               */}
            {/* ========================================================== */}
            {step === 3 && (
              <motion.div
                key="step-3"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="space-y-5 flex flex-col justify-center"
              >
                {/* Compte trouvé dans Firestore + Plan */}
                <div className="p-3.5 rounded-xl bg-[#0E131F] border border-[#1E2638] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Compte IFlex vérifié :</span>
                    </span>
                    <strong className="text-emerald-400 font-mono truncate max-w-[180px]">
                      {matchedUser?.displayName || matchedUser?.email}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-[#182033]">
                    <div>
                      <span className="text-slate-400">Activation :</span>{' '}
                      <strong className="text-white">
                        {selectedPlan.duration} ({selectedPlan.tier})
                      </strong>
                    </div>
                    <strong className="text-blue-400 font-mono">
                      {selectedPlan.priceHTG} HTG
                    </strong>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Choisis ton moyen de paiement
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Sélectionne MonCash ou NatCash et entre ton numéro
                  </p>
                </div>

                {/* Options MonCash / NatCash */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Option MonCash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('moncash')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'moncash'
                        ? 'bg-[#131D36] border-[#2563EB] ring-1 ring-blue-500 shadow-md shadow-blue-900/30'
                        : 'bg-[#0E131F] border-[#1E2638] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center font-bold text-red-400 text-xs">
                        MC
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          paymentMethod === 'moncash'
                            ? 'border-[#2563EB] bg-[#2563EB]'
                            : 'border-slate-600'
                        }`}
                      >
                        {paymentMethod === 'moncash' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">MonCash</div>
                      <div className="text-[11px] text-slate-400">Digicel (*202#)</div>
                    </div>
                  </button>

                  {/* Option NatCash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('natcash')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'natcash'
                        ? 'bg-[#131D36] border-[#2563EB] ring-1 ring-blue-500 shadow-md shadow-blue-900/30'
                        : 'bg-[#0E131F] border-[#1E2638] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-bold text-blue-400 text-xs">
                        NC
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          paymentMethod === 'natcash'
                            ? 'border-[#2563EB] bg-[#2563EB]'
                            : 'border-slate-600'
                        }`}
                      >
                        {paymentMethod === 'natcash' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">NatCash</div>
                      <div className="text-[11px] text-slate-400">Natcom (*101#)</div>
                    </div>
                  </button>
                </div>

                {/* Saisie du Numéro MonCash ou NatCash avec validation temps réel */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs px-1">
                    <label className="text-slate-300 font-medium">
                      Numéro{' '}
                      {paymentMethod === 'moncash'
                        ? 'MonCash (Digicel)'
                        : 'NatCash (Natcom)'}
                    </label>
                    <span className="text-slate-400 text-[11px]">
                      8 chiffres haïtiens
                    </span>
                  </div>

                  <div
                    className={`flex items-center bg-[#0E131F] border rounded-2xl overflow-hidden transition-all shadow-md ${
                      phoneNumber.length === 8
                        ? 'border-emerald-500/80 ring-2 ring-emerald-500/30'
                        : phoneNumber.length > 0
                        ? 'border-amber-500/60 focus-within:ring-2 focus-within:ring-amber-500/30'
                        : 'border-[#2563EB] focus-within:ring-2 focus-within:ring-blue-500'
                    }`}
                  >
                    <span className="px-4 py-3.5 text-sm font-mono font-bold text-white bg-[#151D2F] border-r border-[#1E2638] select-none">
                      +509
                    </span>
                    <input
                      type="tel"
                      autoFocus
                      value={formatPhone(phoneNumber)}
                      onChange={handlePhoneInput}
                      placeholder="3712-4589"
                      className="w-full px-4 py-3.5 bg-transparent text-white font-mono text-lg font-bold placeholder-slate-600 focus:outline-none tracking-wider"
                      required
                    />

                    {/* Indicateur visuel temps réel (check / croix) */}
                    <div className="pr-4 pl-2 shrink-0 flex items-center">
                      {phoneNumber.length === 8 ? (
                        <motion.div
                          key="valid-phone"
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400"
                          title="Numéro valide (8 chiffres)"
                        >
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </motion.div>
                      ) : phoneNumber.length > 0 ? (
                        <motion.div
                          key="invalid-phone"
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400"
                          title={`${phoneNumber.length}/8 chiffres`}
                        >
                          <X className="w-4 h-4 stroke-[2.5]" />
                        </motion.div>
                      ) : null}
                    </div>
                  </div>

                  {phoneError && (
                    <p className="text-xs text-red-400 text-center font-medium">
                      {phoneError}
                    </p>
                  )}
                </div>

                {/* Bouton de confirmation avec effet de validation onde de choc / éclat */}
                <div className="relative pt-1">
                  {isShockwave && (
                    <>
                      <motion.span
                        className="absolute -inset-1 rounded-2xl border-2 border-[#60A5FA] pointer-events-none z-10"
                        initial={{ scale: 1, opacity: 0.95 }}
                        animate={{ scale: 1.18, opacity: 0 }}
                        transition={{
                          duration: 0.75,
                          ease: 'easeOut',
                          repeat: Infinity,
                          repeatDelay: 0.1,
                        }}
                      />
                      <motion.span
                        className="absolute -inset-2 rounded-2xl bg-[#3B82F6]/30 blur-md pointer-events-none z-0"
                        initial={{ scale: 0.95, opacity: 0.8 }}
                        animate={{ scale: 1.28, opacity: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </>
                  )}

                  <motion.button
                    type="button"
                    disabled={isProcessing || phoneNumber.length !== 8}
                    onClick={handleConfirmPayment}
                    animate={isShockwave ? { scale: [1, 0.97, 1.02, 1] } : {}}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className={`relative overflow-hidden w-full py-4 px-6 font-bold text-base rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                      phoneNumber.length === 8
                        ? isProcessing
                          ? 'bg-[#1D4ED8] shadow-blue-500/50 ring-2 ring-blue-400 text-white'
                          : 'bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white shadow-blue-700/30'
                        : 'bg-[#151D2F] text-slate-500 border border-[#1E2638] cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isShockwave && (
                      <motion.span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 pointer-events-none"
                        initial={{ x: '-100%' }}
                        animate={{ x: '220%' }}
                        transition={{ duration: 0.7, ease: 'easeInOut' }}
                      />
                    )}

                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-white shrink-0" />
                        <span className="tracking-wide">
                          Envoi de la demande en cours...
                        </span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <span>
                          {`Payer ${selectedPlan.priceHTG} Gourdes avec ${
                            paymentMethod === 'moncash' ? 'MonCash' : 'NatCash'
                          }`}
                        </span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ========================================================== */}
            {/* ÉCRAN 4 : CONFIRMATION DU PAIEMENT                          */}
            {/* ========================================================== */}
            {step === 4 && (
              <motion.div
                key="step-4"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="space-y-5 flex flex-col justify-center"
              >
                {/* Statut Réussi avec petit icône */}
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-md shadow-emerald-950/40">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Paiement réussi
                  </h2>
                  <p className="text-xs text-slate-300">
                    Ton abonnement IFlex est activé avec succès.
                  </p>
                </div>

                {/* Petites infos du compte et de la transaction enregistrées dans users/{userId} */}
                <div className="p-4 bg-[#0E131F] border border-[#1E2638] rounded-2xl text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#1A2338]">
                    <span className="text-slate-400">Statut :</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        Actif ({selectedPlan.tier})
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Compte (Email) :</span>
                    <strong
                      className="text-blue-400 font-mono text-xs truncate max-w-[200px]"
                      title={matchedUser?.email || email}
                    >
                      {matchedUser?.email || email}
                    </strong>
                  </div>

                  {matchedUser?.displayName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Utilisateur :</span>
                      <strong className="text-white">
                        {matchedUser.displayName}
                      </strong>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Abonnement :</span>
                    <strong className="text-white">
                      {selectedPlan.duration} ({selectedPlan.tier})
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Montant :</span>
                    <strong className="text-white font-mono text-sm">
                      {selectedPlan.priceHTG} Gourdes
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Numéro :</span>
                    <strong className="text-white font-mono">
                      +509 {formatPhone(phoneNumber)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Moyen de paiement :</span>
                    <strong className="text-white uppercase font-semibold">
                      {paymentMethod === 'moncash'
                        ? 'MonCash (Digicel)'
                        : 'NatCash (Natcom)'}
                    </strong>
                  </div>

                  {tranzakTxId && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Réf. Tranzak :</span>
                      <strong className="text-slate-300 font-mono text-[11px]">{tranzakTxId}</strong>
                    </div>
                  )}

                  {activatedDetails && (
                    <div className="pt-2.5 border-t border-[#1A2338] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Date d’achat :</span>
                        <strong className="text-slate-200 font-mono text-[11px]">
                          {activatedDetails.purchaseDateFormatted}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Fin d’abonnement :</span>
                        <strong className="text-emerald-400 font-mono text-[11px]">
                          {activatedDetails.endDateFormatted}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bouton pour effectuer un autre paiement */}
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-3.5 px-4 bg-[#151D2F] hover:bg-[#1E2638] text-slate-200 hover:text-white font-medium text-xs rounded-xl transition-all border border-[#1E2638] flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-4 h-4 text-blue-400" />
                  <span>Effectuer un autre paiement</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FOOTER MINIMAL POUR SMARTPHONE */}
      <footer className="w-full border-t border-[#161D2B] bg-[#07090E] py-4 px-4 text-center text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-blue-400" />
          <span>Contact :</span>
          <a
            href="mailto:iflextv.film@gmail.com"
            className="text-slate-300 hover:text-white underline underline-offset-2"
          >
            iflextv.film@gmail.com
          </a>
        </div>
        <div>© 2026 IFlex Stream. Tous droits réservés.</div>
      </footer>
    </div>
  );
}
