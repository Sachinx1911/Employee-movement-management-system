import { Hammer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "./empty-state";

/** Temporary placeholder while a phase is under construction. */
export function ComingSoon({ phase, what }: { phase: number; what: string }) {
  return (
    <Card>
      <EmptyState icon={Hammer} title={`${what} — under construction`} description={`This section is delivered in Phase ${phase}.`} />
    </Card>
  );
}
