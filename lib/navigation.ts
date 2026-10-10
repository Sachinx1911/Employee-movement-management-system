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
import { isAdmin, type Role } from "@/lib/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  children?: NavItem[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new-entry", label: "New Entry", icon: SquarePen },
  { href: "/daily-report", label: "Daily Report", icon: FileText },
  { href: "/monthly-report", label: "Monthly Report", icon: CalendarRange, adminOnly: true },
  {
    href: "/master-data",
    label: "Master Data",
    icon: Database,
    adminOnly: true,
    children: [
      { href: "/master-data?tab=employees", label: "Employees", icon: Users },
      { href: "/master-data?tab=locations", label: "Locations", icon: MapPin },
      { href: "/master-data?tab=purposes", label: "Purpose", icon: FileBadge },
      { href: "/master-data?tab=authorizers", label: "Authorized By", icon: UserCheck },
    ],
  },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/new-entry", label: "OUT", icon: SquarePen },
  { href: "/new-entry?mode=in", label: "MARK IN", icon: LogIn },
  { href: "/daily-report", label: "Report", icon: FileText },
];

export function navForRole(role: Role) {
  return NAV_ITEMS.filter((item) => isAdmin(role) || !item.adminOnly);
}

export function titleForPath(pathname: string) {
  const item = NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return item?.label ?? "DDSR GROUP";
}
