import { Screen } from "@/components/ui/Screen";
import { CardFace } from "@/components/CardFace";
import { PrintButton } from "@/components/PrintButton";
import { demoCardIds } from "@/lib/demo/codes";

export default async function AdminPrintSheet({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const { n } = await searchParams;
  const count = Math.min(50, Math.max(1, Math.floor(Number(n)) || 15));
  const ids = demoCardIds(count);
  return (
    <Screen title={`${count} demo cards`} back={{ href: "/admin/cards", label: "Back" }} action={<PrintButton />}>
      <div className="print-sheet">
        {ids.map((id) => (
          <CardFace key={id} cardId={id} />
        ))}
      </div>
    </Screen>
  );
}
