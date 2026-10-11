import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, X } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  correctPin?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  correctPin = '123456789'
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setShowPin(false);
      // Auto-focus input when modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === correctPin) {
      setError(null);
      onSuccess();
    } else {
      setError('PIN salah. Silakan periksa dan coba lagi.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#010409]/85 backdrop-blur-md transition-all duration-200"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
    >
      <div
        className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl transition-all duration-200 ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        {/* Header with Close button */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 id="pin-modal-title" className="text-base font-bold text-[#f8fafc]">
                Akses Terproteksi
              </h3>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Expense Tracker
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#334155]/50 transition"
            title="Batal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational description */}
        <p className="text-xs text-[#94a3b8] mb-5 leading-relaxed">
          Halaman data pengeluaran operasional diproteksi dengan kode PIN keamanan. Masukkan PIN untuk membuka akses.
        </p>

        {/* PIN Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="pin-input" className="text-xs font-semibold text-[#cbd5e1] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              Kode PIN Keamanan
            </label>
            <div className="relative">
              <input
                id="pin-input"
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={20}
                placeholder="Masukkan PIN"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full bg-[#0f172a] border rounded-xl px-4 py-3 text-sm text-[#f1f5f9] tracking-widest placeholder:tracking-normal placeholder:text-[#475569] focus:outline-none transition ${
                  error
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-[#334155] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#cbd5e1] p-1 transition"
                title={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn text-xs py-2 px-4 text-[#94a3b8] hover:text-[#f8fafc] border-[#334155] hover:bg-[#334155]/40"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pin.length === 0}
              className="btn btn-primary text-xs py-2 px-5 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              Buka Akses
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
