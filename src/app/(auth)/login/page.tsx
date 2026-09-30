import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  return (
    <>
      <h1 className="mb-5 font-display text-3xl font-bold">Masuk</h1>
      <LoginForm next={next} linkError={params.error === "link"} />
    </>
  );
}
