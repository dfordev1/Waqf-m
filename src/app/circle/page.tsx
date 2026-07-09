import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Shell, { PageHeader, Card, EmptyState, Alert, Field, inputCls, btnGold } from "@/components/Shell";
import { upsertProfile, createPost } from "./actions";

export const dynamic = "force-dynamic";

type Profile = {
  user_id: string;
  display_name: string;
  affiliation: string | null;
  field: string | null;
  paper_url: string | null;
  bio: string | null;
};
type Post = { id: string; author: string; body: string; created_at: string };

export default async function CirclePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles } = await supabase
    .from("scholar_profiles")
    .select("*")
    .order("created_at");
  const { data: posts } = await supabase
    .from("circle_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const members = (profiles ?? []) as Profile[];
  const feed = (posts ?? []) as Post[];
  const me = members.find((m) => m.user_id === user.id);
  const nameOf = (id: string) => members.find((m) => m.user_id === id)?.display_name ?? "Member";

  return (
    <Shell active="circle">
      <PageHeader
        eyebrow="Scholars Circle"
        title="Where the authors of this field meet the system"
        subtitle="An opt-in directory and open discussion for researchers of waqf, Islamic finance, and verifiable registries."
      />
      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-8">
          {/* Join / edit profile */}
          <Card title={me ? "Your profile" : "Join the circle"}>
            <form action={upsertProfile} className="space-y-4">
              <Field label="Name">
                <input name="display_name" required defaultValue={me?.display_name ?? ""} placeholder="Dr. …" className={inputCls} />
              </Field>
              <Field label="Affiliation">
                <input name="affiliation" defaultValue={me?.affiliation ?? ""} placeholder="University / institution" className={inputCls} />
              </Field>
              <Field label="Field">
                <input name="field" defaultValue={me?.field ?? ""} placeholder="e.g. fiqh of awqāf, blockchain security" className={inputCls} />
              </Field>
              <Field label="Key publication (URL)">
                <input name="paper_url" type="url" defaultValue={me?.paper_url ?? ""} placeholder="https://…" className={inputCls} />
              </Field>
              <Field label="Short bio">
                <textarea name="bio" rows={3} defaultValue={me?.bio ?? ""} placeholder="One or two sentences." className={inputCls} />
              </Field>
              <button className={btnGold}>{me ? "Update profile" : "Join the circle"}</button>
            </form>
          </Card>

          {/* Directory */}
          <Card title={`Members (${members.length})`}>
            {members.length ? (
              <ul className="space-y-4">
                {members.map((m) => (
                  <li key={m.user_id} className="rounded-md border border-line p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{m.display_name}</span>
                      {m.field && (
                        <span className="rounded-full border border-line bg-ivory px-2 py-0.5 text-xs text-muted">
                          {m.field}
                        </span>
                      )}
                    </div>
                    {m.affiliation && <div className="mt-1 text-xs text-muted">{m.affiliation}</div>}
                    {m.bio && <p className="mt-2 text-xs leading-relaxed text-muted">{m.bio}</p>}
                    {m.paper_url && (
                      <a href={m.paper_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-verify hover:underline">
                        Key publication ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>No members yet — be the first to join.</EmptyState>
            )}
          </Card>
        </div>

        {/* Discussion */}
        <Card title="Discussion">
          <form action={createPost} className="mb-5">
            <textarea
              name="body"
              rows={3}
              required
              placeholder={me ? "Share a question, critique, or idea with the circle…" : "Join the circle (left) to post."}
              className={inputCls}
              disabled={!me}
            />
            <div className="mt-2 flex justify-end">
              <button className={btnGold} disabled={!me}>Post</button>
            </div>
          </form>
          {feed.length ? (
            <ul className="space-y-4">
              {feed.map((p) => (
                <li key={p.id} className="rounded-md border border-line p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{nameOf(p.author)}</span>
                    <span className="text-xs text-faint">{new Date(p.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{p.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>
              No posts yet. The first paper on a deployed, verifiable waqf registry hasn&apos;t been
              written — this is a good place to start it.
            </EmptyState>
          )}
        </Card>
      </div>
    </Shell>
  );
}
