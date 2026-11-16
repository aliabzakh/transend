import Link from "next/link";
import { a } from "@/strings/admin.en";
import { Logo } from "@/components/ui/Logo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-root">
      <header className="app-header app-header-wide">
        <Link href="/" className="brand">
          <Logo wordmark={a.brand} />
        </Link>
        <nav className="nav-row" aria-label="Admin">
          <Link href="/admin/cards" className="nav-link">
            {a.nav.cards}
          </Link>
          <Link href="/admin/areas" className="nav-link">
            {a.nav.areas}
          </Link>
          <Link href="/admin/cash" className="nav-link">
            {a.nav.cash}
          </Link>
          <Link href="/ops" className="nav-link">
            {a.nav.ops}
          </Link>
        </nav>
      </header>
      {children}
      <footer className="app-footer app-footer-wide">{a.footer}</footer>
    </div>
  );
}
