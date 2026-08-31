"use client";

import { Globe2, LogOut, Menu, Search, Settings, ShoppingBag, User, X } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FaFacebookF, FaInstagram, FaPinterestP, FaXTwitter } from "react-icons/fa6";

import { BrandLogo } from "@/components/brand-logo";
import { useCart } from "@/components/site/cart-context";

type SiteUser = { id: string; name?: string | null; email?: string | null; image?: string | null; role?: string } | null;
type PublicShellConfig = { announcement: { de: string | null; en: string | null } | null; email?: string | null; facebookUrl?: string | null; instagramUrl?: string | null };

export function SiteShell({ locale, user, publicConfig, children }: { locale: "de" | "en"; user?: SiteUser; publicConfig: PublicShellConfig; children: ReactNode }) {
  const de = locale === "de";
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const { count } = useCart();
  const otherLocale = de ? "en" : "de";
  const otherPath = pathname?.replace(`/${locale}`, `/${otherLocale}`) || `/${otherLocale}`;
  const announcement = publicConfig.announcement?.[locale];
  const labels = de
    ? { products: "Produkte", categories: "Kategorien", contact: "Kontakt", search: "Produkte suchen", account: "Konto", orders: "Bestellungen", login: "Anmelden", register: "Registrieren", logout: "Abmelden", cart: "Warenkorb", rights: "Alle Rechte vorbehalten.", privacy: "Datenschutz", terms: "AGB" }
    : { products: "Products", categories: "Categories", contact: "Contact", search: "Search products", account: "Account", orders: "Orders", login: "Sign in", register: "Create account", logout: "Sign out", cart: "Cart", rights: "All rights reserved.", privacy: "Privacy policy", terms: "Terms of service" };
  const links = [
    { href: `/${locale}/products`, label: labels.products },
    { href: `/${locale}/categories`, label: labels.categories },
    { href: `/${locale}/contact`, label: labels.contact },
  ];

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setAccountOpen(false); setMobileOpen(false); }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousedown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col" lang={locale}>
      <a href="#main-content" className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:block focus:rounded-control focus:bg-primary focus:px-5 focus:py-3 focus:font-bold focus:text-white">{de ? "Zum Inhalt springen" : "Skip to content"}</a>
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-xl">
        {announcement ? <div className="bg-primary px-4 py-2 text-center text-xs font-bold text-white sm:text-sm">{announcement}</div> : null}
        <div className="mx-auto flex min-h-20 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href={`/${locale}`} className="flex min-h-11 shrink-0 items-center" aria-label={de ? "Zambiel Startseite" : "Zambiel home"}><BrandLogo priority /></Link>
          <form action={`/${locale}/products`} className="mx-auto hidden max-w-xl flex-1 sm:flex" role="search">
            <label htmlFor="header-search" className="sr-only">{labels.search}</label>
            <div className="relative w-full"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" /><input id="header-search" name="q" type="search" placeholder={labels.search} className="min-h-11 w-full rounded-control border border-border bg-background py-2 pl-12 pr-4 text-sm outline-none focus:border-primary" /></div>
          </form>
          <nav className="hidden items-center gap-1 lg:flex" aria-label={de ? "Hauptnavigation" : "Main navigation"}>{links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname?.startsWith(link.href) ? "page" : undefined} className={`inline-flex min-h-11 items-center rounded-control px-3 text-sm font-bold ${pathname?.startsWith(link.href) ? "bg-surface-warm text-primary" : "hover:bg-surface-warm"}`}>{link.label}</Link>)}</nav>
          <Link href={otherPath} hrefLang={otherLocale} className="hidden min-h-11 items-center gap-2 rounded-control px-3 text-sm font-bold hover:bg-surface-warm md:flex" aria-label={de ? "Switch to English" : "Zu Deutsch wechseln"}><Globe2 className="h-4 w-4 text-secondary" aria-hidden="true" />{otherLocale.toUpperCase()}</Link>
          <Link href={`/${locale}/cart`} className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-control bg-primary px-3 text-white" aria-label={`${labels.cart}: ${count}`}><ShoppingBag className="h-5 w-5" aria-hidden="true" />{count ? <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[11px] font-bold text-secondary-foreground">{count}</span> : null}</Link>
          <div ref={accountRef} className="relative">
            <button type="button" onClick={() => setAccountOpen((open) => !open)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border" aria-label={labels.account} aria-expanded={accountOpen} aria-haspopup="menu"><User className="h-5 w-5" aria-hidden="true" /></button>
            {accountOpen ? <div role="menu" className="absolute right-0 top-12 w-64 rounded-card border border-border bg-surface p-2 shadow-2xl">{user ? <>
              <div className="rounded-control bg-surface-warm p-3"><p className="truncate font-bold">{user.name || user.email}</p><p className="mt-1 truncate text-xs text-muted">{user.email}</p></div>
              <Link role="menuitem" href={`/${locale}/account`} onClick={() => setAccountOpen(false)} className="mt-2 flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-bold hover:bg-surface-warm"><User className="h-4 w-4 text-secondary" aria-hidden="true" />{labels.account}</Link>
              <Link role="menuitem" href={`/${locale}/account/orders`} onClick={() => setAccountOpen(false)} className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-bold hover:bg-surface-warm"><ShoppingBag className="h-4 w-4 text-secondary" aria-hidden="true" />{labels.orders}</Link>
              {user.role === "OWNER" || user.role === "STAFF" ? <Link role="menuitem" href="/admin" className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-bold hover:bg-surface-warm"><Settings className="h-4 w-4 text-secondary" aria-hidden="true" />Admin</Link> : null}
              <div className="my-2 border-t border-border" /><button role="menuitem" type="button" onClick={() => signOut({ callbackUrl: `/${locale}` })} className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm font-bold text-destructive hover:bg-destructive/10"><LogOut className="h-4 w-4" aria-hidden="true" />{labels.logout}</button>
            </> : <div className="grid gap-2 p-2"><Link role="menuitem" href={`/${locale}/login`} className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary font-bold text-white">{labels.login}</Link><Link role="menuitem" href={`/${locale}/register`} className="inline-flex min-h-11 items-center justify-center rounded-control border border-primary font-bold text-primary">{labels.register}</Link></div>}</div> : null}
          </div>
          <button type="button" onClick={() => setMobileOpen((open) => !open)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-border lg:hidden" aria-label={de ? "Navigation öffnen" : "Open navigation"} aria-controls="mobile-nav" aria-expanded={mobileOpen}>{mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}</button>
        </div>
        {mobileOpen ? <nav id="mobile-nav" className="border-t border-border p-4 lg:hidden" aria-label={de ? "Mobile Navigation" : "Mobile navigation"}><form action={`/${locale}/products`} className="mb-3 sm:hidden" role="search"><label htmlFor="mobile-search" className="sr-only">{labels.search}</label><input id="mobile-search" name="q" type="search" placeholder={labels.search} className="min-h-12 w-full rounded-control border border-border bg-background px-4" /></form><div className="grid gap-1">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="flex min-h-12 items-center rounded-control px-4 font-bold hover:bg-surface-warm">{link.label}</Link>)}<Link href={otherPath} hrefLang={otherLocale} className="flex min-h-12 items-center gap-3 rounded-control px-4 font-bold hover:bg-surface-warm"><Globe2 className="h-5 w-5 text-secondary" aria-hidden="true" />{de ? "English" : "Deutsch"}</Link></div></nav> : null}
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>

      <footer className="border-t border-border bg-primary text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
          <div><div className="inline-flex rounded-control bg-white p-2"><BrandLogo /></div><p className="mt-5 max-w-sm text-sm leading-6 text-white/75">Zambiel – Where Shopping Meets Storytelling</p></div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-secondary-light">{de ? "Bedingungen & Richtlinien" : "Terms & policies"}</h2>
            <ul className="mt-4 space-y-3 text-sm"><li><Link href={`/${locale}#about-zambiel`} className="hover:text-secondary-light">{de ? "Über uns" : "About us"}</Link></li><li><Link href={`/${locale}/privacy`} className="hover:text-secondary-light">{labels.privacy}</Link></li><li><span aria-disabled="true" className="text-white/45">{de ? "Rückgabe & Erstattung" : "Return & refund"} · {de ? "Demnächst" : "Coming soon"}</span></li><li><Link href={`/${locale}/terms`} className="hover:text-secondary-light">{labels.terms}</Link></li><li><Link href={`/${locale}/contact`} className="hover:text-secondary-light">{de ? "Kontaktinformationen" : "Contact information"}</Link></li></ul>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-secondary-light">{de ? "Hilfe & Support" : "Help & support"}</h2><p className="mt-4 text-sm text-white/65">{de ? "Fragen? Schreiben Sie an" : "Got questions? Send email at"}</p>{publicConfig.email ? <a href={`mailto:${publicConfig.email}`} className="mt-2 inline-block break-all font-bold hover:text-secondary-light">{publicConfig.email}</a> : null}<Link href={`/${locale}/contact`} className="mt-5 flex min-h-11 items-center font-bold hover:text-secondary-light">{de ? "Kontakt" : "Contact"}</Link><p className="mt-3 text-sm text-white/45">{de ? "Chat mit uns · Demnächst" : "Chat with us · Coming soon"}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-secondary-light">{de ? "Schnellzugriff" : "Quick links"}</h2><div className="mt-4 flex flex-col gap-3 text-sm">{links.map((link) => <Link key={link.href} href={link.href} className="hover:text-secondary-light">{link.label}</Link>)}</div>
            <h2 className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-secondary-light">Let&apos;s connect</h2><div className="mt-4 flex flex-wrap gap-2">{publicConfig.instagramUrl ? <a href={publicConfig.instagramUrl} target="_blank" rel="noreferrer" aria-label="Zambiel on Instagram" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-white/25 hover:border-secondary-light hover:text-secondary-light"><FaInstagram className="h-5 w-5" aria-hidden="true" /></a> : null}{[{ Icon: FaXTwitter, label: "X" }, { Icon: FaFacebookF, label: "Facebook" }, { Icon: FaPinterestP, label: "Pinterest" }].map(({ Icon, label }) => <button key={label} type="button" disabled title={`${label} · Coming soon`} aria-label={`${label} · Coming soon`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control border border-white/10 text-white/35"><Icon className="h-5 w-5" aria-hidden="true" /></button>)}</div>
          </div>
        </div>
        <div className="border-t border-white/15 px-5 py-5 text-center text-xs text-white/60">© {new Date().getFullYear()} Zambiel. {labels.rights}</div>
      </footer>
    </div>
  );
}
