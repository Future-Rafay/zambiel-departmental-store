"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function PasswordInput({ className, locale = "en", ...props }: Omit<ComponentProps<"input">, "type"> & { locale?: "de" | "en" }) {
  const [visible, setVisible] = useState(false);
  const de = locale === "de";
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className={cn("relative", className)}>
      {/* Edge draws its own eye on password inputs, which would show two. */}
      <Input {...props} type={visible ? "text" : "password"} className="pr-12 [&::-ms-reveal]:hidden" />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? (de ? "Passwort verbergen" : "Hide password") : (de ? "Passwort anzeigen" : "Show password")}
        className="absolute inset-y-0 right-0 inline-flex w-11 cursor-pointer items-center justify-center rounded-control text-muted hover:text-primary"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
