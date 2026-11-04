import { getBanners } from '../services/bannerService';
import HomePageClient from '../components/HomePageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'N-Square Store | Authentic Amway Products Direct to You',
  description: 'Authentic Amway nutrition, wellness, personal care, and beauty products delivered directly to you across India.',
};

export default function HomePage() {
  const banners = getBanners();
  return <HomePageClient initialBanners={banners} />;
}
