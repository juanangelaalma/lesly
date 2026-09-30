import type { Metadata } from "next";
import { UpdatePasswordForm } from "@/features/auth/auth-forms";
import { requireSignedIn } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Kata sandi baru" };

export default async function UpdatePasswordPage() {
  await requireSignedIn();
  return (
    <>
      <h1 className="mb-5 font-display text-3xl font-bold">Buat kata sandi baru</h1>
      <UpdatePasswordForm />
    </>
  );
}
