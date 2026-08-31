import { z } from "zod";

export const contactSchema = z.object({
  kind: z.enum(["contact", "product_request"]),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(320),
  phone: z.string().trim().max(40).optional().default(""),
  subject: z.string().trim().max(160).optional().default(""),
  message: z.string().trim().min(10).max(5000),
  locale: z.enum(["de", "en"]),
  website: z.literal("").default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;
