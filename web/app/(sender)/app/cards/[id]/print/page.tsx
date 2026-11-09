import { Screen } from "@/components/ui/Screen";
import { CardFace } from "@/components/CardFace";
import { PrintButton } from "@/components/PrintButton";
import { isCardId } from "@/lib/demo/codes";
import { s } from "@/strings/sender.en";

export default async function PrintCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardId = id.toUpperCase();
  if (!isCardId(cardId)) {
    return (
      <Screen title="Card" back={{ href: "/app", label: s.back }}>
        <p>We could not find this card.</p>
      </Screen>
    );
  }
  return (
    <Screen title={s.card.download} back={{ href: `/app/cards/${cardId}`, label: s.back }} action={<PrintButton />}>
      <CardFace cardId={cardId} />
    </Screen>
  );
}
