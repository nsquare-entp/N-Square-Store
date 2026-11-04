import React from 'react';
import {
  HeartPulse,
  Sparkles,
  Droplets,
  Home,
  Package,
  Dumbbell,
  Scale,
  Pill,
  Heart,
  Leaf,
  Layers,
} from 'lucide-react';

interface CategoryIconProps {
  id: string;
  name?: string;
  className?: string;
}

export function getCategoryIconElement(id: string, name = '', className = 'w-4 h-4 shrink-0') {
  const key = `${id} ${name}`.toLowerCase();

  if (key.includes('nutri') || key.includes('wellness') || key.includes('vitamin')) {
    return <HeartPulse className={className} />;
  }
  if (key.includes('beauty') || key.includes('artistry') || key.includes('skin')) {
    return <Sparkles className={className} />;
  }
  if (key.includes('personal') || key.includes('glister') || key.includes('body')) {
    return <Droplets className={className} />;
  }
  if (key.includes('home') || key.includes('living') || key.includes('cookware')) {
    return <Home className={className} />;
  }
  if (key.includes('other') || key.includes('accessor')) {
    return <Package className={className} />;
  }
  if (key.includes('category1') || key.includes('protein')) {
    return <Dumbbell className={className} />;
  }
  if (key.includes('category2') || key.includes('weight')) {
    return <Scale className={className} />;
  }
  if (key.includes('category3') || key.includes('supplement') || key.includes('tablet')) {
    return <Pill className={className} />;
  }
  if (key.includes('category4') || key.includes('gummi')) {
    return <Heart className={className} />;
  }
  if (key.includes('category5') || key.includes('herb') || key.includes('ayurved')) {
    return <Leaf className={className} />;
  }

  return <Layers className={className} />;
}

export default function CategoryIcon({ id, name, className = 'w-4 h-4 shrink-0' }: CategoryIconProps) {
  return getCategoryIconElement(id, name, className);
}

