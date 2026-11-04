/**
 * Central Social and Communication Channels Configuration
 * N-Square Store • Amway Direct Selling Partner
 */

const DEFAULT_SOCIAL = {
  storeName: 'N-Square Store',
  tagline: 'Amway Direct Selling Partner',
  whatsappNumber: '919876543210',
  whatsappDisplayText: '+91 98765 43210',
  whatsappUrl: 'https://wa.me/919876543210',
  instagramUrl: 'https://www.instagram.com/nsquarestore',
  instagramHandle: '@nsquarestore',
  linkedinUrl: 'https://www.linkedin.com/company/nsquarestore',
  linkedinHandle: 'N-Square Store',
  supportEmail: 'care@nsquarestore.com',
  supportPhone: '+91 98765 43210',
  hours: 'Mon - Sun: 9:00 AM - 9:00 PM IST',
};

function getStoredSocial(): typeof DEFAULT_SOCIAL {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('nsquare_contact_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        const waNum = (parsed.whatsappNumber || DEFAULT_SOCIAL.whatsappNumber).replace(/\D/g, '');
        return {
          ...DEFAULT_SOCIAL,
          storeName: parsed.storeName || DEFAULT_SOCIAL.storeName,
          tagline: parsed.tagline || DEFAULT_SOCIAL.tagline,
          whatsappNumber: waNum,
          whatsappDisplayText: parsed.whatsappDisplayText || DEFAULT_SOCIAL.whatsappDisplayText,
          whatsappUrl: `https://wa.me/${waNum}`,
          instagramUrl: parsed.instagramUrl || DEFAULT_SOCIAL.instagramUrl,
          instagramHandle: parsed.instagramHandle || DEFAULT_SOCIAL.instagramHandle,
          linkedinUrl: parsed.linkedinUrl || DEFAULT_SOCIAL.linkedinUrl,
          linkedinHandle: parsed.linkedinHandle || DEFAULT_SOCIAL.linkedinHandle,
          supportEmail: parsed.supportEmail || DEFAULT_SOCIAL.supportEmail,
          supportPhone: parsed.supportPhone || DEFAULT_SOCIAL.supportPhone,
          hours: parsed.supportHours || DEFAULT_SOCIAL.hours,
        };
      }
    } catch (e) {
      // safe fallback
    }
  }
  return DEFAULT_SOCIAL;
}

export const SOCIAL_LINKS = new Proxy(DEFAULT_SOCIAL, {
  get(target, prop: keyof typeof DEFAULT_SOCIAL) {
    const active = getStoredSocial();
    return active[prop] !== undefined ? active[prop] : target[prop];
  },
});

/**
 * Generates WhatsApp URL with prefilled consultation or order inquiry text
 */
export function getWhatsAppContactUrl(message?: string, customNumber?: string): string {
  const number = customNumber || SOCIAL_LINKS.whatsappNumber;
  const text = message
    ? encodeURIComponent(message)
    : encodeURIComponent('Hi N-Square Store, I would like to consult with an Amway specialist regarding authentic nutrition, wellness, and personal care products.');
  return `https://wa.me/${number}?text=${text}`;
}

/**
 * Generates WhatsApp URL for first-time / new customer order requests
 */
export function getWhatsAppFirstOrderUrl(
  items: Array<{ name: string; qty: number; price: number; variant?: string }>,
  customerName?: string,
  customerMobile?: string,
  customNumber?: string
): string {
  const number = customNumber || SOCIAL_LINKS.whatsappNumber;
  let lines = [
    `*NEW CUSTOMER ORDER REQUEST - N-SQUARE STORE*`,
    `Customer: ${customerName || 'New Customer'}`,
    `Mobile: ${customerMobile || 'Direct WhatsApp'}`,
    ``,
    `*Requested Products:*`,
  ];

  let total = 0;
  items.forEach((item, idx) => {
    const sub = item.price * item.qty;
    total += sub;
    lines.push(`${idx + 1}. ${item.name} (${item.variant || 'Standard'}) x ${item.qty} = ₹${sub.toLocaleString('en-IN')}`);
  });

  lines.push(``);
  lines.push(`*Total Listed Price:* ₹${total.toLocaleString('en-IN')}`);
  lines.push(``);
  lines.push(`Please review my order request, share the official invoice bill and payment options, and set up my customer account.`);

  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
}
