import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Landmark, Smartphone, Store, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function Home() {
  return (
    <Screen title="Transend">
      <div className="hero-logo">
        <Logo markOnly />
      </div>
      <p className="lead">Send money home to Haiti. Testnet demo. No real money.</p>
      <div className="stack">
        <Button href="/app/login" icon={Smartphone}>
          Sender app
        </Button>
        <Button href="/shop/login" variant="secondary" icon={Store}>
          Shop app
        </Button>
        <Button href="/proof" variant="secondary" icon={ShieldCheck}>
          Proof for judges
        </Button>
        <Button href="/admin/cards" variant="secondary" icon={Landmark}>
          Admin
        </Button>
      </div>
    </Screen>
  );
}
