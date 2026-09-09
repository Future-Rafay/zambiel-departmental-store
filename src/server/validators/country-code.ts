import { z } from "zod";

export const countryCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Enter a valid two-letter country code.");
