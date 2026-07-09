import Link from "next/link";
import { requestPasswordReset } from "../login/actions";
import { Eyebrow, inputCls, Field } from "@/components/Shell";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Eyebrow>Waqf‑M · Registry</Eyebrow>
          <h1 className="mt-2 font-serif-display text-3xl tracking-tight">Reset your password</h1>
          <p className="mt-2 text-sm text-muted">
            Enter your account email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="rounded-[10px] border border-line bg-white p-6 shadow-sm">
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
            <button
              formAction={requestPasswordReset}
              className="w-full rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-goldink transition-colors hover:bg-golddark"
            >
              Send reset link
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-muted underline decoration-line2 underline-offset-4 hover:text-ink">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
