import {
  LayoutDashboard,
  AlertTriangle,
  Map,
  Package,
  Truck,
  Brain,
  Route,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  ShieldAlert,
  Siren,
  ScrollText,
  UserCog,
  Navigation,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useLanguage } from "../i18n.jsx";

/* ============================================================
   MENU DEFINITIONS
   Grouped by operational flow:
   Disaster → SOS → Mission → Team + Vehicle → Logistics → Audit
   ============================================================ */

// Section separator marker
const SECTION = (label) => ({ section: label });

const adminMenuItems = [
  { name: "Dashboard",      path: "/",            icon: LayoutDashboard },
  SECTION("Disaster Response"),
  { name: "Disasters",      path: "/incidents",   icon: AlertTriangle },
  { name: "Impact Map",     path: "/impact-map",  icon: Map },
  { name: "SOS & Emergencies", path: "/sos",      icon: Siren },
  SECTION("Operations"),
  { name: "Missions",       path: "/missions",    icon: ClipboardList },
  { name: "Users & Roles",  path: "/users",       icon: UserCog },
  { name: "Vehicles",       path: "/vehicles",    icon: Truck },
  { name: "Logistics",      path: "/logistics",   icon: Route },
  SECTION("Resources & AI"),
  { name: "Resources",      path: "/resources",   icon: Package },
  { name: "AI Prediction",  path: "/prediction",  icon: Brain },
  SECTION("Administration"),
  { name: "Analytics",      path: "/analytics",   icon: BarChart3 },
  { name: "Audit Logs",     path: "/audit-logs",  icon: ScrollText },
  { name: "Settings",       path: "/settings",    icon: Settings },
];

const coordinatorMenuItems = [
  { name: "Dashboard",      path: "/",            icon: LayoutDashboard },
  SECTION("Disaster Response"),
  { name: "Disasters",      path: "/incidents",   icon: AlertTriangle },
  { name: "Impact Map",     path: "/impact-map",  icon: Map },
  { name: "SOS & Emergencies", path: "/sos",      icon: Siren },
  SECTION("Operations"),
  { name: "Missions",       path: "/missions",    icon: ClipboardList },
  { name: "Field Teams",    path: "/teams",       icon: Users },
  { name: "Vehicles",       path: "/vehicles",    icon: Truck },
  { name: "Logistics",      path: "/logistics",   icon: Route },
  SECTION("Resources & AI"),
  { name: "Resources",      path: "/resources",   icon: Package },
  { name: "AI Prediction",  path: "/prediction",  icon: Brain },
  SECTION("Reports"),
  { name: "Analytics",      path: "/analytics",   icon: BarChart3 },
  { name: "Settings",       path: "/settings",    icon: Settings },
];

const fieldTeamMenuItems = [
  { name: "My Missions",    path: "/missions",    icon: ClipboardList },
  { name: "SOS & Emergencies", path: "/sos",      icon: Siren },
  { name: "Settings",       path: "/settings",    icon: Settings },
];

/* ============================================================
   HELPERS
   ============================================================ */

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCurrentUser() {
  const keys = ["current_user", "currentUser", "loggedInUser", "loginUser", "userData", "user"];
  for (const key of keys) {
    const stored = localStorage.getItem(key);
    if (!stored) continue;
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") return parsed;
    } catch { /* ignore */ }
  }
  return null;
}

/* ============================================================
   SIDEBAR
   ============================================================ */

function Sidebar() {
  const { t } = useLanguage();
  const user = getCurrentUser();
  const userRole = normalizeRole(user?.role);

  let menuItems = [];
  let roleLabel = t("unknownRole");

  if (userRole === "admin" || userRole === "administrator") {
    menuItems = adminMenuItems;
    roleLabel = t("roleAdmin");
  } else if (userRole === "emergency coordinator" || userRole === "emergencycoordinator") {
    menuItems = coordinatorMenuItems;
    roleLabel = t("roleCoordinator");
  } else if (userRole === "field team" || userRole === "fieldteam") {
    menuItems = fieldTeamMenuItems;
    roleLabel = t("roleFieldTeam");
  }

  const isFieldTeam = userRole === "field team" || userRole === "fieldteam";

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col bg-[#4a0b0b] text-white shadow-xl md:flex">

      {/* BRAND */}
      <div className="flex h-20 shrink-0 items-center border-b border-red-950/60 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-900/40">
            <ShieldAlert size={22} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider text-white">{t("appName")}</h1>
            <p className="mt-0.5 text-[11px] text-red-300/60">{t("appSubtitle")}</p>
          </div>
        </div>
      </div>

      {/* USER */}
      <div className="border-b border-red-950/60 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/60">{t("signedInAs")}</p>
        <p className="mt-1 truncate text-sm font-semibold text-white">{user?.name || "User"}</p>
        <p className="mt-0.5 text-xs text-red-300/60">{roleLabel}</p>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">

          {menuItems.map((item, idx) => {

            // Section header
            if (item.section) {
              return (
                <p
                  key={`section-${idx}`}
                  className="mb-1 mt-4 px-3 text-[9px] font-black uppercase tracking-[0.18em] text-red-400/50 first:mt-0"
                >
                  {item.section}
                </p>
              );
            }

            const Icon = item.icon;
            const isSOS = item.path === "/sos";

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? isSOS
                        ? "bg-red-500 text-white shadow-md shadow-red-950/40"
                        : "bg-red-600 text-white shadow-md shadow-red-950/40"
                      : isSOS
                      ? "text-red-300/80 hover:bg-red-500/20 hover:text-red-200"
                      : "text-red-100/60 hover:bg-red-950/50 hover:text-white"
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} className="shrink-0" />
                <span>{item.name}</span>
                {isSOS && (
                  <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-1 ring-red-400/40">
                    !
                  </span>
                )}
              </NavLink>
            );
          })}

          {menuItems.length === 0 && (
            <div className="rounded-lg border border-red-950/60 bg-red-950/20 px-3 py-4">
              <p className="text-xs font-semibold text-red-200">{t("noAccess")}</p>
              <p className="mt-1 text-[11px] text-red-300/50">{t("contactAdministrator")}</p>
            </div>
          )}

        </div>
      </nav>

      {/* FIELD TEAM BADGE */}
      {isFieldTeam && (
        <div className="shrink-0 px-3 pb-2">
          <div className="rounded-xl border border-red-950/70 bg-red-950/20 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                <Navigation size={16} className="text-red-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-50">{t("fieldTeams")}</p>
                <p className="mt-0.5 text-[10px] text-red-300/50">{t("assignedMissionsOnly")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM STATUS */}
      <div className="shrink-0 p-3">
        <div className="rounded-xl border border-red-950/70 bg-red-950/20 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
            </div>
            <div>
              <p className="text-xs font-semibold text-red-50">{t("systemOperational")}</p>
              <p className="mt-0.5 text-[10px] text-red-300/50">{t("allServicesOnline")}</p>
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
}

export default Sidebar;
