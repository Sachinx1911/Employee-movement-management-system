import type { Metadata } from "next";
import { MasterDataView, type MasterTab } from "@/components/master-data/master-data-view";
import { requireAdmin } from "@/lib/auth-guard";
import { listAuthorizers, listDepartments, listEmployees, listLocations, listPurposes } from "@/lib/queries/masters";

export const metadata: Metadata = { title: "Master Data" };

const TABS: MasterTab[] = ["employees", "locations", "purposes", "authorizers"];

export default async function MasterDataPage({ searchParams }: PageProps<"/master-data">) {
  await requireAdmin();
  const { tab, q } = await searchParams;
  const initialTab = TABS.includes(tab as MasterTab) ? (tab as MasterTab) : "employees";

  const [employees, locations, purposes, authorizers, departments] = await Promise.all([
    listEmployees(),
    listLocations(),
    listPurposes(),
    listAuthorizers(),
    listDepartments(),
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
    />
  );
}
