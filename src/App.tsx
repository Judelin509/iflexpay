import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ShieldCheck,
  CheckCircle2,
  Mail,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { PLANS, PlanId, PaymentMethod } from './types/payment';

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
  // Screen steps: 1 = Choix du plan, 2 = Numéro de téléphone, 3 = Choix MonCash/NatCash, 4 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('1semaine');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('moncash');
  const [phoneError, setPhoneError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activationCode, setActivationCode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isShockwave, setIsShockwave] = useState<boolean>(false);

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1];

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

  const handleValidatePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 8) {
      setPhoneError('Veuillez entrer un numéro haïtien valide à 8 chiffres.');
      return;
    }
    setStep(3);
  };

  const handleConfirmPayment = () => {
    setIsShockwave(true);
    setIsProcessing(true);
    setTimeout(() => {
      const codePart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const codePart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      setActivationCode(`IFX-${codePart1}-${codePart2}`);
      setIsProcessing(false);
      setIsShockwave(false);
      setStep(4);
    }, 850);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestart = () => {
    setPhoneNumber('');
    setPhoneError('');
    setStep(1);
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
                            Abonnement
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
            {/* ÉCRAN 2 : ENTRER TON NUMÉRO DE TÉLÉPHONE                    */}
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
                  onSubmit={handleValidatePhone}
                  className="space-y-6 flex flex-col justify-center"
                >
                  {/* Forfait sélectionné */}
                  <div className="p-3.5 rounded-xl bg-[#0E131F] border border-[#1E2638] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                        Plan sélectionné
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
                      Entre ton numéro de téléphone
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Numéro MonCash ou NatCash pour recevoir la demande
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center bg-[#0E131F] border border-[#2563EB] rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 shadow-md">
                      <span className="px-4 py-4 text-sm font-mono font-bold text-white bg-[#151D2F] border-r border-[#1E2638] select-none">
                        +509
                      </span>
                      <input
                        type="tel"
                        autoFocus
                        value={formatPhone(phoneNumber)}
                        onChange={handlePhoneInput}
                        placeholder="3712-4589"
                        className="w-full px-4 py-4 bg-transparent text-white font-mono text-lg font-bold placeholder-slate-600 focus:outline-none tracking-wider"
                        required
                      />
                    </div>

                    {phoneError && (
                      <p className="text-xs text-red-400 mt-2 text-center font-medium">
                        {phoneError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white font-bold text-base rounded-2xl transition-all shadow-lg shadow-blue-700/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continuer</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* ========================================================== */}
            {/* ÉCRAN 3 : CHOISIR MONCASH OU NATCASH                        */}
            {/* ========================================================== */}
            {step === 3 && (
              <motion.div
                key="step-3"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="space-y-6 flex flex-col justify-center"
              >
                {/* Récapitulatif rapide */}
                <div className="p-3.5 rounded-xl bg-[#0E131F] border border-[#1E2638] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Forfait :</span>{' '}
                    <strong className="text-white">{selectedPlan.duration}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Numéro :</span>{' '}
                    <strong className="text-white font-mono">+509 {formatPhone(phoneNumber)}</strong>
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Choisis ton moyen de paiement
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Sélectionne MonCash ou NatCash pour payer
                  </p>
                </div>

                {/* Options MonCash / NatCash */}
                <div className="space-y-3.5">
                  {/* Option MonCash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('moncash')}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      paymentMethod === 'moncash'
                        ? 'bg-[#131D36] border-[#2563EB] ring-1 ring-blue-500 shadow-lg shadow-blue-900/30'
                        : 'bg-[#0E131F] border-[#1E2638] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center font-bold text-red-400 text-sm">
                        MC
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">MonCash</div>
                        <div className="text-xs text-slate-400">Digicel Haïti (*202#)</div>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentMethod === 'moncash'
                          ? 'border-[#2563EB] bg-[#2563EB]'
                          : 'border-slate-600'
                      }`}
                    >
                      {paymentMethod === 'moncash' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  </button>

                  {/* Option NatCash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('natcash')}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      paymentMethod === 'natcash'
                        ? 'bg-[#131D36] border-[#2563EB] ring-1 ring-blue-500 shadow-lg shadow-blue-900/30'
                        : 'bg-[#0E131F] border-[#1E2638] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center font-bold text-blue-400 text-sm">
                        NC
                      </div>
                      <div>
                        <div className="text-base font-bold text-white">NatCash</div>
                        <div className="text-xs text-slate-400">Natcom Haïti (*101#)</div>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                        paymentMethod === 'natcash'
                          ? 'border-[#2563EB] bg-[#2563EB]'
                          : 'border-slate-600'
                      }`}
                    >
                      {paymentMethod === 'natcash' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Bouton de confirmation avec effet de validation onde de choc / éclat */}
                <div className="relative mt-4">
                  {/* Anneaux d'onde de choc extérieurs lors du clic */}
                  {isShockwave && (
                    <>
                      <motion.span
                        className="absolute -inset-1 rounded-2xl border-2 border-[#60A5FA] pointer-events-none z-10"
                        initial={{ scale: 1, opacity: 0.95 }}
                        animate={{ scale: 1.18, opacity: 0 }}
                        transition={{ duration: 0.75, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.1 }}
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
                    disabled={isProcessing}
                    onClick={handleConfirmPayment}
                    animate={isShockwave ? { scale: [1, 0.97, 1.02, 1] } : {}}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className={`relative overflow-hidden w-full py-4 px-6 font-bold text-base rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                      isProcessing
                        ? 'bg-[#1D4ED8] shadow-blue-500/50 ring-2 ring-blue-400 text-white'
                        : 'bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-white shadow-blue-700/30'
                    }`}
                  >
                    {/* Éclat lumineux traversant le bouton (balayage flash) */}
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
                        <span className="tracking-wide">Envoi de la demande en cours...</span>
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
                className="space-y-6 flex flex-col justify-center"
              >
                <div className="text-center">
                  <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Paiement en cours de validation
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                    Valide la transaction de{' '}
                    <strong className="text-white">{selectedPlan.priceHTG} Gourdes</strong>{' '}
                    sur ton téléphone{' '}
                    <span className="font-mono text-blue-400">
                      +509 {formatPhone(phoneNumber)}
                    </span>{' '}
                    via{' '}
                    <strong className="text-white capitalize">{paymentMethod}</strong>.
                  </p>
                </div>

                {/* Code d'activation */}
                <div className="p-4 bg-[#0E131F] border border-[#2563EB] rounded-2xl text-center space-y-2 shadow-lg">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                    Ton Code d'Activation IFlex
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-widest text-white">
                    {activationCode}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B253D] hover:bg-[#2563EB] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-white"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié !' : 'Copier le code'}</span>
                  </button>
                </div>

                <div className="p-3 bg-[#0E131F] border border-[#1E2638] rounded-xl text-xs space-y-1.5 text-slate-400">
                  <div className="flex justify-between">
                    <span>Abonnement :</span>
                    <strong className="text-white">{selectedPlan.duration}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Montant :</span>
                    <strong className="text-white font-mono">{selectedPlan.priceHTG} Gourdes</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Moyen :</span>
                    <strong className="text-white uppercase">{paymentMethod}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-3 px-4 bg-[#151D2F] hover:bg-[#1E293B] text-slate-300 hover:text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
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
        <div>
          © 2026 IFlex Stream. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
}
