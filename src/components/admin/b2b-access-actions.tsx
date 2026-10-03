"use client";

import { adminAction } from "@/app/admin/(protected)/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function B2bAccessActions({ id, status, returnTo }: { id: string; status: string; returnTo: string }) {
  return <div className="flex min-w-max justify-end gap-2">
    {status !== "APPROVED" ? <form action={adminAction}><input type="hidden" name="intent" value="b2b_access" /><input type="hidden" name="id" value={id} /><input type="hidden" name="approved" value="true" /><input type="hidden" name="returnTo" value={returnTo} /><Button type="submit">Approve</Button></form> : null}
    {status !== "REJECTED" && status !== "NONE" ? <Dialog><DialogTrigger asChild><Button variant="destructive">{status === "APPROVED" ? "Revoke" : "Reject"}</Button></DialogTrigger><DialogContent><DialogTitle>{status === "APPROVED" ? "Revoke B2B access" : "Reject B2B request"}</DialogTitle><DialogDescription>{status === "APPROVED" ? "This customer will immediately lose access to the B2B storefront." : "This request will be marked rejected. The customer can submit another request later."}</DialogDescription><form action={adminAction} className="mt-6"><input type="hidden" name="intent" value="b2b_access" /><input type="hidden" name="id" value={id} /><input type="hidden" name="approved" value="false" /><input type="hidden" name="returnTo" value={returnTo} /><div className="flex justify-end gap-3"><DialogClose asChild><Button variant="outline">Keep current access</Button></DialogClose><Button type="submit" variant="destructive">Confirm {status === "APPROVED" ? "revocation" : "rejection"}</Button></div></form></DialogContent></Dialog> : null}
  </div>;
}
