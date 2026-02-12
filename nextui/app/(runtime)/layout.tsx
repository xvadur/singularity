import type { ReactNode } from "react";
import { SideNav } from "../../components/side-nav";

export default function RuntimeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="runtime-shell">
      <SideNav />
      <main className="runtime-main">{children}</main>
    </div>
  );
}
