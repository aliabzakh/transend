import Link from "next/link";
import { s } from "@/strings/shop.en";
import { Logo } from "@/components/ui/Logo";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="app-header">
        <Link href="/shop" className="brand">
          <Logo wordmark={s.brand} />
        </Link>
      </header>
      {children}
      <footer className="app-footer">{s.footer}</footer>
    </>
  );
}
