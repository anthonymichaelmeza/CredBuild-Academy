"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Crosshair,
  Timer,
  ChartNoAxesCombined,
  Layers,
  Library,
  CalendarDays,
  Settings,
  ArrowUpRight,
  Menu,
  X,
  ShieldCheck,
  HardHat,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
const navigation = [
  ["/", "Dashboard", LayoutDashboard],
  ["/learn", "Learn", BookOpen],
  ["/programs", "Certification Programs", GraduationCap],
  ["/practice", "Practice", Crosshair],
  ["/exam", "Exam Simulator", Timer],
  ["/performance", "My Performance", ChartNoAxesCombined],
  ["/flashcards", "Flashcards", Layers],
  ["/reference", "Reference Library", Library],
  ["/planner", "Study Planner", CalendarDays],
  ["/coach", "AI Study Coach", MessageSquare],
] as const;
export function Shell({
  children,
  managed,
  browserOnly = false,
}: {
  children: React.ReactNode;
  managed: boolean;
  browserOnly?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current =
    navigation.find(([href]) =>
      href === "/" ? pathname === "/" : pathname.startsWith(href),
    )?.[1] || "Account Settings";
  return (
    <div className="app-shell">
      <div className="mobile-bar">
        <Link href="/" className="wordmark">
          credbuilt<span>.</span>
        </Link>
        <button
          className="icon-button"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${open ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span
            className="brand-symbol"
            aria-label="Temporary logo placeholder"
          >
            <HardHat size={23} />
          </span>
          <span>
            <span className="wordmark">
              credbuilt<span>.</span>
            </span>
            <span className="brand-sub">ACADEMY</span>
          </span>
        </Link>
        <div className="track-selector">
          <span className="track-icon">C</span>
          <div>
            <strong>CHST Preparation</strong>
            <small>Your certification track</small>
          </div>
        </div>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          {navigation.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`nav-item ${(href === "/" ? pathname === "/" : pathname.startsWith(href)) ? "active" : ""}`}
              aria-current={
                (href === "/" ? pathname === "/" : pathname.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Practice" && <span className="nav-new">DEMO</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <ShieldCheck size={21} />
            <strong>Build your next chapter.</strong>
            <p>Focused practice. Stronger understanding. One step at a time.</p>
            <Link href="/practice">
              Start practicing <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link
            className="nav-item"
            href="/settings"
            onClick={() => setOpen(false)}
          >
            <Settings size={19} />
            Account Settings
          </Link>
          <div className="sidebar-footer">
            BUILD KNOWLEDGE.
            <br />
            <span>EARN CREDENTIALS.</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-dot" />
            {browserOnly
              ? "Browser demo"
              : managed
                ? "Managed sign-in"
                : "Local demo workspace"}
            <Link
              href="/settings"
              aria-label="Open account settings"
              className="avatar"
            >
              CB
            </Link>
          </div>
        </header>
        {browserOnly && (
          <div className="browser-demo-banner" role="note">
            <strong>Browser-only demonstration</strong>
            <span>
              No account or server database. Progress stays in this browser;
              clearing site data or changing the website address resets it.
            </span>
            <Link href="/settings">Demo settings</Link>
          </div>
        )}
        <main id="main-content">{children}</main>
        <footer className="page-footer">
          <span>
            © CredBuilt Academy · Independent certification preparation
          </span>
          <span>Not affiliated with or endorsed by BCSP.</span>
        </footer>
      </div>
    </div>
  );
}
