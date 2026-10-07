import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import { getAppSettings } from "@/lib/queries/settings";

export default async function Home() {
  const user = await requireUser();
  const { appearance } = await getAppSettings();
  redirect(user.role === "ADMIN" ? appearance.landingAdmin : appearance.landingStaff);
}
