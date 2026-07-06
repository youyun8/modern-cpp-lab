/**
 * Builds a Compiler Explorer (godbolt.org) share URL that opens the given
 * C++ snippet pre-configured with:
 *   - compiler : x86-64 g++ 14.1  (Godbolt compiler id "g141")
 *   - flags    : -std=c++23 -O2 -pthread -march=native
 *
 * We encode a minimal ClientState document as base64 and hand it to Godbolt's
 * `/clientstate/<base64>` endpoint, which reconstructs the editor + compiler
 * panes on load.
 */

export const kGodboltCompilerId = 'g141';
export const kGodboltFlags = '-std=c++23 -O2 -pthread -march=native';

interface GodboltClientState {
  sessions: Array<{
    id: number;
    language: string;
    source: string;
    compilers: Array<{ id: string; options: string }>;
  }>;
}

function toBase64(input: string): string {
  // Handle both browser (btoa) and Node (Buffer) execution contexts.
  if (typeof globalThis.btoa === 'function') {
    // Encode as UTF-8 first so multi-byte characters survive btoa.
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return globalThis.btoa(binary);
  }
  return Buffer.from(input, 'utf-8').toString('base64');
}

export function buildGodBoltUrl(source: string): string {
  const state: GodboltClientState = {
    sessions: [
      {
        id: 1,
        language: 'c++',
        source,
        compilers: [
          {
            id: kGodboltCompilerId,
            options: kGodboltFlags,
          },
        ],
      },
    ],
  };

  const encoded = toBase64(JSON.stringify(state));
  return `https://godbolt.org/clientstate/${encoded}`;
}
