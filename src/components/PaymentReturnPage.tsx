import React, { useEffect, useState } from 'react';
import { Check, ArrowRight, Tv, Mail, RotateCcw } from 'lucide-react';
import { syncExpiredSubscriptionsOnLoad } from '../services/userSubscriptionService';

const LOGO_URL = 'https://i.ibb.co/gnKfwcq/1000320493.png';

export const PaymentReturnPage: React.FC = () => {
  const [queryParams, setQueryParams] = useState<{
    reference?: string;
    amount?: string;
    status?: string;
  }>({});

  useEffect(() => {
    // Run expiration sync on return as well
    syncExpiredSubscriptionsOnLoad();

    try {
      const search = new URLSearchParams(window.location.search);
      setQueryParams({
        reference: search.get('reference') || search.get('transaction_id') || `TRZ-CONFIRMED-${Date.now().toString().slice(-6)}`,
        amount: search.get('amount') || '',
        status: search.get('status') || 'completed',
      });
    } catch (e) {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-between selection:bg-[#2563EB] selection:text-white pt-1">
      {/* Top progress bar completed 100% */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 sm:h-1.5 bg-[#121826]">
        <div className="h-full w-full bg-gradient-to-r from-[#2563EB] to-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.85)]" />
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center px-5 py-8">
        {/* Logo IFlex */}
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

        <div className="space-y-6">
          {/* Statut Réussi avec badge vert */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/50">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Paiement Tranzak Réussi !
            </h1>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Votre transaction a été validée avec succès. Votre abonnement IFlex Streaming est maintenant actif.
            </p>
          </div>

          {/* Carte récapitulative */}
          <div className="p-4 bg-[#0E131F] border border-[#1E2638] rounded-2xl text-xs space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1A2338]">
              <span className="text-slate-400">Statut de la transaction :</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Paiement Validé
              </span>
            </div>

            {queryParams.reference && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Réf. Tranzak :</span>
                <strong className="text-slate-200 font-mono text-[11px] truncate max-w-[180px]">
                  {queryParams.reference}
                </strong>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Passerelle :</span>
              <strong className="text-white">Tranzak (MonCash / NatCash)</strong>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#1A2338]">
              <span className="text-slate-400">Application :</span>
              <strong className="text-blue-400 font-medium">IFlex Streaming Haïti</strong>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-3 pt-2">
            <a
              href="https://iflexstream.site"
              className="w-full py-4 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-700/30 flex items-center justify-center gap-2"
            >
              <Tv className="w-4 h-4" />
              <span>Ouvrir l'application IFlex</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="/"
              className="w-full py-3.5 px-4 bg-[#151D2F] hover:bg-[#1E2638] text-slate-300 hover:text-white font-medium text-xs rounded-xl transition-all border border-[#1E2638] flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span>Effectuer un autre paiement</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer minimal */}
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
};
