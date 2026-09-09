import assert from "node:assert/strict";
import test from "node:test";

import { buildDeliveryAnnouncement } from "./delivery-announcement";
import { formatMoney } from "./orders";

test("builds localized delivery copy from the checkout zone", () => {
  const zone = { countryNameDe: "Schweiz", countryNameEn: "Switzerland", minimumSubtotalRappen: 3000, freeDeliveryThresholdRappen: 6000 };

  assert.equal(
    buildDeliveryAnnouncement(zone, "de"),
    `Lieferung nach Schweiz · Mindestbestellung ${formatMoney(3000, "de")} · Gratislieferung ab ${formatMoney(6000, "de")}`,
  );
  assert.equal(
    buildDeliveryAnnouncement(zone, "en"),
    `Shipping to Switzerland · ${formatMoney(3000, "en")} minimum · Free shipping from ${formatMoney(6000, "en")}`,
  );
});

test("omits the free-delivery claim when no threshold is configured", () => {
  assert.equal(
    buildDeliveryAnnouncement(
      { countryNameDe: "Schweiz", countryNameEn: "Switzerland", minimumSubtotalRappen: 3000, freeDeliveryThresholdRappen: null },
      "en",
    ),
    `Shipping to Switzerland · ${formatMoney(3000, "en")} minimum`,
  );
});
