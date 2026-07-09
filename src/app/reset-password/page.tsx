import { updatePassword } from "../login/actions";

// Reached after the email link hits /auth/callback, which establishes a
// recovery session. The user sets a new password here.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="text-sm text-neutral-500">
            Enter a new password for your Waqf‑M account.
          </p>
        </div>
        {error && (
          <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <form className="space-y-3">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="New password (min 8 chars)"
            className="w-full rounded border border-neutral-300 p-2 text-sm"
          />
          <button
            formAction={updatePassword}
            className="w-full rounded bg-neutral-900 p-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Update password
          </button>
        </form>
      </div>
    </main>
  );
}
