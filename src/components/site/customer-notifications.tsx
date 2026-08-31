"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { OrderStatus } from "@/generated/prisma/enums";
import { orderStatusLabel } from "@/lib/orders";

type Activity =
  | { id: string; kind: "ORDER_STATUS"; status: OrderStatus; at: string; reason: string | null }
  | { id: string; kind: "CASH_PAYMENT_CONFIRMED"; paymentStatus: "PAID"; at: string };
type Notice = Activity & { orderNumber: string };

function readSeen(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeSeen(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Storage may be unavailable in private browsing. */ }
}

export function CustomerNotifications({ locale, userId }: { locale: "de" | "en"; userId: string }) {
  const storageKey = `zambiel-notifications-seen-v1:${userId}`;
  const [notices, setNotices] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [seenId, setSeenId] = useState<string | null>(() => typeof window === "undefined" ? null : readSeen(storageKey));
  const initialized = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const seenIndex = seenId ? notices.findIndex((notice) => notice.id === seenId) : -1;
  const unread = seenId ? (seenIndex < 0 ? notices.length : seenIndex) : 0;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch("/api/v1/customer/orders", { cache: "no-store" });
      if (!response.ok || !active) return;
      const orders = ((await response.json()).orders ?? []) as Array<{ orderNumber: string; activities?: Activity[] }>;
      const next = orders
        .flatMap((order) => (order.activities ?? []).map((activity) => ({ ...activity, orderNumber: order.orderNumber })))
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setNotices(next);
      if (!initialized.current) {
        initialized.current = true;
        if (!readSeen(storageKey)) {
          const initialSeenId = next[0]?.id ?? "__none__";
          writeSeen(storageKey, initialSeenId);
          setSeenId(initialSeenId);
        }
      }
    };
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [storageKey]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && notices[0]) {
      writeSeen(storageKey, notices[0].id);
      setSeenId(notices[0].id);
    }
  }

  const label = (notice: Notice) => notice.kind === "CASH_PAYMENT_CONFIRMED"
    ? locale === "de" ? "Barzahlung bestätigt" : "Cash payment confirmed"
    : orderStatusLabel(notice.status, locale);

  return <div className="relative" ref={ref}>
    <button type="button" onClick={toggle} className="relative grid size-10 place-items-center rounded-full border border-border bg-surface hover:bg-background" aria-label={locale === "de" ? "Bestellbenachrichtigungen" : "Order notifications"} aria-expanded={open}>
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">{Math.min(unread, 9)}</span>}
    </button>
    {open && <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
      <div className="border-b border-border px-4 py-3 font-display font-bold">{locale === "de" ? "Bestellupdates" : "Order updates"}</div>
      {notices.length === 0 ? <p className="p-5 text-sm text-muted">{locale === "de" ? "Keine Updates verfügbar." : "No updates available."}</p> : <ul className="max-h-[min(30rem,calc(100vh-8rem))] divide-y divide-border overflow-y-auto">
        {notices.slice(0, 8).map((notice) => <li key={notice.id} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong className="block text-sm">{notice.orderNumber}</strong>
              <span className="text-xs text-muted">{label(notice)} · {new Intl.DateTimeFormat(locale === "de" ? "de-CH" : "en-CH", { timeZone: "Europe/Zurich", dateStyle: "short", timeStyle: "short" }).format(new Date(notice.at))}</span>
            </div>
            <Link href={`/${locale}/order/${notice.orderNumber}`} onClick={() => setOpen(false)} className="shrink-0 text-xs font-bold text-primary underline-offset-4 hover:underline">{locale === "de" ? "Details" : "View details"}</Link>
          </div>
        </li>)}
      </ul>}
    </div>}
  </div>;
}
