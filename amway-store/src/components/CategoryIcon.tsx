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
  Tag,
} from 'lucide-react';

interface CategoryIconProps {
  id: string;
  name?: string;
  icon?: string;
  className?: string;
}

export function getCategoryIconElement(id: string, name = '', className = 'w-4 h-4 shrink-0', iconName = '') {
  const key = `${id} ${name} ${iconName}`.toLowerCase();

  if (key.includes('heartpulse') || key.includes('nutri') || key.includes('wellness') || key.includes('vitamin')) {
    return <HeartPulse className={className} />;
  }
  if (key.includes('sparkle') || key.includes('beauty') || key.includes('artistry') || key.includes('skin')) {
    return <Sparkles className={className} />;
  }
  if (key.includes('droplet') || key.includes('personal') || key.includes('glister') || key.includes('body')) {
    return <Droplets className={className} />;
  }
  if (key.includes('home') || key.includes('living') || key.includes('cookware')) {
    return <Home className={className} />;
  }
  if (key.includes('package') || key.includes('other') || key.includes('accessor')) {
    return <Package className={className} />;
  }
  if (key.includes('dumbbell') || key.includes('category1') || key.includes('protein')) {
    return <Dumbbell className={className} />;
  }
  if (key.includes('scale') || key.includes('category2') || key.includes('weight')) {
    return <Scale className={className} />;
  }
  if (key.includes('pill') || key.includes('category3') || key.includes('supplement') || key.includes('tablet')) {
    return <Pill className={className} />;
  }
  if (key.includes('heart') || key.includes('category4') || key.includes('gummi')) {
    return <Heart className={className} />;
  }
  if (key.includes('leaf') || key.includes('category5') || key.includes('herb') || key.includes('ayurved')) {
    return <Leaf className={className} />;
  }
  if (key.includes('tag')) {
    return <Tag className={className} />;
  }

  return <Layers className={className} />;
}

export default function CategoryIcon({ id, name, icon, className = 'w-4 h-4 shrink-0' }: CategoryIconProps) {
  return getCategoryIconElement(id, name, className, icon);
}
