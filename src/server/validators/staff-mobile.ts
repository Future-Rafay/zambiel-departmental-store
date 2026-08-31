import { z } from "zod";

export const staffOrderFilterSchema = z
  .enum(["PAYMENT_PENDING", "CONFIRMED", "PROCESSING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "DELIVERED", "PICKED_UP", "CANCELLED"])
  .optional();

export const staffStatusSchema = z.object({
  version: z.number().int().min(0),
});
