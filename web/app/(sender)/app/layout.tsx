import Link from "next/link";
import { Mail } from "lucide-react";
import { s } from "@/strings/sender.en";

export default function SenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="app-header">
        <Link href="/app" className="brand">
          {s.brand}
        </Link>
        <Link href="/app/inbox" className="nav-link">
          <Mail className="icon" aria-hidden />
          <span>{s.nav.inbox}</span>
        </Link>
      </header>
      {children}
      <footer className="app-footer">{s.footer}</footer>
    </>
  );
}
