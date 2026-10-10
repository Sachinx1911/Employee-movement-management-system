import {
  LayoutDashboard,
  SquarePen,
  LogIn,
  FileText,
  CalendarRange,
  Database,
  Settings,
  Users,
  MapPin,
  FileBadge,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { MASTER_PERMISSION, SETTINGS_PERMISSIONS, type Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown when the user has any of these (none = everyone). */
  perms?: Permission[];
  children?: NavItem[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new-entry", label: "New Entry", icon: SquarePen, perms: ["entries.create", "entries.markIn", "entries.editAll"] },
  { href: "/daily-report", label: "Daily Report", icon: FileText, perms: ["reports.daily"] },
  { href: "/monthly-report", label: "Monthly Report", icon: CalendarRange, perms: ["reports.monthly"] },
  {
    href: "/master-data",
    label: "Master Data",
    icon: Database,
    perms: Object.values(MASTER_PERMISSION),
    children: [
      { href: "/master-data?tab=employees", label: "Employees", icon: Users, perms: [MASTER_PERMISSION.employees] },
      { href: "/master-data?tab=locations", label: "Locations", icon: MapPin, perms: [MASTER_PERMISSION.locations] },
      { href: "/master-data?tab=purposes", label: "Purpose", icon: FileBadge, perms: [MASTER_PERMISSION.purposes] },
      { href: "/master-data?tab=authorizers", label: "Authorized By", icon: UserCheck, perms: [MASTER_PERMISSION.authorizers] },
    ],
  },
  { href: "/settings", label: "Settings", icon: Settings, perms: SETTINGS_PERMISSIONS },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/new-entry", label: "OUT", icon: SquarePen, perms: ["entries.create"] },
  { href: "/new-entry?mode=in", label: "MARK IN", icon: LogIn, perms: ["entries.markIn"] },
  { href: "/daily-report", label: "Report", icon: FileText, perms: ["reports.daily"] },
];

const allowed = (item: NavItem, permissions: Permission[]) => !item.perms || item.perms.some((p) => permissions.includes(p));

/** Menu for a user: items and sub-items they have permission for. */
export function navFor(permissions: Permission[], items: NavItem[] = NAV_ITEMS): NavItem[] {
  return items
    .filter((item) => allowed(item, permissions))
    .map((item) => (item.children ? { ...item, children: navFor(permissions, item.children) } : item));
}

export function titleForPath(pathname: string) {
  const item = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return item?.label ?? "DDSR GROUP";
}
