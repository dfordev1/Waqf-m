import Link from "next/link";
import { signIn, signUp } from "./actions";
import { Eyebrow, inputCls, Field } from "@/components/Shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Eyebrow>Waqf‑M · Registry</Eyebrow>
          <h1 className="mt-2 font-serif-display text-3xl tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to your registry, or create an account.</p>
        </div>

        <div className="rounded-[10px] border border-line bg-white p-6 shadow-sm">
          {message && (
            <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
              {message}
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {error}
            </p>
          )}
          <form className="space-y-4">
            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                placeholder="you@organization.org"
                className={inputCls}
              />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className={inputCls}
              />
            </Field>
            <div className="flex gap-2 pt-1">
              <button
                formAction={signIn}
                className="flex-1 rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-goldink transition-colors hover:bg-golddark"
              >
                Sign in
              </button>
              <button
                formAction={signUp}
                className="flex-1 rounded-md border border-line2 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ivory"
              >
                Create account
              </button>
            </div>
          </form>
          <div className="mt-5 border-t border-line pt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-muted underline decoration-line2 underline-offset-4 hover:text-ink">
              Forgot your password?
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          Public registry?{" "}
          <Link href="/explorer" className="underline decoration-line2 underline-offset-4 hover:text-ink">
            Browse the explorer
          </Link>{" "}
          — no account needed.
        </p>
      </div>
    </main>
  );
}
