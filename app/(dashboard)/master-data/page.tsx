import type { Metadata } from "next";
import { MasterDataView, type MasterTab } from "@/components/master-data/master-data-view";
import { can, requirePermission } from "@/lib/auth-guard";
import { MASTER_PERMISSION } from "@/lib/permissions";
import { listAuthorizers, listDepartments, listEmployees, listLocations, listPurposes } from "@/lib/queries/masters";

export const metadata: Metadata = { title: "Master Data" };

const TABS: MasterTab[] = ["employees", "locations", "purposes", "authorizers"];

export default async function MasterDataPage({ searchParams }: PageProps<"/master-data">) {
  const user = await requirePermission(...Object.values(MASTER_PERMISSION));
  const allowed = TABS.filter((t) => can(user, MASTER_PERMISSION[t]));
  const { tab, q } = await searchParams;
  const initialTab = allowed.includes(tab as MasterTab) ? (tab as MasterTab) : allowed[0]!;
  const has = (t: MasterTab) => allowed.includes(t);

  // Only load the lists this user may see (locations need purposes for their form).
  const [employees, locations, purposes, authorizers, departments] = await Promise.all([
    has("employees") ? listEmployees() : [],
    has("locations") ? listLocations() : [],
    has("purposes") || has("locations") ? listPurposes() : [],
    has("authorizers") ? listAuthorizers() : [],
    has("employees") ? listDepartments() : [],
  ]);

  return (
    <MasterDataView
      initialTab={initialTab}
      initialQuery={typeof q === "string" ? q.slice(0, 60) : ""}
      employees={employees}
      locations={locations}
      purposes={purposes}
      authorizers={authorizers}
      departments={departments}
      allowed={allowed}
    />
  );
}
