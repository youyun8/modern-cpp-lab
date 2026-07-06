'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';

/** Records the active chapter slug in the UI store on mount. */
export default function ActiveChapterSync({ slug }: { slug: string }) {
  const setActiveChapter = useStore((s) => s.setActiveChapter);
  useEffect(() => {
    setActiveChapter(slug);
  }, [slug, setActiveChapter]);
  return null;
}
