import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import "@/styles/auth.css";

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Logo />
      </header>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
