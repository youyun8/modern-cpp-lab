import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

// NOTE: next/font/google does not accept a "chinese-traditional" subset id;
// the family is loaded with the latin subset (preload disabled to avoid
// pulling the very large CJK glyph set eagerly) while the full glyph coverage
// is still served on demand via the font's unicode-range @font-face rules.
const notoSansTC = Noto_Sans_TC({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  variable: '--font-noto-tc',
});

export const metadata: Metadata = {
  title: {
    default: '現代 C++ 平行程式設計學習網站',
    template: '%s · 現代 C++ 平行程式設計',
  },
  description:
    '以 Federico Busato 的「Modern C++ Programming」課程為基礎，聚焦平行化、並行與效能最佳化的互動式繁體中文學習網站。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-Hant"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} ${notoSansTC.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-white"
        >
          跳到主要內容
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
