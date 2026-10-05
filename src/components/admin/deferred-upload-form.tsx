"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type PrepareUpload = (formData: FormData) => Promise<void>;
type SubmitPhase = "idle" | "uploading" | "saving";

type DeferredUploadContextValue = {
  phase: SubmitPhase;
  register: (id: string, prepare: PrepareUpload) => () => void;
};

const DeferredUploadContext = createContext<DeferredUploadContextValue | null>(
  null,
);

export function DeferredUploadForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<unknown>;
  children: ReactNode;
  className?: string;
}) {
  const tasks = useRef(new Map<string, PrepareUpload>());
  const submitting = useRef(false);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [error, setError] = useState("");

  const register = useCallback((id: string, prepare: PrepareUpload) => {
    tasks.current.set(id, prepare);
    return () => tasks.current.delete(id);
  }, []);

  const context = useMemo(
    () => ({ phase, register }),
    [phase, register],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;

    setError("");
    setPhase("uploading");
    const formData = new FormData(event.currentTarget);

    try {
      for (const prepare of tasks.current.values()) {
        await prepare(formData);
      }
      setPhase("saving");
      await action(formData);
      setPhase("idle");
    } catch (caught) {
      if (isRedirectError(caught)) throw caught;
      setPhase("idle");
      setError(
        caught instanceof Error
          ? caught.message
          : "The changes could not be saved. Try again.",
      );
    } finally {
      submitting.current = false;
    }
  }

  return (
    <DeferredUploadContext.Provider value={context}>
      <form
        className={className}
        onSubmit={submit}
        aria-busy={phase !== "idle"}
      >
        {children}
        <div
          role={error ? "alert" : "status"}
          aria-live={error ? "assertive" : "polite"}
          className={cn(
            "mt-3 text-xs font-semibold",
            error ? "text-destructive" : "text-muted",
          )}
        >
          {error ||
            (phase === "uploading"
              ? "Uploading selected images…"
              : phase === "saving"
                ? "Saving changes…"
                : "")}
        </div>
      </form>
    </DeferredUploadContext.Provider>
  );
}

export function useDeferredUploadTask(prepare: PrepareUpload) {
  const context = useContext(DeferredUploadContext);
  const register = context?.register;
  const id = useId();

  useEffect(() => {
    if (!register) return;
    return register(id, prepare);
  }, [id, prepare, register]);
}

export function DeferredSubmitButton({
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "type">) {
  const context = useContext(DeferredUploadContext);
  const pending = context?.phase !== undefined && context.phase !== "idle";

  return (
    <Button
      {...props}
      type="submit"
      disabled={pending || props.disabled}
      className={className}
    >
      {pending ? (
        <>
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          {context?.phase === "uploading" ? "Uploading…" : "Saving…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
