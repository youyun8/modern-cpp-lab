import { useMemo } from 'react';
import { buildGodBoltUrl } from '@/utils/buildGodBoltUrl';

/** Memoises the Compiler Explorer URL for a given snippet. */
export function useGodbolt(source: string): string {
  return useMemo(() => buildGodBoltUrl(source), [source]);
}
