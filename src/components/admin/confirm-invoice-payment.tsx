"use client";

import { adminAction } from "@/app/admin/(protected)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ConfirmInvoicePayment({ orderNumber, returnTo }: { orderNumber: string; returnTo: string }) {
  return <Dialog><DialogTrigger asChild><Button>Payment received</Button></DialogTrigger><DialogContent><DialogTitle>Confirm payment received</DialogTitle><DialogDescription>Confirm that the invoice or bank transfer for {orderNumber} has been received. This changes the payment to paid and cannot be repeated.</DialogDescription><form action={adminAction} className="mt-6"><input type="hidden" name="intent" value="confirm_invoice_payment" /><input type="hidden" name="orderNumber" value={orderNumber} /><input type="hidden" name="returnTo" value={returnTo} /><div className="flex justify-end gap-3"><DialogClose asChild><Button variant="outline">Not yet</Button></DialogClose><Button type="submit">Confirm payment</Button></div></form></DialogContent></Dialog>;
}
