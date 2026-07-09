import Link from "next/link";
import { requestPasswordReset } from "../login/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-sm text-neutral-500">
            Enter your account email and we&apos;ll send you a reset link.
          </p>
        </div>
        {error && (
          <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <form className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded border border-neutral-300 p-2 text-sm"
          />
          <button
            formAction={requestPasswordReset}
            className="w-full rounded bg-neutral-900 p-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Send reset link
          </button>
        </form>
        <Link href="/login" className="block text-sm text-neutral-500 underline">
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
