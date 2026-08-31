"use client";

import { removeRetailMedia } from "@/app/admin/(protected)/retail-actions";
import { Button } from "@/components/ui/button";

export function RetailMediaDelete({
  id,
  productId,
}: {
  id: string;
  productId: string;
}) {
  return (
    <form
      action={removeRetailMedia}
      onSubmit={(event) => {
        if (!window.confirm("Remove this image from the product gallery?"))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit" variant="destructive">
        Remove image
      </Button>
    </form>
  );
}
