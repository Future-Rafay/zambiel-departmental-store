"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { productImageAccept, uploadProductImage } from "@/lib/product-image-upload";

export function ImageUploadField({
  initialKey = "",
  initialUrl = null,
  label = "Product image",
  name = "imageKey",
}: {
  initialKey?: string;
  initialUrl?: string | null;
  label?: string;
  name?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState(initialKey);
  const [preview, setPreview] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const upload = await uploadProductImage(file);
      setKey(upload.key);
      setPreview(upload.publicUrl);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={key} />
      <input
        ref={input}
        className="sr-only"
        type="file"
        accept={productImageAccept}
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <div className="rounded-xl border border-dashed bg-white p-3">
        {preview ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative h-24 w-full overflow-hidden rounded-lg border sm:w-32">
              <Image
                src={preview}
                alt="Product preview"
                fill
                className="object-cover"
                sizes="128px"
              />
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => input.current?.click()}
              >
                <Upload aria-hidden="true" className="size-4" />
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => {
                  setKey("");
                  setPreview(null);
                  if (input.current) input.current.value = "";
                }}
                className="text-destructive"
              >
                <X aria-hidden="true" className="size-4" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => input.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              upload(event.dataTransfer.files?.[0]);
            }}
            className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg text-sm font-semibold text-muted hover:bg-background"
          >
            <ImageIcon aria-hidden="true" className="size-8 text-primary" />
            {uploading ? "Uploading…" : "Drop an image or click to browse"}
            <span className="text-xs font-normal">
              AVIF, JPG, PNG or WebP · max 10 MB
            </span>
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
