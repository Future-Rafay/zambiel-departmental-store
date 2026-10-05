const allowedImageTypes = ["image/avif", "image/jpeg", "image/png", "image/webp"];
const maxImageBytes = 10 * 1024 * 1024;

export function validateProductImage(file: File) {
  if (
    !allowedImageTypes.includes(file.type) ||
    !file.size ||
    file.size > maxImageBytes
  ) {
    throw new Error("Use an AVIF, JPG, PNG, or WebP image up to 10 MB.");
  }
}

export async function uploadProductImage(file: File) {
  validateProductImage(file);
  try {
    const response = await fetch("/api/uploads/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: file.type,
        size: file.size,
        scope: "products",
      }),
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
      upload?: { key?: string; publicUrl?: string; uploadUrl?: string };
    } | null;
    if (!response.ok) {
      throw new Error(result?.error ?? "Upload authorization failed. Try again.");
    }
    if (
      !result?.upload?.key ||
      !result.upload.publicUrl ||
      !result.upload.uploadUrl
    ) {
      throw new Error("The upload service returned an invalid response. Try again.");
    }

    const put = await fetch(result.upload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error("Image upload failed. Try again.");
    return {
      key: result.upload.key,
      publicUrl: result.upload.publicUrl,
    };
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("The image upload could not connect. Try again.");
    }
    throw error;
  }
}

export function replacePendingImageSources(
  html: string,
  replacements: ReadonlyMap<string, string>,
) {
  let next = html;
  for (const [source, publicUrl] of replacements) {
    next = next.replaceAll(source, publicUrl);
  }
  return next;
}

export const productImageAccept = allowedImageTypes.join(",");
