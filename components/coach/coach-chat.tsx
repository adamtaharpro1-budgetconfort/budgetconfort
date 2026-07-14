"use client";

import { useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, TriangleAlert, Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createConversation, deleteConversation, deleteAllConversations } from "@/lib/actions/chat";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Que puis-je cuisiner ce soir ?",
  "Je veux perdre 5 kg, aide-moi.",
  "Comment économiser ce mois-ci ?",
  "Prépare ma liste de courses.",
];

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

function relativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function CoachChat({
  conversationId,
  initialMessages,
  conversations,
}: {
  conversationId: string;
  initialMessages: { id: string; role: "user" | "assistant"; text: string }[];
  conversations: ConversationSummary[];
}) {
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const uiMessages: UIMessage[] = initialMessages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.text }],
  }));

  const { messages, sendMessage, status, error, regenerate } = useChat({
    id: conversationId,
    messages: uiMessages,
    transport: new DefaultChatTransport({ api: "/api/coach", body: { conversationId } }),
  });

  function handleSend(text: string) {
    if (!text.trim()) return;
    sendMessage({ text });
    setInput("");
  }

  async function handleNewConversation() {
    await createConversation();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Supprimer cette conversation ? Cette action est irréversible.")) return;
    await deleteConversation(id);
    if (id === conversationId) window.location.href = "/coach";
    else window.location.reload();
  }

  async function handleDeleteAll() {
    if (!window.confirm(`Supprimer toutes les conversations (${conversations.length}) ? Cette action est irréversible.`)) return;
    await deleteAllConversations();
    window.location.href = "/coach";
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar historique — desktop */}
      <aside className="hidden w-64 shrink-0 flex-col md:flex">
        <Button onClick={handleNewConversation} className="mb-3">
          <Plus className="h-4 w-4" /> Nouvelle conversation
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations.map((c) => (
            <ConversationRow key={c.id} conversation={c} active={c.id === conversationId} onDelete={handleDelete} />
          ))}
        </div>
        {conversations.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Tout supprimer
          </button>
        )}
      </aside>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Coach IA</h1>
          <button onClick={() => setHistoryOpen(true)} className="text-muted-foreground md:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.length === 0 && (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">
                  Pose-moi une question sur ton budget, tes repas ou tes objectifs.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div className={cn("max-w-[80%] rounded-lg px-4 py-2 text-sm", m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {m.parts.map((part, i) => (part.type === "text" ? <span key={i}>{part.text}</span> : null))}
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">La réponse n&apos;a pas pu être générée.</p>
                <p className="mt-0.5 text-xs text-destructive/80">
                  Le service IA est peut-être temporairement surchargé. Réessaie dans quelques instants.
                </p>
              </div>
              <button
                onClick={() => regenerate()}
                className="shrink-0 rounded-md bg-destructive/15 px-2 py-1 text-xs font-medium hover:bg-destructive/25"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex gap-2 border-t border-border pt-4"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écris ton message..."
            disabled={status === "streaming" || status === "submitted"}
          />
          <Button type="submit" disabled={status === "streaming" || status === "submitted"}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Historique — mobile (bottom sheet) */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setHistoryOpen(false)} />
          <div className="relative max-h-[75vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Conversations</p>
              <button onClick={() => setHistoryOpen(false)} className="text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <Button onClick={handleNewConversation} className="mb-3 w-full">
              <Plus className="h-4 w-4" /> Nouvelle conversation
            </Button>
            <div className="space-y-1">
              {conversations.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={c.id === conversationId}
                  onDelete={handleDelete}
                  onNavigate={() => setHistoryOpen(false)}
                />
              ))}
            </div>
            {conversations.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Tout supprimer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationRow({
  conversation,
  active,
  onDelete,
  onNavigate,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onDelete: (id: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
      )}
    >
      <Link href={`/coach/${conversation.id}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{conversation.title}</span>
      </Link>
      <span className="shrink-0 text-[10px] opacity-70">{relativeDate(conversation.updatedAt)}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          onDelete(conversation.id);
        }}
        className="shrink-0 opacity-0 hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
