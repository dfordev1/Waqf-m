import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Shell, { PageHeader, Card, EmptyState, Alert, Field, inputCls, btnGold, btnGhost } from "@/components/Shell";
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
type Msg = { sender: string; recipient: string; created_at: string; read_at: string | null };

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

  const [{ data: profiles }, { data: posts }, { data: myMsgs }] = await Promise.all([
    supabase.from("scholar_profiles").select("*").order("created_at"),
    supabase.from("circle_posts").select("*").order("created_at", { ascending: false }).limit(50),
    supabase
      .from("circle_messages")
      .select("sender, recipient, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const members = (profiles ?? []) as Profile[];
  const feed = (posts ?? []) as Post[];
  const msgs = (myMsgs ?? []) as Msg[];
  const me = members.find((m) => m.user_id === user.id);
  const nameOf = (id: string) => members.find((m) => m.user_id === id)?.display_name ?? "Member";

  // conversations: latest message per counterpart + unread count
  const convos = new Map<string, { last: string; unread: number }>();
  for (const m of msgs) {
    const other = m.sender === user.id ? m.recipient : m.sender;
    const c = convos.get(other) ?? { last: m.created_at, unread: 0 };
    if (m.recipient === user.id && !m.read_at) c.unread += 1;
    convos.set(other, c);
  }

  return (
    <Shell active="circle">
      <PageHeader
        eyebrow="Scholars Circle"
        title="Where the authors of this field meet the system"
        subtitle="Every member of the registry is a member of the circle — post to everyone, or message anyone directly."
      />
      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-8">
          {/* Inbox */}
          {convos.size > 0 && (
            <Card title="Your conversations">
              <ul className="space-y-2">
                {[...convos.entries()].map(([other, c]) => (
                  <li key={other}>
                    <Link
                      href={`/circle/dm/${other}`}
                      className="flex items-center justify-between rounded-md border border-line px-4 py-2.5 text-sm transition-colors hover:border-line2"
                    >
                      <span className="font-medium">{nameOf(other)}</span>
                      <span className="flex items-center gap-3 text-xs text-faint">
                        {c.unread > 0 && (
                          <span className="rounded-full bg-gold px-2 py-0.5 font-bold text-goldink">
                            {c.unread} new
                          </span>
                        )}
                        {new Date(c.last).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Profile */}
          <Card title="Your profile">
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
              <button className={btnGold}>Save profile</button>
            </form>
          </Card>

          {/* Directory */}
          <Card title={`Members (${members.length})`}>
            {members.length ? (
              <ul className="space-y-4">
                {members.map((m) => (
                  <li key={m.user_id} className="rounded-md border border-line p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {m.display_name}
                        {m.user_id === user.id && <span className="ml-2 text-xs font-normal text-faint">(you)</span>}
                      </span>
                      {m.field && (
                        <span className="rounded-full border border-line bg-ivory px-2 py-0.5 text-xs text-muted">
                          {m.field}
                        </span>
                      )}
                    </div>
                    {m.affiliation && <div className="mt-1 text-xs text-muted">{m.affiliation}</div>}
                    {m.bio && <p className="mt-2 text-xs leading-relaxed text-muted">{m.bio}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {m.paper_url && (
                        <a href={m.paper_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-verify hover:underline">
                          Key publication ↗
                        </a>
                      )}
                      {m.user_id !== user.id && (
                        <Link href={`/circle/dm/${m.user_id}`} className={`${btnGhost} !px-3 !py-1 !text-xs`}>
                          Message
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>No members yet.</EmptyState>
            )}
          </Card>
        </div>

        {/* Discussion */}
        <Card title="Discussion — everyone in the circle">
          <form action={createPost} className="mb-5">
            <textarea
              name="body"
              rows={3}
              required
              placeholder="Share a question, critique, or idea with the whole circle…"
              className={inputCls}
            />
            <div className="mt-2 flex justify-end">
              <button className={btnGold}>Post</button>
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
                  {p.author !== user.id && (
                    <Link href={`/circle/dm/${p.author}`} className="mt-2 inline-block text-xs font-medium text-verify hover:underline">
                      Message {nameOf(p.author)} →
                    </Link>
                  )}
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
