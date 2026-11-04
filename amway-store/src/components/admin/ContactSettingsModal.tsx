'use client';

import React, { useState, useEffect } from 'react';
import { adminFetch } from '../../utils/adminFetch';
import { ContactSettings } from '../../services/contactService';

interface ContactSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: ContactSettings) => void;
}

export default function ContactSettingsModal({ isOpen, onClose, onSaved }: ContactSettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ContactSettings>({
    storeName: 'N-Square Store',
    tagline: 'Amway Direct Selling Partner',
    whatsappNumber: '919876543210',
    whatsappDisplayText: '+91 98765 43210',
    instagramUrl: 'https://www.instagram.com/nsquarestore',
    instagramHandle: '@nsquarestore',
    linkedinUrl: 'https://www.linkedin.com/company/nsquarestore',
    linkedinHandle: 'N-Square Store',
    supportPhone: '+91 98765 43210',
    supportEmail: 'care@nsquarestore.com',
    officeAddress: 'Authorized Amway Direct Seller Regional Fulfillment, Bengaluru, Karnataka, India',
    supportHours: 'Monday – Sunday: 9:00 AM – 9:00 PM IST',
    welcomeMessage: 'Have questions about authentic Amway nutrition, wellness, beauty, or personal care essentials? Connect with our dedicated team across any of our official channels.',
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/contact')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.contact) {
            setFormData(data.contact);
          }
        })
        .catch((err) => console.error('Failed to load contact settings:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminFetch('/api/contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('nsquare_contact_settings', JSON.stringify(data.contact));
        }
        if (onSaved) onSaved(data.contact);
        alert('Store contact settings updated successfully!');
        onClose();
      } else {
        alert(data.error || 'Failed to save contact settings.');
      }
    } catch (err: any) {
      alert('Network error while saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeInOverlay overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-900 to-emerald-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="font-black text-sm sm:text-base">Edit Store Contact &amp; Social Channels</h3>
              <p className="text-[11px] text-teal-200">
                Update dynamic phone numbers, WhatsApp, Instagram, LinkedIn, and operating hours across the storefront.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Form */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading contact settings...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
            {/* Store Branding */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-100">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Name</label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-teal-600 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-teal-600 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* WhatsApp Settings */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 block flex items-center gap-1.5">
                <span>💬</span>
                <span>WhatsApp Consultant Settings</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    WhatsApp Number (International format without + or spaces)
                  </label>
                  <input
                    type="text"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="e.g. 919876543210"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold focus:outline-emerald-600"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp Display Number</label>
                  <input
                    type="text"
                    value={formData.whatsappDisplayText}
                    onChange={(e) => setFormData({ ...formData, whatsappDisplayText: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold focus:outline-emerald-600"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Social Channels: Instagram & LinkedIn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-purple-50/60 p-3.5 rounded-2xl border border-purple-200/80 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900 block flex items-center gap-1">
                  <span>📸</span>
                  <span>Instagram Channel</span>
                </span>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Profile URL</label>
                  <input
                    type="url"
                    value={formData.instagramUrl}
                    onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Handle Display</label>
                  <input
                    type="text"
                    value={formData.instagramHandle}
                    onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200/80 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 block flex items-center gap-1">
                  <span>💼</span>
                  <span>LinkedIn Channel</span>
                </span>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Company Page URL</label>
                  <input
                    type="url"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Company Display Name</label>
                  <input
                    type="text"
                    value={formData.linkedinHandle}
                    onChange={(e) => setFormData({ ...formData, linkedinHandle: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Direct Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Helpline Phone Number</label>
                <input
                  type="text"
                  value={formData.supportPhone}
                  onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-teal-600 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Helpdesk Support Email</label>
                <input
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-teal-600 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Operating Hours & Fulfillment Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Operating Hours</label>
                <input
                  type="text"
                  value={formData.supportHours}
                  onChange={(e) => setFormData({ ...formData, supportHours: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-teal-600 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Regional Fulfillment Address</label>
                <input
                  type="text"
                  value={formData.officeAddress}
                  onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-teal-600 focus:bg-white"
                  required
                />
              </div>
            </div>

            {/* Welcome Message */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Customer Welcome / Help Message</label>
              <textarea
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-teal-600 focus:bg-white"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving...' : '✓ Save Contact Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

