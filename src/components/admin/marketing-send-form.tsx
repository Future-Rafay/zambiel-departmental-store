"use client";

import { Send } from "lucide-react";
import { useRef, useState } from "react";

import { sendMarketingCampaign } from "@/app/admin/(protected)/marketing/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Customer = { id: string; name: string | null; email: string };

export function MarketingSendForm({ campaignId, customers, minSendAt, maxSendAt }: { campaignId: string; customers: Customer[]; minSendAt: string; maxSendAt: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [sendAt, setSendAt] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const allSelected = customers.length > 0 && selected.size === customers.length;
  const ready = selected.size > 0 && (mode === "now" || Boolean(sendAt));

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form ref={form} action={sendMarketingCampaign} onSubmit={() => setSubmitting(true)} className="space-y-5">
      <input type="hidden" name="id" value={campaignId} />
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b bg-[#F6F6F7] text-xs uppercase text-muted">
            <tr>
              <th className="w-14 p-3">
                <label className="grid size-11 place-items-center">
                  <span className="sr-only">Select all customers on this page</span>
                  <input type="checkbox" checked={allSelected} onChange={(event) => setSelected(event.target.checked ? new Set(customers.map((customer) => customer.id)) : new Set())} className="size-5 accent-primary" />
                </label>
              </th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="p-3">
                  <label className="grid size-11 place-items-center">
                    <span className="sr-only">Select {customer.name ?? customer.email}</span>
                    <input type="checkbox" name="userId" value={customer.id} checked={selected.has(customer.id)} onChange={(event) => toggle(customer.id, event.target.checked)} className="size-5 accent-primary" />
                  </label>
                </td>
                <td className="p-3 font-semibold">{customer.name ?? "—"}</td>
                <td className="p-3">{customer.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-bold text-[#303030]">3. When should it be sent?</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="radio" name="mode" value="now" checked={mode === "now"} onChange={() => setMode("now")} className="size-5 accent-primary" />
          Send immediately
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="radio" name="mode" value="schedule" checked={mode === "schedule"} onChange={() => setMode("schedule")} className="size-5 accent-primary" />
          Schedule for later (Zurich time, up to 30 days)
        </label>
        {mode === "schedule" ? (
          <label className="block max-w-xs space-y-1 text-xs font-bold text-[#303030]">
            <span>Send at</span>
            <input type="datetime-local" name="sendAt" value={sendAt} min={minSendAt} max={maxSendAt} required onChange={(event) => setSendAt(event.target.value)} className="min-h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-medium shadow-2xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring" />
          </label>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p role="status" className="text-sm font-semibold">{selected.size} of {customers.length} selected</p>
        <Button type="button" disabled={!ready || submitting} onClick={() => setConfirming(true)}>
          <Send className="size-4" aria-hidden="true" />
          {mode === "now" ? "Review and send" : "Review and schedule"}
        </Button>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogTitle>{mode === "now" ? "Send campaign now?" : "Schedule campaign?"}</DialogTitle>
          <DialogDescription>
            {selected.size} separate email{selected.size === 1 ? "" : "s"} will {mode === "now" ? "be sent immediately" : `be sent on ${sendAt.replace("T", " ")} (Zurich time)`}. Each customer receives an individual message. This cannot be undone{mode === "schedule" ? " except by cancelling before the scheduled time" : ""}.
          </DialogDescription>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <DialogClose asChild><Button variant="outline">Go back</Button></DialogClose>
            <Button type="button" disabled={submitting} onClick={() => { setConfirming(false); form.current?.requestSubmit(); }}>
              {submitting ? "Sending…" : mode === "now" ? `Send ${selected.size} emails` : `Schedule ${selected.size} emails`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}
