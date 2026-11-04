import { getContactSettings } from '../../services/contactService';
import ContactPageClient from '../../components/ContactPageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Contact Us | N-Square Store',
  description: 'Connect with authorized Amway specialists at N-Square Store for authentic product consultations, direct selling discounts, and orders via WhatsApp, Instagram, LinkedIn, or phone.',
};

export default function ContactPage() {
  const contact = getContactSettings();
  return <ContactPageClient initialContact={contact} />;
}

