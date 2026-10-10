import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { getAppSettings } from "@/lib/queries/settings";
import { isAdmin } from "@/lib/roles";

export default async function Home() {
  const user = await requireUser();
  const { appearance } = await getAppSettings();
  redirect(isAdmin(user.role) ? appearance.landingAdmin : appearance.landingStaff);
}
