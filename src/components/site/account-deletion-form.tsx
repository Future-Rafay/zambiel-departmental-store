"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AccountDeletionForm({ locale }: { locale: "de" | "en" }) {
  const de = locale === "de";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function requestDeletion() {
    setStatus("sending");
    try {
      const response = await fetch("/api/v1/customer/account/deletion-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!response.ok) throw new Error("REQUEST_FAILED");
      setStatus("sent");
      setOpen(false);
    } catch {
      setStatus("error");
    }
  }

  return <section className="mt-8 border-t border-border pt-8">
    <Dialog open={open} onOpenChange={(next) => { if (status !== "sending") setOpen(next); }}>
      <DialogTrigger asChild><Button variant="destructive" disabled={status === "sent"}>
        {de ? "Kontolöschung anfragen" : "Request account deletion"}
      </Button></DialogTrigger>
      <DialogContent>
        <DialogTitle>{de ? "Löschanfrage bestätigen" : "Confirm deletion request"}</DialogTitle>
        <DialogDescription>{de
          ? "Möchten Sie die Löschung Ihres Zambiel-Kontos und der zugehörigen personenbezogenen Daten anfragen? Die Anfrage storniert keine Bestellung und löst keine Rückerstattung aus."
          : "Request deletion of your Zambiel account and associated personal data? This request does not cancel orders or issue refunds."}</DialogDescription>
        <div className="mt-6"><DialogClose asChild><Button variant="outline" disabled={status === "sending"}>{de ? "Zurück" : "Go back"}</Button></DialogClose></div>
        <div className="mt-6 border-t border-border pt-6"><Button variant="destructive" disabled={status === "sending"} onClick={requestDeletion}>
          {status === "sending" ? (de ? "Wird angefragt…" : "Requesting…") : (de ? "Löschung anfragen" : "Request deletion")}
        </Button></div>
        {status === "error" && <p role="alert" className="mt-4 text-destructive">{de ? "Anfrage fehlgeschlagen. Bitte versuchen Sie es erneut oder melden Sie sich erneut an." : "Request failed. Please retry or sign in again."}</p>}
      </DialogContent>
    </Dialog>
    <p role="status" className="mt-4 text-sm">{status === "sent" ? (de
      ? "Ihre Löschanfrage wurde gespeichert. Ihr Konto wurde noch nicht gelöscht."
      : "Your deletion request has been saved. Your account has not yet been deleted.") : ""}</p>
  </section>;
}
