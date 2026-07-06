import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Waqf‑M</h1>
          <p className="text-sm text-neutral-500">
            Sign in or create an account
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
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 chars)"
            className="w-full rounded border border-neutral-300 p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              formAction={signIn}
              className="flex-1 rounded bg-neutral-900 p-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Sign in
            </button>
            <button
              formAction={signUp}
              className="flex-1 rounded border border-neutral-300 p-2 text-sm font-medium hover:bg-neutral-100"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
