import Link from "next/link";
import { redirect } from "next/navigation";
import { saveCustomerProfile } from "@/app/[locale]/account/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/db";

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ saved?: string }> }) {
  const locale = (await params).locale === "en" ? "en" : "de"; const de = locale === "de"; const user = await getCurrentUser(); if (!user) redirect(`/${locale}/login`);
  const [profile, feedback] = await Promise.all([prisma.user.findUniqueOrThrow({ where: { id: user.id }, include: { address: true } }), searchParams]);
  const fields = [{ name: "name", label: de ? "Name" : "Name", value: profile.name ?? "", autoComplete: "name" }, { name: "phone", label: de ? "Telefon" : "Phone", value: profile.phone ?? "", autoComplete: "tel" }, { name: "street", label: de ? "Strasse und Hausnummer" : "Street and number", value: profile.address?.street ?? "", autoComplete: "street-address" }, { name: "streetExtra", label: de ? "Adresszusatz (optional)" : "Address extra (optional)", value: profile.address?.streetExtra ?? "", autoComplete: "address-line2" }, { name: "postalCode", label: de ? "Postleitzahl" : "Postal code", value: profile.address?.postalCode ?? "", autoComplete: "postal-code" }, { name: "city", label: de ? "Ort" : "City", value: profile.address?.city ?? "", autoComplete: "address-level2" }];
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-4xl font-bold">{de ? "Mein Konto" : "My account"}</h1><p className="mt-1 text-sm text-muted">{profile.email}</p></div><Link href={`/${locale}/account/orders`} className="font-bold text-primary hover:underline">{de ? "Bestellungen" : "Orders"}</Link></div>{feedback.saved && <p role="status" className="rounded-xl bg-success/10 p-3 text-success">{de ? "Profil gespeichert." : "Profile saved."}</p>}<Card className="p-6"><form action={saveCustomerProfile} className="grid gap-4 sm:grid-cols-2"><input type="hidden" name="locale" value={locale} />{fields.map((field) => <div key={field.name} className={field.name === "street" || field.name === "streetExtra" ? "sm:col-span-2" : ""}><Label htmlFor={field.name}>{field.label}</Label><Input className="mt-1" id={field.name} name={field.name} defaultValue={field.value} autoComplete={field.autoComplete} required={field.name !== "streetExtra"} /></div>)}<div className="sm:col-span-2 flex justify-end"><button className="min-h-11 rounded-xl bg-primary px-6 font-bold text-white">{de ? "Profil speichern" : "Save profile"}</button></div></form></Card></div>;
}
