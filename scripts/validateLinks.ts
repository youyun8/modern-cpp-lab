/**
 * Validates every href declared inside src/content/*.ts.
 *
 *  - Internal links (starting with "/") must resolve to a known route from the
 *    site navigation (src/nav.ts) or the home page.
 *  - External links must be syntactically valid absolute URLs.
 *
 * Exits with a non-zero status if any link is broken. Run via `npm run validate`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { kAllNavItems } from '../src/nav';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = join(here, '..', 'src', 'content');

function stripTrailingSlash(p: string): string {
  return p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
}

const validInternalRoutes = new Set<string>([
  '/',
  ...kAllNavItems.map((item) => stripTrailingSlash(item.href)),
]);

interface Finding {
  file: string;
  href: string;
  reason: string;
}

const hrefPattern = /href:\s*['"]([^'"]+)['"]/g;
const problems: Finding[] = [];
let totalLinks = 0;

const files = readdirSync(contentDir).filter((f) => f.endsWith('.ts'));

for (const file of files) {
  const source = readFileSync(join(contentDir, file), 'utf-8');
  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(source)) !== null) {
    const href = match[1];
    totalLinks += 1;

    if (href.startsWith('/')) {
      if (!validInternalRoutes.has(stripTrailingSlash(href))) {
        problems.push({ file, href, reason: '找不到對應的內部路由' });
      }
      continue;
    }

    if (href.startsWith('http://') || href.startsWith('https://')) {
      try {
        // eslint-disable-next-line no-new
        new URL(href);
      } catch {
        problems.push({ file, href, reason: '外部連結格式無效' });
      }
      continue;
    }

    problems.push({ file, href, reason: '不支援的連結格式（需為 / 或 http(s)://）' });
  }
}

console.log(`檢查了 ${files.length} 個內容檔、共 ${totalLinks} 個連結。`);

if (problems.length > 0) {
  console.error(`\n發現 ${problems.length} 個問題連結：`);
  for (const p of problems) {
    console.error(`  ✗ [${p.file}] ${p.href} — ${p.reason}`);
  }
  process.exit(1);
}

console.log('✓ 所有連結皆通過驗證。');
