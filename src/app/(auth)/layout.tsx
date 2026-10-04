import { Brand } from "@/components/brand";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="auth-page">
      <div className="auth-stack">
        <Brand centered />
        {children}
      </div>
    </main>
  );
}
