import { useEffect, useRef, useState, useCallback } from 'react';
import { ScrollText, Trash2, Plus, MessageSquare, X, Menu } from 'lucide-react';
import { motion } from 'motion/react';
import { MessageBubble } from '@xsight/components/chat/MessageBubble';
import { ChatInput } from '@xsight/components/chat/ChatInput';
import { EmptyChat } from '@xsight/components/chat/EmptyChat';
import { ChatCard } from '@xsight/components/chat/ChatCard';
import { AuditModal } from '@xsight/components/chat/AuditModal';
import { ChatErrorBoundary } from '@xsight/components/chat/ChatErrorBoundary';
import { useChatStore } from '@shared/store/chatStore';
import { api, type SessionMeta } from '@shared/api/client';
import { ActionButton } from '@shared/common/ActionButton';
import { AppCard } from '@shared/common/AppCard';
import { StateBlock } from '@shared/common/StateBlock';

export function ChatPage() {
  const messages = useChatStore((s) => s.messages);
  const typing = useChatStore((s) => s.typing);
  const sessionId = useChatStore((s) => s.sessionId);
  const sessions = useChatStore((s) => s.sessions);
  const clear = useChatStore((s) => s.clear);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const setSessionId = useChatStore((s) => s.setSessionId);
  const setSessions = useChatStore((s) => s.setSessions);
  const addSession = useChatStore((s) => s.addSession);
  const removeSession = useChatStore((s) => s.removeSession);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);

  useEffect(() => {
    api.listSessions()
      .then(({ sessions: list }) => {
        setSessions(list);
        if (list.length > 0 && !sessionId) {
          const first = list[0];
          setSessionId(first.id);
          api.loadSession(first.id)
            .then(({ messages: msgs }) => { if (msgs.length) loadMessages(msgs); })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewChat = useCallback(async () => {
    try {
      const { session } = await api.createSession();
      addSession({ id: session.id, title: session.title, createdAt: session.createdAt, messageCount: 0 });
      setSessionId(session.id);
      clear();
    } catch {
      /* ignore */
    }
  }, [addSession, setSessionId, clear]);

  const handleSelectSession = useCallback(async (id: string) => {
    if (id === sessionId) return;
    setSessionId(id);
    try {
      const { messages: msgs } = await api.loadSession(id);
      loadMessages(msgs.length ? msgs : []);
    } catch {
      loadMessages([]);
    }
  }, [sessionId, setSessionId, loadMessages]);

  const handleDeleteSession = useCallback(async (_event: React.MouseEvent, id: string) => {
    try {
      await api.deleteSession(id);
      removeSession(id);
      if (id === sessionId) {
        const remaining = sessions.filter((s: SessionMeta) => s.id !== id);
        if (remaining.length > 0) {
          const next = remaining[0];
          setSessionId(next.id);
          clear();
          api.loadSession(next.id)
            .then(({ messages: msgs }) => { if (msgs.length) loadMessages(msgs); })
            .catch(() => {});
        } else {
          setSessionId(null);
          clear();
        }
      }
    } catch {
      /* ignore */
    }
  }, [sessionId, sessions, removeSession, setSessionId, clear, loadMessages]);

  const handleClearChat = useCallback(() => {
    clear();
    if (sessionId) api.deleteSession(sessionId).catch(() => {});
    removeSession(sessionId ?? '');
    setSessionId(null);
  }, [clear, sessionId, removeSession, setSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, typing]);

  const hasMessages = messages.length > 0;
  const sessionsPanel = (
    <SessionList
      sessions={sessions}
      sessionId={sessionId}
      onNew={() => { void handleNewChat(); setSessionsOpen(false); }}
      onSelect={(id) => { void handleSelectSession(id); setSessionsOpen(false); }}
      onDelete={(event, id) => { void handleDeleteSession(event, id); }}
    />
  );

  return (
    <div className="flex h-[calc(100vh-110px)] w-full min-w-0 max-w-full gap-3 overflow-hidden">
      <div className="hidden w-60 shrink-0 lg:block">{sessionsPanel}</div>

      {sessionsOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button className="absolute inset-0 bg-black/60" aria-label="Close sessions" onClick={() => setSessionsOpen(false)} />
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            className="absolute bottom-0 left-0 top-0 w-[min(320px,86vw)] border-r border-[rgba(255,255,255,0.10)] bg-[#0D0D0D] p-3"
          >
            {sessionsPanel}
          </motion.div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <ActionButton tone="secondary" className="lg:hidden" icon={<Menu className="h-4 w-4" />} onClick={() => setSessionsOpen(true)}>
            Sessions
          </ActionButton>
          {hasMessages && (
            <div className="ml-auto flex items-center gap-2">
              <ActionButton tone="ghost" icon={<ScrollText className="h-3.5 w-3.5" />} onClick={() => setAuditOpen(true)}>
                Audit
              </ActionButton>
              <ActionButton tone="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={handleClearChat}>
                Clear
              </ActionButton>
            </div>
          )}
        </div>

        <div ref={scrollRef} className="flex flex-1 flex-col gap-6 overflow-y-auto px-1 pb-4">
          {!hasMessages ? (
            <EmptyChat />
          ) : (
            <>
              {messages.map((m) => (
                <ChatErrorBoundary key={m.id}>
                  <MessageBubble isAi={m.role === 'ai'}>
                    <div className="flex flex-col gap-3">
                      {m.cards.map((c, i) => (
                        <ChatCard key={i} card={c} />
                      ))}
                    </div>
                  </MessageBubble>
                </ChatErrorBoundary>
              ))}
              {typing && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="ml-11 flex w-fit items-center gap-2 rounded-xl border border-[rgba(167,139,250,0.18)] bg-[rgba(167,139,250,0.08)] px-3 py-2 text-xs"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A78BFA]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A78BFA] [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#A78BFA] [animation-delay:240ms]" />
                  <span className="font-semibold text-[#D1D5DB]">XSight is composing a response...</span>
                </motion.div>
              )}
            </>
          )}
        </div>

        <ChatInput />
      </div>

      <AuditModal open={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}

function SessionList({
  sessions,
  sessionId,
  onNew,
  onSelect,
  onDelete,
}: {
  sessions: SessionMeta[];
  sessionId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (event: React.MouseEvent, id: string) => void;
}) {
  return (
    <AppCard className="flex h-full flex-col gap-3 p-3 md:p-3">
      <ActionButton tone="blue" icon={<Plus className="h-3.5 w-3.5" />} onClick={onNew} className="w-full">
        New Chat
      </ActionButton>

      <div className="flex-1 overflow-y-auto pr-0.5">
        {sessions.length === 0 ? (
          <StateBlock
            compact
            kind="empty"
            icon={<MessageSquare className="h-4 w-4" />}
            title="No conversations yet"
            body="Start a chat and XSight will keep the session here for quick switching."
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {sessions.map((s) => {
              const active = s.id === sessionId;
              return (
                <div
                  key={s.id}
                  className={`group flex w-full items-start gap-2 rounded-xl px-2.5 py-2.5 transition-colors ${
                    active
                      ? 'bg-[rgba(167,139,250,0.16)] text-[#F5F5F5] ring-1 ring-[rgba(167,139,250,0.24)]'
                      : 'text-[#D1D5DB] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F5F5F5]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  >
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold leading-snug">{s.title}</div>
                      {s.lastMessage && <div className="mt-0.5 truncate text-[10px] leading-relaxed text-[#A3A3A3]">{s.lastMessage}</div>}
                      {s.messageCount > 0 && (
                        <div className="mt-1 text-[9px] font-mono text-[#7A7A7A]">
                          {Math.ceil(s.messageCount / 2)} msg{Math.ceil(s.messageCount / 2) !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    title="Delete session"
                    aria-label="Delete session"
                    onClick={(event) => { event.stopPropagation(); onDelete(event, s.id); }}
                    className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-[#7A7A7A] opacity-0 transition-opacity hover:bg-[rgba(239,68,68,0.10)] hover:text-[#EF4444] group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppCard>
  );
}
