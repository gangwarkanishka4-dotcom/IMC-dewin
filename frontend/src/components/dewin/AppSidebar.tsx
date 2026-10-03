import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Video,
  IdCard,
  ScanFace,
  Smile,
  Footprints,
  Box,
  Cctv,
  Building2,
  Settings,
  type LucideIcon,
} from "lucide-react";
import logo from "@/assets/deco-vision-logo.png";

type NavItem = { label: string; to: string; icon: LucideIcon };
type NavGroup = { heading?: string; items: NavItem[] };

const groups: NavGroup[] = [
  { items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard }] },
  {
    heading: "Monitoring",
    items: [
      { label: "Vision", to: "/live-analytics", icon: Video },
    ],
  },
  {
    heading: "People",
    items: [
      { label: "Identity", to: "/identity", icon: IdCard },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { label: "Face Recognition", to: "/face-recognition", icon: ScanFace },
      { label: "Mood / Behavior Analytics", to: "/mood-detection", icon: Smile },
      { label: "Footfall Analytics", to: "/footfall", icon: Footprints },
      { label: "Object Analytics", to: "/object-detection", icon: Box },
    ],
  },
  {
    heading: "Management",
    items: [
      { label: "Camera Management", to: "/cameras", icon: Cctv },
      { label: "Site Management", to: "/site-management", icon: Building2 },
    ],
  },
  { items: [{ label: "Settings", to: "/settings", icon: Settings }] },
];

export function AppSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[64px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card px-2 py-5 md:w-[252px] md:px-3">
      <div className="mb-5 flex items-center justify-center gap-2.5 border-b border-border px-1 pb-5 md:justify-start md:px-2">
        <img src={logo}alt="Deco Vision logo" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
        <span className="hidden text-lg font-extrabold tracking-tight text-navy md:inline">Deco Vision</span>
      </div>

      <nav className="flex flex-col gap-4">
        {groups.map((group, i) => (
          <div key={group.heading ?? i} className="flex flex-col gap-0.5">
            {group.heading && (
              <p className="mb-1 hidden px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:block">
                {group.heading}
              </p>
            )}
            {group.items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                activeOptions={{ exact: item.to === "/" }}
                className="flex items-center justify-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:bg-secondary hover:text-navy data-[status=active]:bg-primary data-[status=active]:font-semibold data-[status=active]:text-primary-foreground data-[status=active]:shadow-soft md:justify-start"
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="hidden truncate md:inline">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
