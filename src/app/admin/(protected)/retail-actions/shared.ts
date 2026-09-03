export const optionalText = (value: FormDataEntryValue | null) => String(value ?? "").trim() || null;
