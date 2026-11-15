import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { a } from "@/strings/admin.en";

/** Shown while the forecasts are computed on the server. */
export default function Loading() {
  return (
    <Screen title={a.cash.title} wide>
      <Skeleton label={a.cash.loading} kind="tall" />
      <Skeleton kind="tall" />
      <Skeleton kind="tall" />
    </Screen>
  );
}
