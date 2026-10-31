import { LoaderCircle } from "lucide-react";

import { storeConfig } from "@/config/store";

export function PageLoading() {
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-white/30"
      >
        <div className="page-progress-bar h-full w-full" />
      </div>
      <div
        role="status"
        aria-live="polite"
        className="mx-auto flex min-h-[45vh] max-w-7xl items-center justify-center px-5 py-16 sm:px-8"
      >
        <div className="flex items-center gap-4 rounded-card border border-border bg-surface px-6 py-5 shadow-sm">
          <LoaderCircle
            aria-hidden="true"
            className="size-6 animate-spin text-primary motion-reduce:animate-none"
          />
          <div>
            <p className="font-display text-sm font-bold text-primary">
              {storeConfig.identity.name}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-muted">
              Wird geladen / Loading
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
