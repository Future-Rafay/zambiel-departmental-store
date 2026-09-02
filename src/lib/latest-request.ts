export function createLatestRequest() {
  let sequence = 0;
  let controller: AbortController | undefined;
  return {
    begin() {
      controller?.abort();
      controller = new AbortController();
      const current = ++sequence;
      return { signal: controller.signal, isCurrent: () => current === sequence };
    },
    cancel() {
      sequence += 1;
      controller?.abort();
      controller = undefined;
    },
  };
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
