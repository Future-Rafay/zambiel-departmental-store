"use client";

import { useState } from "react";

import { adminAction } from "@/app/admin/(protected)/actions";
import { deleteRetailCategory, deleteRetailProduct, deleteRetailVariant } from "@/app/admin/(protected)/retail-actions";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteDialog({ intent, id, kind, returnTo, label = "Delete", description = "This removes the item from future use. Existing order history is preserved." }: { intent: string; id: string; kind?: string; returnTo: string; label?: string; description?: string }) {
  return <Dialog><DialogTrigger asChild><Button variant="destructive">{label}</Button></DialogTrigger><DialogContent><DialogTitle>Confirm {label.toLowerCase()}</DialogTitle><DialogDescription>{description}</DialogDescription><form action={adminAction} className="mt-6"><input type="hidden" name="intent" value={intent} /><input type="hidden" name="id" value={id} />{kind && <input type="hidden" name="kind" value={kind} />}<input type="hidden" name="returnTo" value={returnTo} /><div className="flex flex-wrap justify-end gap-3"><DialogClose asChild><Button variant="outline">Keep it</Button></DialogClose><Button type="submit" variant="destructive">Confirm {label.toLowerCase()}</Button></div></form></DialogContent></Dialog>;
}

export function CancelOrderDialog({ orderNumber, returnTo }: { orderNumber: string; returnTo: string }) {
  return <Dialog><DialogTrigger asChild><Button variant="destructive">Cancel order</Button></DialogTrigger><DialogContent><DialogTitle>Cancel {orderNumber}</DialogTitle><DialogDescription>This action is separate from routine status controls. Paid Stripe orders must be refunded first.</DialogDescription><form action={adminAction} className="mt-6 space-y-5"><input type="hidden" name="intent" value="cancel_order" /><input type="hidden" name="orderNumber" value={orderNumber} /><input type="hidden" name="returnTo" value={returnTo} /><div><Label htmlFor={`cancel-reason-${orderNumber}`}>Reason</Label><Input id={`cancel-reason-${orderNumber}`} name="reason" minLength={3} maxLength={500} required className="mt-1" /></div><div className="flex flex-wrap justify-end gap-3"><DialogClose asChild><Button variant="outline">Keep order</Button></DialogClose><Button type="submit" variant="destructive">Confirm cancellation</Button></div></form></DialogContent></Dialog>;
}

export function RefundDialog({ orderNumber, remainingRappen, refundKey, returnTo, fullRefundOnly = false }: { orderNumber: string; remainingRappen: number; refundKey: string; returnTo: string; fullRefundOnly?: boolean }) {
  const maximum = (remainingRappen / 100).toFixed(2);
  const [amount, setAmount] = useState(maximum);
  const valid = /^\d+(?:\.\d{1,2})?$/.test(amount) && Number(amount) > 0 && Number(amount) <= Number(maximum);
  return <Dialog><DialogTrigger asChild><Button variant="destructive">{fullRefundOnly ? "Refund & cancel" : "Refund"}</Button></DialogTrigger><DialogContent><DialogTitle>{fullRefundOnly ? "Refund and cancel" : "Refund"} {orderNumber}</DialogTitle><DialogDescription>{fullRefundOnly ? `Stripe must successfully refund the full ${siteConfig.currency} ${maximum} before this order is cancelled.` : `The maximum refundable amount is ${siteConfig.currency} ${maximum}. Cancelling requires the full remaining refund.`}</DialogDescription><form action={adminAction} className="mt-6 space-y-5"><input type="hidden" name="intent" value="refund" /><input type="hidden" name="orderNumber" value={orderNumber} /><input type="hidden" name="refundKey" value={refundKey} /><input type="hidden" name="returnTo" value={returnTo} />{fullRefundOnly ? <><input type="hidden" name="amountRappen" value={maximum} /><input type="hidden" name="cancelOrder" value="true" /><p className="rounded-lg border bg-background p-3 text-sm font-semibold">Full refund: {siteConfig.currency} {maximum}</p></> : <><div><Label htmlFor={`refund-amount-${orderNumber}`}>Amount ({siteConfig.currency})</Label><Input id={`refund-amount-${orderNumber}`} name="amountRappen" type="number" min="0.01" max={maximum} step="0.01" value={amount} onChange={(event) => setAmount(event.currentTarget.value)} required className="mt-1" /></div><label className="flex min-h-11 items-center gap-2 text-sm font-medium"><input type="checkbox" name="cancelOrder" className="size-5 accent-destructive" />Cancel the order after the full refund succeeds</label></>}<div><Label htmlFor={`refund-reason-${orderNumber}`}>Reason</Label><Input id={`refund-reason-${orderNumber}`} name="reason" minLength={3} maxLength={500} required className="mt-1" /></div><div className="flex flex-wrap justify-end gap-3 border-t pt-4"><DialogClose asChild><Button variant="outline">Keep order</Button></DialogClose><Button type="submit" variant="destructive" disabled={!valid}>Confirm {fullRefundOnly ? "refund & cancellation" : `refund of ${siteConfig.currency} ${valid ? Number(amount).toFixed(2) : "—"}`}</Button></div></form></DialogContent></Dialog>;
}

export function DeleteProductDialog({ id }: { id: string }) {
  return <Dialog><DialogTrigger asChild><Button variant="destructive">Delete product</Button></DialogTrigger><DialogContent><DialogTitle>Delete product</DialogTitle><DialogDescription>The product leaves catalog and admin views. Historical orders, inventory, and audit records remain intact.</DialogDescription><form action={deleteRetailProduct} className="mt-6"><input type="hidden" name="id" value={id} /><div className="flex flex-wrap justify-end gap-3"><DialogClose asChild><Button variant="outline">Keep product</Button></DialogClose><Button type="submit" variant="destructive">Confirm deletion</Button></div></form></DialogContent></Dialog>;
}

export function DeleteCategoryDialog({ id }: { id: string }) {
  return <Dialog><DialogTrigger asChild><Button variant="destructive">Delete category</Button></DialogTrigger><DialogContent><DialogTitle>Delete category</DialogTitle><DialogDescription>Deletion is blocked while this category has active products or child categories. Historical records remain intact.</DialogDescription><form action={deleteRetailCategory} className="mt-6"><input type="hidden" name="id" value={id} /><div className="flex flex-wrap justify-end gap-3"><DialogClose asChild><Button variant="outline">Keep category</Button></DialogClose><Button type="submit" variant="destructive">Confirm deletion</Button></div></form></DialogContent></Dialog>;
}

export function DeleteVariantDialog({ id, productId }: { id: string; productId: string }) {
  return <Dialog><DialogTrigger asChild><Button variant="destructive">Delete variant</Button></DialogTrigger><DialogContent><DialogTitle>Delete variant</DialogTitle><DialogDescription>The variant leaves catalog and admin views while order snapshots and inventory activity remain intact.</DialogDescription><form action={deleteRetailVariant} className="mt-6"><input type="hidden" name="id" value={id} /><input type="hidden" name="productId" value={productId} /><div className="flex flex-wrap justify-end gap-3"><DialogClose asChild><Button variant="outline">Keep variant</Button></DialogClose><Button type="submit" variant="destructive">Confirm deletion</Button></div></form></DialogContent></Dialog>;
}
