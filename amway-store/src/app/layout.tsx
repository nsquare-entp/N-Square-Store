import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CartSidebar from '../components/CartSidebar';
import FloatingChat from '../components/FloatingChat';
import MobileBottomNav from '../components/MobileBottomNav';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nsquarestore.com'),
  title: 'N-Square Official | Amway Direct Selling Partner',
  description: 'Official N-Square Official direct selling portal for authentic Amway nutrition, wellness, beauty, and home essentials with direct member discounts.',
  icons: {
    icon: [
      { url: '/images/logo.png', type: 'image/png' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#042f2e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/images/logo.png" />
        <link rel="shortcut icon" href="/images/logo.png" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50/50 text-slate-800 antialiased font-sans flex flex-col overflow-x-clip w-full max-w-full">
        {/* Global Frosted Glass Header (Suppressed on Admin & Gallery) */}
        <Header />

        {/* Main Content View with mobile bottom nav clearance */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-5 sm:space-y-8 mobile-nav-clearance">
          {children}
        </main>

        {/* Simple, Attractive Minimalist White Footer (Suppressed on Admin & Gallery) */}
        <Footer />

        {/* Global Slide-Over Cart Drawer */}
        <CartSidebar />

        {/* Sticky Floating Concierge */}
        <FloatingChat />

        {/* Mobile Sticky Bottom Navigation (Phone screens only, Suppressed on Admin & Gallery) */}
        <MobileBottomNav />
      </body>
    </html>
  );
}
