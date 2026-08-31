import { redirect } from "next/navigation";

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const [{ locale }, { q }] = await Promise.all([params, searchParams]);
  redirect(`/${locale}/products${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}
