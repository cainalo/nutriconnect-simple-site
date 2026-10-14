import { createFileRoute } from "@tanstack/react-router";
import { HouseholdPanel } from "@/components/household-panel";

export const Route = createFileRoute("/casa/")({
  component: HouseholdPanel,
});
