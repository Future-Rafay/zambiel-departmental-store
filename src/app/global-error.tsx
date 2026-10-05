"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="de">
      <body>
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5 py-16">
          <section aria-labelledby="global-error-title" className="w-full border p-8">
            <h1 id="global-error-title" className="text-3xl font-bold">
              Etwas ist schiefgelaufen / Something went wrong
            </h1>
            <p className="mt-3">
              Bitte versuchen Sie es erneut. / Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 min-h-11 border px-5 font-bold"
            >
              Erneut versuchen / Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
