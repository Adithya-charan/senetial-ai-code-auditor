import { AnimatePresence, motion } from "framer-motion";
import { Activity, History, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Plus, Settings as Cog, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { api } from "./api";
import { useLoad } from "./hooks";
import { fast, page, spring } from "./motion";

const NAV = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard, match: (p) => p === "/overview" },
  { to: "/new", label: "New Scan", icon: Plus, match: (p) => p === "/new" },
  { to: "/findings", label: "Findings", icon: ShieldAlert, match: (p) => p.startsWith("/findings") },
  { to: "/history", label: "Scan History", icon: History, match: (p) => p === "/history" || p.startsWith("/scans/") },
  { to: "/settings", label: "Settings", icon: Cog, match: (p) => p === "/settings" },
];

const KEY = "sentinel.sidebar";
const read = () => { try { return localStorage.getItem(KEY) === "collapsed"; } catch { return false; } };

export function Brand({ collapsed = false }) {
  return (
    <NavLink className="brand" to="/" aria-label="SENTINEL home">
      <i aria-hidden="true" />{!collapsed && <span>SENTINEL</span>}
    </NavLink>
  );
}

function Nav({ collapsed, pathname }) {
  return (
    <nav className="nav" aria-label="Main">
      {NAV.map((n) => {
        const on = n.match(pathname);
        return (
          <NavLink key={n.to} to={n.to} className={on ? "active" : undefined} aria-current={on ? "page" : undefined}
            aria-label={collapsed ? n.label : undefined}>
            {on && <motion.span layoutId={collapsed ? "navpill-c" : "navpill"} className="navpill" transition={spring} aria-hidden="true" />}
            <n.icon aria-hidden="true" size={18} strokeWidth={1.8} />
            {!collapsed && <span className="navlabel">{n.label}</span>}
            {collapsed && <span className="tip" role="tooltip">{n.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

function ScannerStatus({ collapsed }) {
  const { data, error } = useLoad(api.health, []);
  const ok = !!data && !error;
  const label = ok ? "Backend connected" : error ? "Backend unreachable" : "Checking backend…";
  return (
    <div className="sidestatus" title={`${label}${ok ? ` · database ${data.database}` : ""}`}>
      <Activity size={15} aria-hidden="true" className={ok ? "t-completed" : error ? "t-failed" : "muted"} />
      {!collapsed && <span className="small">{label}</span>}
    </div>
  );
}

export default function Shell({ children }) {
  const [collapsed, setCollapsed] = useState(read);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => { try { localStorage.setItem(KEY, collapsed ? "collapsed" : "open"); } catch { /* storage unavailable */ } }, [collapsed]);
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  return (
    <div className={`shell${collapsed ? " is-collapsed" : ""}`}>
      <header className="topbar">
        <Brand />
        <button className="btn ghost" aria-expanded={open} aria-controls="drawer" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={16} aria-hidden="true" /> : <Menu size={16} aria-hidden="true" />}Menu
        </button>
      </header>

      <motion.aside className="side" initial={false} animate={{ width: collapsed ? 64 : 216 }} transition={{ duration: 0.22 }}>
        <Brand collapsed={collapsed} />
        <Nav collapsed={collapsed} pathname={pathname} />
        <div className="sidefoot">
          <ScannerStatus collapsed={collapsed} />
          <button className="iconbtn" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <PanelLeftOpen size={17} aria-hidden="true" /> : <PanelLeftClose size={17} aria-hidden="true" />}
            {!collapsed && <span className="small">Collapse</span>}
          </button>
        </div>
      </motion.aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div key="scrim" className="scrim" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fast} />
            <motion.div key="drawer" id="drawer" className="drawer" role="dialog" aria-label="Navigation"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.24 }}>
              <Brand /><Nav collapsed={false} pathname={pathname} /><ScannerStatus collapsed={false} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="content">
        <motion.div key={pathname} variants={page} initial="hidden" animate="show">{children}</motion.div>
      </main>
    </div>
  );
}
