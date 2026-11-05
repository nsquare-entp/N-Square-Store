'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Phone, Mail, MapPin, Clock, Send, ChevronRight, ChevronDown } from 'lucide-react';
import { ContactSettings } from '../services/contactService';
import { getWhatsAppContactUrl } from '../config/social';
import { safeLocalStorage } from '../utils/safeStorage';

interface ContactPageClientProps {
  initialContact: ContactSettings;
}

export default function ContactPageClient({ initialContact }: ContactPageClientProps) {
  const [contact, setContact] = useState<ContactSettings>(initialContact);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [topic, setTopic] = useState('Nutrition & Wellness Consultation');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // 1. Check local storage cache on mount for instant client hydration
    const cached = safeLocalStorage.getItem('nsquare_contact_settings');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setContact((prev) => ({ ...prev, ...parsed }));
      } catch {}
    }

    // 2. Fetch fresh contact settings from API (no-store cache)
    fetch('/api/contact', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.contact) {
          setContact((prev) => ({ ...prev, ...data.contact }));
          safeLocalStorage.setItem('nsquare_contact_settings', JSON.stringify(data.contact));
        }
      })
      .catch((err) => console.log('Contact refresh notice:', err));

    // 3. Listen for real-time contact updates within the window
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ContactSettings>;
      if (customEvent.detail) {
        setContact(customEvent.detail);
      }
    };
    window.addEventListener('nsquare_contact_updated', handleUpdate);

    // 4. Listen on BroadcastChannel for multi-tab updates
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('nsquare_updates');
      bc.onmessage = (event) => {
        if (event.data?.type === 'contact_updated' && event.data.contact) {
          setContact(event.data.contact);
        }
      };
    } catch {}

    return () => {
      window.removeEventListener('nsquare_contact_updated', handleUpdate);
      if (bc) bc.close();
    };
  }, []);

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim()) {
      alert('Please enter your contact mobile number.');
      return;
    }

    const formattedMessage = [
      `*CUSTOMER INQUIRY - ${contact.storeName.toUpperCase()}*`,
      `Name: ${name || 'Customer'}`,
      `Mobile: ${mobile}`,
      `Topic: ${topic}`,
      ``,
      `Message: ${message || 'I would like product guidance and member discount details.'}`,
    ].join('\n');

    const waUrl = getWhatsAppContactUrl(formattedMessage, contact.whatsappNumber);
    setSubmitted(true);

    // Record inquiry as lead in Admin studio
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mobile,
        topic,
        message,
        cartItems: [],
      }),
    }).catch((e) => console.log('Inquiry record notice:', e));

    window.open(waUrl, '_blank');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in py-2 sm:py-4">
      {/* 1. Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-tr from-slate-950 via-teal-950 to-emerald-950 text-white p-6 sm:p-10 shadow-xl border border-teal-800/40">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-200 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span>{contact.storeName} • Direct Support</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Contact Our Amway Specialists
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
            {contact.welcomeMessage}
          </p>

          <div className="pt-2 flex items-center gap-2 text-xs text-teal-300 font-semibold">
            <Clock className="w-4 h-4 shrink-0" />
            <span>{contact.supportHours}</span>
          </div>
        </div>
      </div>

      {/* 2. Direct Channels Action Grid (WhatsApp, YouTube, Instagram, LinkedIn, Phone, Email, Office) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* WhatsApp Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                Instant Chat
              </span>
              <h2 className="text-base font-black text-slate-900 mt-0.5">WhatsApp Consultant</h2>
              <p className="text-xs text-slate-500 mt-0.5">{contact.whatsappDisplayText}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Fastest channel for product recommendations, stock verification, and direct order requests.
          </p>
          <a
            href={getWhatsAppContactUrl(undefined, contact.whatsappNumber)}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open WhatsApp Chat</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* YouTube Channel Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#ff0000] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-800 block">
                Video Regimens &amp; Science
              </span>
              <h2 className="text-base font-black text-slate-900 mt-0.5">YouTube Official</h2>
              <p className="text-xs text-slate-500 mt-0.5">{contact.youtubeHandle || '@N_Square_Official'}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Watch verified Nutrilite clinical studies, multi-vitamin deep dives, and supplement regimens in English.
          </p>
          <a
            href={contact.youtubeUrl || 'https://www.youtube.com/@N_Square_Official'}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-4 bg-[#cc0000] hover:bg-[#b30000] text-white font-bold text-xs rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Watch on YouTube</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* Instagram Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-100 to-pink-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800 block">
                Visual Stories &amp; DM
              </span>
              <h2 className="text-base font-black text-slate-900 mt-0.5">Instagram Community</h2>
              <p className="text-xs text-slate-500 mt-0.5">{contact.instagramHandle}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Follow our daily health tips, Nutrilite wellness carousels, Artistry skincare regimens, and send DMs.
          </p>
          <a
            href={contact.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Message on Instagram</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* LinkedIn Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0077b5] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 1 0 1.6 1.6 1.6 1.6 0 0 0-1.6-1.6Z"/>
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 block">
                Professional Network
              </span>
              <h2 className="text-base font-black text-slate-900 mt-0.5">LinkedIn Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">{contact.linkedinHandle}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Connect for business inquiries, bulk corporate wellness orders, or direct seller partnership.
          </p>
          <a
            href={contact.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-4 bg-[#0077b5] hover:bg-[#006097] text-white font-bold text-xs rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Connect on LinkedIn</span>
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* Phone Call Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 block">
                Voice Helpline
              </span>
              <h2 className="text-base font-black text-slate-900 mt-0.5">Direct Phone Line</h2>
              <p className="text-xs text-slate-500 mt-0.5">{contact.supportPhone}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Speak directly with our regional consultant during operating hours: {contact.supportHours}.
          </p>
          <a
            href={`tel:${contact.supportPhone.replace(/\s+/g, '')}`}
            className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Call {contact.supportPhone}</span>
            <Phone className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Email Support Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                Written Support
              </span>
              <h2 className="text-base font-black text-slate-900 mt-0.5">Email Helpdesk</h2>
              <p className="text-xs text-slate-500 mt-0.5">{contact.supportEmail}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            For documentation, official invoices, corporate orders, or specific health regimen inquiries.
          </p>
          <a
            href={`mailto:${contact.supportEmail}`}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Send Email</span>
            <Mail className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Fulfillment Center Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group lg:col-span-3">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                Regional Hub
              </span>
              <h2 className="text-base font-black text-slate-900 mt-0.5">Fulfillment &amp; Dispatch</h2>
              <p className="text-xs text-slate-500 mt-0.5">{contact.tagline}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {contact.officeAddress}
          </p>
          <div className="w-full py-2.5 px-3 bg-amber-50 rounded-xl text-center text-amber-900 font-bold text-xs border border-amber-200 flex items-center justify-center gap-1.5">
            <span>Pan-India Doorstep Delivery</span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Direct Consultation Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-6">
        <div className="max-w-xl">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Send an Inquiry or Request a Call Back
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fill out the details below to connect directly with our authorized consultant via WhatsApp.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-300 text-center space-y-2">
            <span className="text-2xl">✅</span>
            <h3 className="font-bold text-emerald-950 text-sm">Consultation Request Transmitted</h3>
            <p className="text-xs text-emerald-800">
              Our WhatsApp consultant is ready to answer your questions. If WhatsApp did not open automatically, click below:
            </p>
            <a
              href={getWhatsAppContactUrl(undefined, contact.whatsappNumber)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <span>Open WhatsApp Now</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmitInquiry} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-teal-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-teal-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Inquiry Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-teal-600 transition-all cursor-pointer"
              >
                <option value="Nutrition & Wellness Consultation">Nutrition &amp; Foundational Wellness (Nutrilite)</option>
                <option value="Skincare & Beauty Regimen">Skincare &amp; Anti-Aging Consultation (Artistry)</option>
                <option value="Personal & Body Care Essentials">Personal &amp; Hair Care (Glister, G&amp;H, Satinique)</option>
                <option value="Home Living & Cookware">Cookware &amp; Atmosphere Air Treatment</option>
                <option value="Bulk / Corporate Wellness Order">Bulk Order / Corporate Wellness Package</option>
                <option value="Order Tracking & Invoice Support">Order Tracking &amp; Official Invoicing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Specific Question or Needs</label>
              <textarea
                rows={3}
                placeholder="Tell us what product or health goal you are interested in..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-teal-600 transition-all"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Send WhatsApp Consultation Request</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
