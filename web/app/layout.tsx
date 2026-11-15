import type { Metadata, Viewport } from "next";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../components/ui/ui.css";

export const metadata: Metadata = {
  title: "Transend",
  description: "Send money home to Haiti. Testnet demo. No real money.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1a13", // Night, from styles/tokens.css (the browser bar cannot read a CSS variable)
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
