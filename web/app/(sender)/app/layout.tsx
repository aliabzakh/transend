import Link from "next/link";
import { Mail } from "lucide-react";
import { s } from "@/strings/sender.en";
import { Logo } from "@/components/ui/Logo";

export default function SenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-root">
      <header className="app-header">
        <Link href="/" className="brand">
          <Logo wordmark={s.brand} />
        </Link>
        <Link href="/app/inbox" className="nav-link">
          <Mail className="icon" aria-hidden />
          <span>{s.nav.inbox}</span>
        </Link>
      </header>
      {children}
      <footer className="app-footer">{s.footer}</footer>
    </div>
  );
}
