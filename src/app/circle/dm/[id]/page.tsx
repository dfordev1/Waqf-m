import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Shell, { PageHeader, Card, EmptyState, Alert, inputCls, btnGold } from "@/components/Shell";
import { sendMessage } from "../../actions";

export const dynamic = "force-dynamic";

type Msg = { id: string; sender: string; recipient: string; body: string; created_at: string };

export default async function DmPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: otherId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (otherId === user.id) redirect("/circle");

  const { data: other } = await supabase
    .from("scholar_profiles")
    .select("display_name, affiliation")
    .eq("user_id", otherId)
    .single();

  const { data: msgs } = await supabase
    .from("circle_messages")
    .select("*")
    .or(
      `and(sender.eq.${user.id},recipient.eq.${otherId}),and(sender.eq.${otherId},recipient.eq.${user.id})`
    )
    .order("created_at")
    .limit(200);

  // mark their messages to me as read
  await supabase
    .from("circle_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender", otherId)
    .eq("recipient", user.id)
    .is("read_at", null);

  const thread = (msgs ?? []) as Msg[];

  return (
    <Shell active="circle" width="max-w-3xl">
      <Link href="/circle" className="text-sm text-muted hover:underline">← Circle</Link>
      <div className="mt-3">
        <PageHeader
          eyebrow="Direct message"
          title={other?.display_name ?? "Member"}
          subtitle={other?.affiliation ?? undefined}
        />
      </div>
      {error && <Alert kind="error">{error}</Alert>}

      <Card>
        {thread.length ? (
          <ul className="space-y-3">
            {thread.map((m) => {
              const mine = m.sender === user.id;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={
                      mine
                        ? "max-w-[80%] rounded-lg rounded-br-sm bg-ink px-4 py-2.5 text-sm text-white"
                        : "max-w-[80%] rounded-lg rounded-bl-sm border border-line bg-ivory px-4 py-2.5 text-sm text-ink"
                    }
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    <div className={`mt-1 text-[10px] ${mine ? "text-neutral-400" : "text-faint"}`}>
                      {new Date(m.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>No messages yet — say salaam.</EmptyState>
        )}

        <form action={sendMessage} className="mt-5 border-t border-line pt-4">
          <input type="hidden" name="recipient" value={otherId} />
          <textarea name="body" rows={2} required placeholder="Write a message…" className={inputCls} />
          <div className="mt-2 flex justify-end">
            <button className={btnGold}>Send</button>
          </div>
        </form>
      </Card>
    </Shell>
  );
}
