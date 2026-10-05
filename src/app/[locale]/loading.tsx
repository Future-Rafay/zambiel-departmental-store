import { LoaderCircle } from "lucide-react";

export default function LocaleLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[45vh] max-w-7xl items-center justify-center gap-3 px-5 py-16 text-sm font-bold text-muted sm:px-8"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-5 animate-spin motion-reduce:animate-none"
      />
      <span>Wird geladen / Loading</span>
    </div>
  );
}
