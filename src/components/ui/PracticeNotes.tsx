import RichText from './RichText';

/**
 * Renders two optional real-world lists side by side: common pitfalls and
 * best-practice recommendations. Hidden entirely when both are empty.
 */
export default function PracticeNotes({
  pitfalls = [],
  bestPractices = [],
}: {
  pitfalls?: string[];
  bestPractices?: string[];
}) {
  if (pitfalls.length === 0 && bestPractices.length === 0) return null;

  return (
    <section aria-labelledby="practice-heading" className="space-y-3">
      <h2 id="practice-heading" className="text-lg font-semibold text-content">
        實務要點
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {pitfalls.length > 0 && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-content">
              <span aria-hidden="true">⚠</span> 常見陷阱
            </h3>
            <ul className="space-y-2">
              {pitfalls.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm leading-6 text-content">
                  <span aria-hidden="true" className="text-red-400">
                    ✗
                  </span>
                  <span>
                    <RichText text={p} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {bestPractices.length > 0 && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-content">
              <span aria-hidden="true">✓</span> 最佳實務
            </h3>
            <ul className="space-y-2">
              {bestPractices.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm leading-6 text-content">
                  <span aria-hidden="true" className="text-emerald-400">
                    ✓
                  </span>
                  <span>
                    <RichText text={b} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
