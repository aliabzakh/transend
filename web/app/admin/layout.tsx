import Link from "next/link";
import { common } from "@/strings/common";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="app-header">
        <Link href="/admin/cards" className="brand">
          {common.brand} admin
        </Link>
        <nav className="nav-row" aria-label="Admin">
          <Link href="/admin/cards" className="nav-link">Cards</Link>
          <Link href="/admin/areas" className="nav-link">Areas</Link>
          <Link href="/admin/cash" className="nav-link">Cash</Link>
        </nav>
      </header>
      {children}
      <footer className="app-footer">{common.footer}</footer>
    </>
  );
}
