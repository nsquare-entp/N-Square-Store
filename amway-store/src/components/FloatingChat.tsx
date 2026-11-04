'use client';
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { SOCIAL_LINKS, getWhatsAppContactUrl } from '../config/social';

const QUICK_QUESTIONS = [
  'Recommend a daily multivitamin for energy & wellness',
  'What is the best protein powder for daily fitness?',
  'Help me choose wellness and personal care products',
  'Inquire about Direct Selling Discounts & delivery time',
];

export default function FloatingChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  // Do not render the customer concierge widget on admin screens or full-screen gallery
  if (!pathname || pathname.startsWith('/admin') || pathname.includes('/gallery')) {
    return null;
  }

  const sendWhatsApp = (message: string) => {
    const url = getWhatsAppContactUrl(`*CONSULTATION REQUEST - N-SQUARE STORE:*\n${message}`);
    window.open(url, '_blank');
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40">
      {/* Concierge Window */}
      {isOpen && (
        <div className="mb-2 sm:mb-3 w-[calc(100vw-24px)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl border border-teal-100 overflow-hidden animate-fadeInOverlay transition-all max-h-[82vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 p-3.5 sm:p-4 text-white shrink-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 11a9 9 0 0118 0m-18 0v4a3 3 0 003 3h1a1 1 0 001-1v-4a1 1 0 00-1-1H4a1 1 0 01-1-1zm18 0v4a3 3 0 01-3 3h-1a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 001-1z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 18v1a2 2 0 01-2 2h-4" />
                    <circle cx="12" cy="11" r="3" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm">N-Square Store Support</h3>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Online | Amway Specialist</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-xs transition-colors cursor-pointer"
                aria-label="Close concierge"
              >
                ✕
              </button>
            </div>
            <p className="text-[10px] sm:text-[11px] text-teal-100 mt-1.5">
              Have questions about products, direct selling discounts, or orders? Connect with us directly!
            </p>
          </div>

          {/* Social Channels Bar (WhatsApp, Instagram, LinkedIn) */}
          <div className="px-3 py-2.5 bg-slate-100/90 border-b border-slate-200/80 flex items-center justify-between gap-1.5 text-[11px] font-bold">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Connect:</span>
            <div className="flex items-center gap-1.5">
              {/* WhatsApp */}
              <a
                href={getWhatsAppContactUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-all"
                title="Connect on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp</span>
              </a>

              {/* Instagram */}
              <a
                href={SOCIAL_LINKS.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-95 text-white text-[11px] font-bold shadow-2xs transition-all"
                title="Follow & DM on Instagram"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>Instagram</span>
              </a>

              {/* LinkedIn */}
              <a
                href={SOCIAL_LINKS.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0077b5] hover:bg-[#006097] text-white text-[11px] font-bold shadow-2xs transition-all"
                title="Connect on LinkedIn"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          {/* Quick Consultation Chips */}
          <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-100 space-y-1.5 overflow-y-auto touch-scroll flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Quick Inquiries via WhatsApp:
            </span>
            {QUICK_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendWhatsApp(q)}
                className="w-full text-left p-2 rounded-lg bg-white hover:bg-teal-50 border border-slate-200/80 hover:border-teal-300 text-[11px] sm:text-xs text-slate-700 hover:text-teal-900 font-medium transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
              >
                <span className="truncate">{q}</span>
                <span className="text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  →
                </span>
              </button>
            ))}
          </div>

          {/* Custom Message Input */}
          <div className="p-2.5 sm:p-3 bg-white shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your health goal or query..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customMsg.trim()) {
                    sendWhatsApp(customMsg);
                    setCustomMsg('');
                  }
                }}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-teal-600 focus:border-transparent min-h-[38px]"
              />
              <button
                onClick={() => {
                  if (customMsg.trim()) {
                    sendWhatsApp(customMsg);
                    setCustomMsg('');
                  }
                }}
                className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[38px]"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        id="floating-concierge-toggle"
        className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
        aria-label="Chat with Wellness Consultant"
        title={isOpen ? 'Close Support' : 'Chat with Consultant'}
      >
        {/* Pulsing online indicator */}
        <span className="absolute top-1 right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-white"></span>
        </span>

        {/* Agent SVG Icon */}
        {isOpen ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 11a9 9 0 0118 0m-18 0v4a3 3 0 003 3h1a1 1 0 001-1v-4a1 1 0 00-1-1H4a1 1 0 01-1-1zm18 0v4a3 3 0 01-3 3h-1a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 001-1z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 18v1a2 2 0 01-2 2h-4" />
            <circle cx="12" cy="11" r="3" strokeWidth="2" />
          </svg>
        )}
      </button>
    </div>
  );
}
