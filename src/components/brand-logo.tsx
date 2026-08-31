export function BrandLogo({ compact = false, className = "" }: { compact?: boolean; priority?: boolean; className?: string }) {
  return (
    <span role="img" aria-label="Zambiel" className={`inline-flex items-baseline whitespace-nowrap font-display text-2xl leading-none tracking-[-0.045em] text-primary ${className}`}>
      {compact ? "Z" : <><span>Zambi</span><span className="text-secondary">e</span><span>l</span></>}
    </span>
  );
}
