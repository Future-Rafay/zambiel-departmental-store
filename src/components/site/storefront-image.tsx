"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export function StorefrontImage({
  src,
  alt,
  fallbackSrc = "/images/product-placeholder.svg",
  ...props
}: Omit<ImageProps, "src"> & { src: string | null; fallbackSrc?: string }) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => setCurrentSrc(fallbackSrc)}
    />
  );
}
