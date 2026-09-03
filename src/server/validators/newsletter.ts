import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  locale: z.enum(["de", "en"]),
  website: z.string().max(0).optional(),
});
