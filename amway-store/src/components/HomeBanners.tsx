'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BannerItem } from '../services/bannerService';

interface HomeBannersProps {
  banners: BannerItem[];
}

export default function HomeBanners({ banners }: HomeBannersProps) {
  // If no banners exist, render nothing at all per user request
  if (!banners || banners.length === 0) {
    return null;
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length, isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  return (
    <section 
      className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 bg-slate-900 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Promotional Banners"
    >
      {/* Slides Container */}
      <div className="relative w-full h-44 min-[480px]:h-56 sm:h-72 md:h-80 lg:h-96 overflow-hidden">
        {banners.map((banner, index) => {
          const isActive = index === currentIndex;
          const bannerLink = banner.link || '/products';

          return (
            <div
              key={banner.id || index}
              className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Link href={bannerLink} className="block w-full h-full">
                <img
                  src={banner.image_url}
                  alt={banner.title || `Promotion Banner ${index + 1}`}
                  className="w-full h-full object-cover object-center"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                {banner.title && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-4 sm:p-6 text-white">
                    <span className="text-xs sm:text-sm md:text-base font-bold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                      {banner.title}
                    </span>
                  </div>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (Only shown when multiple banners exist) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-md"
            aria-label="Previous Slide"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-900/70 hover:bg-slate-900/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 cursor-pointer shadow-md"
            aria-label="Next Slide"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-3 sm:bottom-4 inset-x-0 z-20 flex items-center justify-center gap-1.5 sm:gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? 'w-6 sm:w-8 bg-teal-400 shadow-md'
                    : 'w-2 sm:w-2.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

