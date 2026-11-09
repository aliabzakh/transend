import QRCode from "qrcode";
import { Eraser, Smartphone, KeyRound } from "lucide-react";
import { cardStrings } from "@/strings/card";
import { demoCode, groupCode } from "@/lib/demo/codes";
import { CONFIG } from "@/lib/config";

/** One-colour (black on white) card so it prints anywhere. Server component. */
export async function CardFace({ cardId }: { cardId: string }) {
  // The QR holds only the card ID. Recolour it to follow the text colour token.
  const svg = (await QRCode.toString(cardId, { type: "svg", margin: 0 })).replace(
    /(stroke|fill)="#(000000|ffffff)(?:ff)?"/gi,
    (_m, attr: string, hex: string) => (hex === "000000" ? `${attr}="currentColor"` : `${attr}="none"`),
  );
  const icons = [Eraser, Smartphone, KeyRound];
  const lines = Array.from({ length: CONFIG.linesPerCard }, (_, i) => i + 1);
  return (
    <article className="card-face" aria-label={`${cardStrings.title} ${cardId}`}>
      <div className="card-top">
        <div>
          <div className="section-title">{cardStrings.title}</div>
          <div className="mono">
            {cardStrings.idLabel} {cardId}
          </div>
        </div>
        <div className="card-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <div className="card-steps">
        {cardStrings.steps.map((st, i) => {
          const Icon = icons[i];
          return (
            <div key={st.number} className="card-step">
              <Icon className="icon" aria-hidden />
              <span>
                {st.number}. {st.kr}
              </span>
              <span className="muted">{st.fr}</span>
            </div>
          );
        })}
      </div>
      <div className="card-lines mono">
        {lines.map((n) => (
          <div key={n} className="card-line">
            <span>{String(n).padStart(2, "0")}</span>
            <span>{groupCode(demoCode(cardId, n))}</span>
          </div>
        ))}
        <div className="card-line">
          <span>{cardStrings.renewalLabel}</span>
          <span>{groupCode(demoCode(cardId, 21))}</span>
        </div>
      </div>
    </article>
  );
}
