import { redirect } from "next/navigation";
export default async function LegacyProductPage({ params }: { params: Promise<{ productId: string }> }) { redirect(`/admin/products/${(await params).productId}`); }
