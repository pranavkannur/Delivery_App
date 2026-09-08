import React, { useEffect } from 'react';
import { Bell, CheckCircle2, Zap, X } from 'lucide-react';

export interface AlertData {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'alert';
}

interface VisualAlertProps {
  alert: AlertData | null;
  onClose: () => void;
  duration?: number; // default 6000ms
}

export const VisualAlert: React.FC<VisualAlertProps> = ({ 
  alert, 
  onClose, 
  duration = 6000 
}) => {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [alert, duration, onClose]);

  if (!alert) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-[#f8f8f9] border-2 border-black rounded-2xl p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] font-['JetBrains_Mono',monospace] space-y-2 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {alert.type === 'success' && (
              <div className="bg-black text-white p-1.5 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            )}
            {alert.type === 'alert' && (
              <div className="bg-black text-white p-1.5 rounded-lg animate-pulse">
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
            )}
            {(!alert.type || alert.type === 'info') && (
              <div className="bg-black text-white p-1.5 rounded-lg">
                <Bell className="w-4 h-4 text-white" />
              </div>
            )}

            <div>
              <span className="text-xs font-black text-black uppercase tracking-wider block">
                {alert.title}
              </span>
              <span className="text-[10px] text-[#71717a] uppercase font-bold">
                REAL-TIME ALERT
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-black hover:bg-[#e4e4e7] p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#27272a] font-medium leading-relaxed">
          {alert.message}
        </p>

        {/* Auto-Dismiss Countdown Bar */}
        <div className="w-full bg-[#e4e4e7] h-1 rounded-full overflow-hidden mt-2">
          <div 
            className="bg-black h-full rounded-full transition-all ease-linear"
            style={{ 
              animation: `shrink ${duration}ms linear forwards` 
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};