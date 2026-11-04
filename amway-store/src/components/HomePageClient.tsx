'use client';

import React, { useState, useEffect } from 'react';
import HeroSection from './HeroSection';
import HomeBanners from './HomeBanners';
import { BannerItem } from '../services/bannerService';

interface HomePageClientProps {
  initialBanners?: BannerItem[];
}

export default function HomePageClient({ initialBanners = [] }: HomePageClientProps) {
  const [banners, setBanners] = useState<BannerItem[]>(initialBanners);

  // Sync banners client-side to ensure immediate reflection of admin changes
  useEffect(() => {
    fetch('/api/banners')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.banners)) {
          setBanners(data.banners);
        }
      })
      .catch((err) => console.log('Notice fetching banners:', err));
  }, []);

  return (
    <div className="space-y-8 sm:space-y-12 max-w-7xl mx-auto py-2 sm:py-4">
      {/* 1. Welcome Section with "Explore Products" CTA */}
      <HeroSection />

      {/* 2. Promotional Banners (Only displayed when user has uploaded banners) */}
      {banners.length > 0 && (
        <div className="animate-fadeInOverlay">
          <HomeBanners banners={banners} />
        </div>
      )}
    </div>
  );
}
