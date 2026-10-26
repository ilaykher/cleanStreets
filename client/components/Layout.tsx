import { Link, NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Hazard map", end: true },
  { to: "/dashboard", label: "Community insights", end: false },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-card">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="m9 11 2 2 4-4"
            className="stroke-accent"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-lg font-extrabold tracking-tight">
        Clean<span className="text-primary">Streets</span>
      </span>
    </span>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <Link to="/" aria-label="CleanStreets home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm font-semibold">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3.5 py-1.5 transition-colors sm:px-4",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/70 bg-card">
        <div className="mx-auto max-w-7xl px-5 py-6 text-sm text-muted-foreground">
          <p>
            <span className="font-bold text-foreground">CleanStreets</span> · Community-verified
            hazard map
          </p>
        </div>
      </footer>
    </div>
  );
}
