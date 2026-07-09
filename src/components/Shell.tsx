import Link from "next/link";
import { signOut } from "@/app/login/actions";

// Shared app shell: top nav + page container.
// variant "app"    → authenticated nav (Dashboard / Explorer / Setup / Sign out)
// variant "public" → public nav (Explorer / Sign in)
export default function Shell({
  variant = "app",
  active,
  width = "max-w-5xl",
  children,
}: {
  variant?: "app" | "public";
  active?: "dashboard" | "explorer" | "setup";
  width?: string;
  children: React.ReactNode;
}) {
  const link = (href: string, label: string, key: string) => (
    <Link
      href={href}
      className={
        active === key
          ? "border-b-2 border-gold pb-0.5 text-sm font-semibold text-ink"
          : "text-sm text-muted transition-colors hover:text-ink"
      }
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <nav className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className={`mx-auto flex h-14 items-center justify-between px-5 ${width}`}>
          <Link href={variant === "app" ? "/dashboard" : "/explorer"} className="flex items-baseline gap-2">
            <span className="font-serif-display text-lg font-bold tracking-tight">Waqf‑M</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-gold">Registry</span>
          </Link>
          <div className="flex items-center gap-6">
            {variant === "app" ? (
              <>
                {link("/dashboard", "Dashboard", "dashboard")}
                {link("/explorer", "Explorer", "explorer")}
                {link("/setup", "Setup", "setup")}
                <form action={signOut}>
                  <button className="rounded-md border border-line2 px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-ink hover:text-ink">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                {link("/explorer", "Explorer", "explorer")}
                <Link
                  href="/login"
                  className="rounded-md bg-ink px-3.5 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className={`mx-auto px-5 py-10 ${width}`}>{children}</main>
    </div>
  );
}

// Small shared primitives so every page reads the same.
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-gold">
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-2 font-serif-display text-3xl tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[10px] border border-line bg-white ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.12em]">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line2 bg-ivory px-4 py-6 text-center text-sm text-faint">
      {children}
    </div>
  );
}

export function Alert({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      className={
        kind === "error"
          ? "mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          : "mb-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      }
    >
      {children}
    </p>
  );
}

// Form field building blocks (label above input).
export const inputCls =
  "w-full rounded-md border border-line2 bg-white px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25";
export const btnPrimary =
  "rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800";
export const btnGold =
  "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-goldink transition-colors hover:bg-golddark";
export const btnGhost =
  "rounded-md border border-line2 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ivory";

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
