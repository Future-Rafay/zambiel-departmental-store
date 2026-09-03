const allowedImageTypes = ["image/avif", "image/jpeg", "image/png", "image/webp"];
const maxImageBytes = 10 * 1024 * 1024;

export async function uploadProductImage(file: File) {
  if (!allowedImageTypes.includes(file.type) || file.size > maxImageBytes) {
    throw new Error("Use an AVIF, JPG, PNG, or WebP image up to 10 MB.");
  }
  const response = await fetch("/api/uploads/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, size: file.size, scope: "products" }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Upload authorization failed.");
  const put = await fetch(result.upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!put.ok) throw new Error("Image upload failed.");
  return result.upload as { key: string; publicUrl: string };
}

export const productImageAccept = allowedImageTypes.join(",");
