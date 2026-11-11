import { getBanners, syncBannersFromSupabase } from '../services/bannerService';
import { isSupabaseConfigured } from '../utils/supabase';
import HomePageClient from '../components/HomePageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'N-Square Store | Authentic Amway Products Direct to You',
  description: 'Authentic Amway nutrition, wellness, personal care, and beauty products delivered directly to you across India.',
};

export default async function HomePage() {
  let banners = getBanners();
  if ((!banners || banners.length === 0) && isSupabaseConfigured) {
    const synced = await syncBannersFromSupabase();
    if (synced && synced.length > 0) banners = synced;
  }
  return <HomePageClient initialBanners={banners} />;
}
