"use client";

import { Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { FaFacebookF, FaPinterestP, FaWhatsapp, FaXTwitter } from "react-icons/fa6";

import { addRecentProduct, RECENT_PRODUCTS_COOKIE } from "@/lib/recent-products";

export function RecentlyViewedTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const current = document.cookie.split("; ").find((item) => item.startsWith(`${RECENT_PRODUCTS_COOKIE}=`))?.split("=").slice(1).join("=");
    const value = encodeURIComponent(addRecentProduct(current, slug).join(","));
    document.cookie = `${RECENT_PRODUCTS_COOKIE}=${value}; Path=/; Max-Age=2592000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }, [slug]);
  return null;
}

export function ProductShare({ name, locale, url }: { name: string; locale: "de" | "en"; url: string }) {
  const [message, setMessage] = useState("");
  const encodedUrl = encodeURIComponent(url);
  const encodedName = encodeURIComponent(name);
  const links = [
    { href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, label: "Facebook", Icon: FaFacebookF },
    { href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedName}`, label: "X", Icon: FaXTwitter },
    { href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedName}`, label: "Pinterest", Icon: FaPinterestP },
    { href: `https://wa.me/?text=${encodedName}%20${encodedUrl}`, label: "WhatsApp", Icon: FaWhatsapp },
  ];
  const de = locale === "de";
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage(de ? "Link kopiert." : "Link copied."); }
    catch { setMessage(de ? "Link konnte nicht kopiert werden." : "Could not copy link."); }
  }
  async function share() {
    if (navigator.share) await navigator.share({ title: name, url }).catch(() => undefined);
    else await copy();
  }
  return (
    <div className="mt-2 border-t border-border pt-5">
      <p className="text-sm font-bold text-primary">{de ? "Produkt teilen" : "Share product"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map(({ href, label, Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`${de ? "Teilen auf" : "Share on"} ${label}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border bg-surface hover:border-secondary hover:text-secondary"><Icon className="h-4 w-4" aria-hidden="true" /></a>)}
        <button type="button" onClick={share} aria-label={de ? "Teilen" : "Share"} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border bg-surface hover:border-secondary hover:text-secondary"><Share2 className="h-4 w-4" aria-hidden="true" /></button>
        <button type="button" onClick={copy} aria-label={de ? "Link kopieren" : "Copy link"} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border bg-surface hover:border-secondary hover:text-secondary"><Copy className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-success">{message}</p>
    </div>
  );
}
