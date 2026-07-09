import { updatePassword } from "../login/actions";
import { Eyebrow, inputCls, Field } from "@/components/Shell";

// Reached after the email link hits /auth/callback, which establishes a
// recovery session. The user sets a new password here.
export default async function ResetPasswordPage({
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
          <h1 className="mt-2 font-serif-display text-3xl tracking-tight">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted">Enter a new password for your Waqf‑M account.</p>
        </div>

        <div className="rounded-[10px] border border-line bg-white p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
              {error}
            </p>
          )}
          <form className="space-y-4">
            <Field label="New password">
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className={inputCls}
              />
            </Field>
            <button
              formAction={updatePassword}
              className="w-full rounded-md bg-gold px-4 py-2.5 text-sm font-semibold text-goldink transition-colors hover:bg-golddark"
            >
              Update password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
