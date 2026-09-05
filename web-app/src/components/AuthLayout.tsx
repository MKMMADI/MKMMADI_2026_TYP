import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import "@/styles/auth.css";

interface AuthLayoutProps {
  children: ReactNode;
  showHero?: boolean;
}

export default function AuthLayout({ children, showHero = false }: AuthLayoutProps) {
  return (
    <div className={`auth-page${showHero ? " auth-page--split" : ""}`}>
      {showHero && (
        <aside className="auth-hero" aria-label="BookSpace workspace">
          <Logo inverse />
          <div className="auth-hero-copy">
            <span className="auth-eyebrow">BookSpace</span>
            <h2>Spaces that inspire your best work.</h2>
            <p>Plan, book, and manage every meeting space in one place.</p>
          </div>
          <div className="auth-hero-art" aria-hidden="true">
            <span className="auth-art-window" />
            <span className="auth-art-table" />
            <span className="auth-art-chair auth-art-chair--left" />
            <span className="auth-art-chair auth-art-chair--right" />
            <span className="auth-art-plant" />
          </div>
        </aside>
      )}
      <section className="auth-content">
        <header className="auth-header">
          <Logo />
        </header>
        <main className="auth-main">
          <div className="auth-card">{children}</div>
        </main>
      </section>
    </div>
  );
}
