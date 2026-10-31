"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setActive(false));
    return () => cancelAnimationFrame(frame);
  }, [pathname, searchParams]);

  useEffect(() => {
    function startForInternalLink(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        (anchor.target && anchor.target !== "_self") ||
        anchor.download
      ) {
        return;
      }
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      const current = new URL(window.location.href);
      if (
        destination.pathname === current.pathname &&
        destination.search === current.search
      ) {
        return;
      }
      setActive(true);
    }

    // Capture phase: Next <Link> calls preventDefault in React's bubble listener on document, which runs before ours.
    document.addEventListener("click", startForInternalLink, true);
    return () => document.removeEventListener("click", startForInternalLink, true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => setActive(false), 12_000);
    return () => window.clearTimeout(timeout);
  }, [active]);

  if (!active) return null;
  return (
    <div
      role="progressbar"
      aria-label="Page loading"
      aria-valuetext="Loading"
      className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-white/30"
    >
      <div className="page-progress-bar h-full w-full" />
    </div>
  );
}
