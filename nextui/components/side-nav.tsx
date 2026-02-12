"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Command Center" },
  { href: "/chat", label: "Runtime Thread" },
  { href: "/tasks", label: "PowerUnit Board" },
  { href: "/capture", label: "Capture Hub" },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="side-nav">
      <div className="brand">
        <span className="brand-mark">J</span>
        <div>
          <p className="brand-title">Jarvis</p>
          <p className="brand-subtitle">Runtime UX</p>
        </div>
      </div>
      <nav className="nav-links" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href} className={`nav-link${isActive ? " active" : ""}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="side-footer">
        <p className="muted">Session</p>
        <p>Utorok 12.2 Main quest</p>
      </div>
    </aside>
  );
}
