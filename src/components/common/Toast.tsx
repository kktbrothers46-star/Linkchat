import React from 'react';
import { AlertCircle, CheckCircle2, Info, Send, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Toast: React.FC = () => {
  const { toast, dismissToast } = useApp();

  if (!toast) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-in fade-in slide-in-from-top duration-200">
      <div className="bg-[#20221D] text-white p-3.5 rounded-2xl shadow-xl flex items-start space-x-3 border border-white/10">
        <div className="flex-none mt-0.5">
          {toast.type === 'broadcast' ? (
            <div className="w-7 h-7 rounded-full bg-[#CDEB5A] text-[#20221D] flex items-center justify-center">
              <Send className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          ) : toast.type === 'success' ? (
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
          ) : toast.type === 'error' ? (
            <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center">
              <Info className="w-4 h-4 stroke-[2.5]" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold tracking-tight text-white">{toast.title}</p>
          <p className="text-xs text-white/80 mt-0.5 leading-snug line-clamp-2">{toast.message}</p>
        </div>

        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss notification"
          className="text-white/50 hover:text-white flex-none p-1 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
