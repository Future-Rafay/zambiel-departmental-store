"use client";

import { adminAction } from "@/app/admin/(protected)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function ConfirmPayment({ intent, trigger, description, orderNumber, returnTo }: { intent: string; trigger: string; description: string; orderNumber: string; returnTo: string }) {
  return <Dialog><DialogTrigger asChild><Button>{trigger}</Button></DialogTrigger><DialogContent><DialogTitle>Confirm payment received</DialogTitle><DialogDescription>{description}</DialogDescription><form action={adminAction} className="mt-6"><input type="hidden" name="intent" value={intent} /><input type="hidden" name="orderNumber" value={orderNumber} /><input type="hidden" name="returnTo" value={returnTo} /><div className="flex justify-end gap-3"><DialogClose asChild><Button variant="outline">Not yet</Button></DialogClose><Button type="submit">Confirm payment</Button></div></form></DialogContent></Dialog>;
}

export function ConfirmInvoicePayment({ orderNumber, returnTo }: { orderNumber: string; returnTo: string }) {
  return <ConfirmPayment intent="confirm_invoice_payment" trigger="Payment received" description={`Confirm that the invoice or bank transfer for ${orderNumber} has been received. This changes the payment to paid and cannot be repeated.`} orderNumber={orderNumber} returnTo={returnTo} />;
}

export function ConfirmCashPayment({ orderNumber, amount, returnTo }: { orderNumber: string; amount: string; returnTo: string }) {
  return <ConfirmPayment intent="confirm_cash_payment" trigger="Cash received" description={`Confirm that ${amount} in cash for ${orderNumber} has been collected. This changes the payment to paid and cannot be repeated.`} orderNumber={orderNumber} returnTo={returnTo} />;
}
