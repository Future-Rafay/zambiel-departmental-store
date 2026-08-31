import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa6";
import type { IconType } from "react-icons";

export function SocialLinks({
  facebookUrl,
  instagramUrl,
  whatsappUrl,
  locale,
}: {
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  whatsappUrl: string;
  locale: "de" | "en";
}) {
  const links = [
    facebookUrl && {
      href: facebookUrl,
      label: "Foodeez on Facebook",
      icon: FaFacebookF,
    },
    instagramUrl && {
      href: instagramUrl,
      label: "Foodeez on Instagram",
      icon: FaInstagram,
    },
    {
      href: whatsappUrl,
      label:
        locale === "de"
          ? "Zambiel auf WhatsApp kontaktieren"
          : "Contact Zambiel on WhatsApp",
      icon: FaWhatsapp,
    },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: IconType }>;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ href, label, icon: Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-surface text-primary transition-colors hover:border-secondary hover:text-secondary"
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
