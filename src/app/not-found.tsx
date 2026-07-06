import Link from 'next/link';

export const metadata = {
  title: '找不到頁面',
  description: '您所尋找的頁面不存在或已被移動。',
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
      <p className="font-mono text-6xl font-bold text-accent">404</p>
      <h1 className="text-2xl font-bold text-content">找不到這個頁面</h1>
      <p className="text-content-muted">
        您所尋找的章節或實驗室頁面不存在，可能已被移動或尚未建立。
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
      >
        回到首頁
      </Link>
    </div>
  );
}
