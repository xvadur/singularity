'use client';

import { useState, useEffect } from 'react';

export type CaptureCategory = 'capture' | 'log' | 'daily' | 'tasks';

export const useCaptureTheme = () => {
  const [activeCategory, setActiveCategory] = useState<CaptureCategory>('capture');

  // Map categories to tailored border/shadow colors
  // These should be defined in your global CSS or Tailwind config
  const getThemeClass = (category: CaptureCategory) => {
    switch (category) {
      case 'log': return 'theme-log'; // e.g., Blue/Info
      case 'daily': return 'theme-daily'; // e.g., Gold/Purple
      case 'tasks': return 'theme-tasks'; // e.g., Green/Success
      case 'capture': default: return 'theme-capture'; // Neutral/Gray
    }
  };

  return {
    activeCategory,
    setActiveCategory,
    themeClass: getThemeClass(activeCategory)
  };
};
