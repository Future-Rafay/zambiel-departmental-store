import { formatMoney } from "@/lib/orders";

type DeliveryAnnouncementZone = {
  countryNameDe: string;
  countryNameEn: string;
  minimumSubtotalRappen: number;
  freeDeliveryThresholdRappen: number | null;
};

export function buildDeliveryAnnouncement(zone: DeliveryAnnouncementZone, locale: "de" | "en") {
  const minimum = formatMoney(zone.minimumSubtotalRappen, locale);
  const freeFrom = zone.freeDeliveryThresholdRappen === null ? null : formatMoney(zone.freeDeliveryThresholdRappen, locale);

  if (locale === "de") {
    return `Lieferung nach ${zone.countryNameDe} · Mindestbestellung ${minimum}${freeFrom ? ` · Gratislieferung ab ${freeFrom}` : ""}`;
  }

  return `Shipping to ${zone.countryNameEn} · ${minimum} minimum${freeFrom ? ` · Free shipping from ${freeFrom}` : ""}`;
}
