'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Phone, Mail, MapPin, Clock, Send, ChevronRight, ChevronDown } from 'lucide-react';
import { ContactSettings } from '../services/contactService';
import { getWhatsAppContactUrl } from '../config/social';

interface ContactPageClientProps {
  initialContact: ContactSettings;
}

export default function ContactPageClient({ initialContact }: ContactPageClientProps) {
  const [contact] = useState<ContactSettings>(initialContact);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [topic, setTopic] = useState('Nutrition & Wellness Consultation');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim()) {
      alert('Please enter your contact mobile number.');
      return;
    }

    const formattedMessage = [
      `*CUSTOMER INQUIRY - N-SQUARE STORE*`,
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
            <span>N-Square Store • Direct Support</span>
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

      {/* 2. Direct Channels Action Grid (WhatsApp, Instagram, LinkedIn, Phone, Email, Office) */}
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
            Follow our daily health tips, Nutrilite wellness reels, Artistry skincare regimens, and send DMs.
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
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group">
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
            <span className="text-3xl block">✓</span>
            <h3 className="text-base font-bold text-emerald-950">Inquiry Launched on WhatsApp</h3>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              Our Amway wellness specialist has received your inquiry and will respond promptly.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-xs font-bold text-emerald-900 underline pt-2"
            >
              Send Another Inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitInquiry} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anand Kumar"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-teal-600 focus:bg-white transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Phone Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-teal-600 focus:bg-white transition-all"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Consultation Topic</label>
              <div className="relative">
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-teal-600 cursor-pointer"
                >
                  <option value="Nutrition & Wellness Consultation">Nutrition &amp; Wellness (Proteins, Daily, Omega, Calcium)</option>
                  <option value="Weight Management Guidance">Weight Management (BodyKey, Shakes, Fibre)</option>
                  <option value="Beauty & Skincare Regimen">Beauty &amp; Skincare (Artistry Skin Nutrition)</option>
                  <option value="Home Living & Personal Care">Home Living &amp; Personal Care (Glister, Satinique, LOC)</option>
                  <option value="Direct Selling Member Discount Inquiry">Direct Selling Member Discount Inquiry</option>
                  <option value="Order Tracking / Delivery Inquiry">Existing Order Tracking &amp; Delivery</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Your Message or Health Goal</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your requirements, fitness goals, or any questions..."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-teal-600 focus:bg-white transition-all"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                className="py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-white shrink-0" />
                <span>Send via WhatsApp →</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

