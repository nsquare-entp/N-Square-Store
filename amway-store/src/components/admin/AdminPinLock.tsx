'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface AdminPinLockProps {
  onUnlock: () => void;
}

export default function AdminPinLock({ onUnlock }: AdminPinLockProps) {
  const [pin, setPin] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [shake, setShake] = useState<boolean>(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  // When all 4 digits entered, automatically verify
  useEffect(() => {
    const fullPin = pin.join('');
    if (fullPin.length === 4) {
      verifyPin(fullPin);
    }
  }, [pin]);

  const verifyPin = async (candidatePin: string) => {
    setIsVerifying(true);
    setError('');
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: candidatePin }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Store session token in sessionStorage
        if (data.token) {
          sessionStorage.setItem('nsquare_admin_token', data.token);
        }
        onUnlock();
      } else {
        triggerError(data.error || 'Incorrect 4-digit PIN. Access denied.');
      }
    } catch (err) {
      triggerError('Network error verifying PIN. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
    setPin(['', '', '', '']);
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 100);
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digit
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newPin = [...pin];
      newPin[index] = '';
      setPin(newPin);
      return;
    }

    // Single digit or paste
    if (cleaned.length === 1) {
      const newPin = [...pin];
      newPin[index] = cleaned;
      setPin(newPin);
      setError('');
      if (index < 3) {
        inputRefs[index + 1].current?.focus();
      }
    } else if (cleaned.length === 4) {
      // Pasted 4 digits
      const newPin = cleaned.split('').slice(0, 4);
      setPin(newPin);
      inputRefs[3].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (isVerifying) return;
    setError('');
    const firstEmptyIndex = pin.findIndex((d) => d === '');
    if (firstEmptyIndex !== -1) {
      const newPin = [...pin];
      newPin[firstEmptyIndex] = digit;
      setPin(newPin);
      if (firstEmptyIndex < 3) {
        inputRefs[firstEmptyIndex + 1].current?.focus();
      }
    }
  };

  const handleKeypadBackspace = () => {
    if (isVerifying) return;
    setError('');
    const lastFilledIndex = [...pin].reverse().findIndex((d) => d !== '');
    if (lastFilledIndex !== -1) {
      const actualIndex = 3 - lastFilledIndex;
      const newPin = [...pin];
      newPin[actualIndex] = '';
      setPin(newPin);
      inputRefs[actualIndex].current?.focus();
    }
  };

  const handleClear = () => {
    setPin(['', '', '', '']);
    setError('');
    inputRefs[0].current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-950 flex flex-col items-center justify-center p-4 select-none">
      <div
        className={`w-full max-w-sm bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 transition-transform ${
          shake ? 'animate-shake' : ''
        }`}
      >
        {/* Lock Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-teal-800 text-white flex items-center justify-center text-2xl mx-auto shadow-lg shadow-teal-900/30">
            🔒
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin Command Center</h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Restricted administrative access. Enter your 4-digit PIN to authenticate.
          </p>
        </div>

        {/* 4 Digit Boxes */}
        <div className="flex justify-center gap-3 sm:gap-4 mb-4">
          {pin.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={isVerifying}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black rounded-2xl border-2 transition-all outline-none font-mono ${
                digit
                  ? 'border-teal-700 bg-teal-50/50 text-teal-950 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 focus:border-teal-600 focus:bg-white'
              } ${error ? 'border-rose-400 bg-rose-50/30' : ''}`}
            />
          ))}
        </div>

        {/* Error / Loading Feedback */}
        <div className="min-h-[24px] text-center mb-4">
          {isVerifying ? (
            <span className="text-xs text-teal-700 font-bold flex items-center justify-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              Verifying PIN credentials...
            </span>
          ) : error ? (
            <span className="text-xs text-rose-600 font-bold block">{error}</span>
          ) : (
            <span className="text-[11px] text-slate-400 block">Default master PIN: 1234 (changeable in admin)</span>
          )}
        </div>

        {/* On-Screen Touch Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isVerifying}
              onClick={() => handleKeypadPress(num)}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-teal-700 active:text-white text-slate-900 font-bold text-lg font-mono transition-colors shadow-2xs flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleKeypadPress('0')}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-teal-700 active:text-white text-slate-900 font-bold text-lg font-mono transition-colors shadow-2xs flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleKeypadBackspace}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-base font-bold transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Backspace"
          >
            ⌫
          </button>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center gap-1"
          >
            <span>←</span>
            <span>Return to N-Square Store</span>
          </Link>
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

