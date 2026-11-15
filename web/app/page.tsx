import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Landmark, Map, Smartphone, Store, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="screen">
      <div className="hero">
        <Logo />
        <p className="eyebrow">Testnet demo · No real money</p>
        <h1 className="hero-title">Cash home, hand to hand.</h1>
        <p className="muted">Send money home to Haiti. Your family collects it at a shop near them, with a card and a PIN.</p>
      </div>
      <div className="stack screen-body">
        <Button big href="/app/login" icon={Smartphone}>
          Sender app
        </Button>
        <Button big href="/shop/login" variant="secondary" icon={Store}>
          Shop app
        </Button>
        <Button href="/proof" variant="secondary" icon={ShieldCheck}>
          Proof for judges
        </Button>
        <div className="split">
          <Button href="/admin/cards" variant="ghost" icon={Landmark}>
            Admin
          </Button>
          <Button href="/ops" variant="ghost" icon={Map}>
            Operations map
          </Button>
        </div>
      </div>
    </main>
  );
}
