import React from 'react';
import { X, ArrowRight, RotateCcw, Mail, AlertCircle } from 'lucide-react';

const LOGO_URL = 'https://i.ibb.co/gnKfwcq/1000320493.png';

export const PaymentCancelPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col justify-between selection:bg-[#2563EB] selection:text-white pt-1">
      {/* Top progress bar indicating cancelled state */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 sm:h-1.5 bg-[#121826]">
        <div className="h-full w-full bg-gradient-to-r from-red-600 to-amber-500 shadow-[0_0_12px_rgba(239,68,68,0.85)]" />
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
          {/* Statut Annulé avec badge ambre/rouge */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 shadow-lg shadow-red-950/50">
              <X className="w-7 h-7 stroke-[3]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Paiement Annulé
            </h1>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              La transaction a été interrompue ou n'a pas été confirmée. Aucun montant n'a été débité de ton compte MonCash ou NatCash.
            </p>
          </div>

          {/* Carte d'information */}
          <div className="p-4 bg-[#0E131F] border border-[#1E2638] rounded-2xl text-xs space-y-2.5">
            <div className="flex items-start gap-2.5 text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <p className="leading-relaxed">
                Tu peux relancer la demande à tout moment en vérifiant le code secret de ton portefeuille mobile.
              </p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-3 pt-2">
            <a
              href="/"
              className="w-full py-4 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-blue-700/30 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Réessayer le paiement</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="mailto:iflextv.film@gmail.com"
              className="w-full py-3.5 px-4 bg-[#151D2F] hover:bg-[#1E2638] text-slate-300 hover:text-white font-medium text-xs rounded-xl transition-all border border-[#1E2638] flex items-center justify-center gap-2"
            >
              <Mail className="w-3.5 h-3.5 text-blue-400" />
              <span>Besoin d'aide ? Contacter le support</span>
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
