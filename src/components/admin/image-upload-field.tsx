"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";

import { useDeferredUploadTask } from "@/components/admin/deferred-upload-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  productImageAccept,
  uploadProductImage,
  validateProductImage,
} from "@/lib/product-image-upload";

export function ImageUploadField({
  initialKey = "",
  initialUrl = null,
  label = "Product image",
  name = "imageKey",
  required = false,
}: {
  initialKey?: string;
  initialUrl?: string | null;
  label?: string;
  name?: string;
  required?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const statusId = `${inputId}-status`;
  const [key, setKey] = useState(initialKey);
  const [preview, setPreview] = useState(initialUrl);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const releaseObjectUrl = useCallback(() => {
    if (!objectUrl.current) return;
    URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }, []);

  useEffect(() => releaseObjectUrl, [releaseObjectUrl]);

  function select(file?: File) {
    if (!file) return;
    setError("");
    try {
      validateProductImage(file);
      releaseObjectUrl();
      const nextPreview = URL.createObjectURL(file);
      objectUrl.current = nextPreview;
      setPendingFile(file);
      setPreview(nextPreview);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The image is invalid.",
      );
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  const prepare = useCallback(
    async (formData: FormData) => {
      if (!pendingFile) {
        if (required && !key) throw new Error(`Select a ${label.toLowerCase()}.`);
        formData.set(name, key);
        return;
      }

      const upload = await uploadProductImage(pendingFile);
      formData.set(name, upload.key);
      releaseObjectUrl();
      setKey(upload.key);
      setPendingFile(null);
      setPreview(upload.publicUrl);
    },
    [key, label, name, pendingFile, releaseObjectUrl, required],
  );

  useDeferredUploadTask(prepare);

  const describedBy =
    [error ? errorId : "", pendingFile ? statusId : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <input type="hidden" name={name} value={key} />
      <input
        ref={input}
        id={inputId}
        className="sr-only"
        type="file"
        accept={productImageAccept}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        onChange={(event) => select(event.target.files?.[0])}
      />
      <div className="rounded-xl border border-dashed bg-white p-3">
        {preview ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative h-24 w-full overflow-hidden rounded-lg border sm:w-32">
              <Image
                src={preview}
                alt={`${label} preview`}
                fill
                unoptimized
                className="object-cover"
                sizes="128px"
              />
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => input.current?.click()}
              >
                <Upload aria-hidden="true" className="size-4" />
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  releaseObjectUrl();
                  setKey("");
                  setPendingFile(null);
                  setPreview(null);
                  setError("");
                  if (input.current) input.current.value = "";
                }}
                className="text-destructive sm:ml-auto"
              >
                <X aria-hidden="true" className="size-4" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              select(event.dataTransfer.files?.[0]);
            }}
            className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg text-sm font-semibold text-muted hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          >
            <ImageIcon aria-hidden="true" className="size-8 text-primary" />
            Drop an image or click to browse
            <span className="text-xs font-normal">
              AVIF, JPG, PNG or WebP · max 10 MB
            </span>
          </button>
        )}
      </div>
      {pendingFile ? (
        <p id={statusId} role="status" className="text-xs text-muted">
          Selected locally. This image will upload when you save.
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-semibold text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
