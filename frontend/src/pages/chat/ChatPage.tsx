import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { MessageSquare, Send, Plus, X } from "lucide-react";

import api from "@/services/api";
import {
  connect,
  disconnect,
  getConnection,
  joinRoom,
  leaveRoom,
  sendMessage,
} from "@/services/signalr";
import type { RootState } from "@/store/store";

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
}

interface Room {
  roomId: string;
  recipientName?: string;
  lastMessage: { senderName: string; text: string; createdAt: string };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function dmRoomId(userA: string, userB: string): string {
  const [a, b] = [userA, userB].sort();
  return `dm-${a}-${b}`;
}

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const { user } = useSelector((state: RootState) => state.auth);

  const [apiRooms, setApiRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeRoomName, setActiveRoomName] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [shelterList, setShelterList] = useState<
    { id: string; name: string; ownerId: string }[]
  >([]);
  const [roomNames] = useState<Record<string, string>>({});

  const activeRoomRef = useRef<string | null>(null);
  const prevRoomRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const recipientId = searchParams.get("recipientId") || undefined;
  const recipientName = searchParams.get("recipientName") || "Chat";
  const initialMessage = searchParams.get("message") || "";

  const pendingMessageRef = useRef("");
  const initialMessageAppliedRef = useRef(false);
  const switchRoomRef = useRef<
    (
      roomId: string,
      recipient?: string,
      recipientName?: string,
    ) => Promise<void>
  >(() => Promise.resolve());

  const userId = user?.id ?? null;

  const rooms = useMemo<Room[]>(() => {
    if (!recipientId || !userId) return apiRooms;
    const roomId = dmRoomId(userId, recipientId);
    const exists = apiRooms.find((r) => r.roomId === roomId);
    if (exists) return apiRooms;
    return [
      {
        roomId,
        recipientName,
        lastMessage: {
          senderName: recipientName,
          text: "New conversation",
          createdAt: new Date().toISOString(),
        },
      },
      ...apiRooms,
    ];
  }, [apiRooms, recipientId, recipientName, userId]);

  function scrollToBottom() {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const { data } = await api.get(
        `/chat/rooms/${encodeURIComponent(roomId)}/messages`,
      );
      setMessages((prev) => {
        const ids = new Set(data.map((m: ChatMessage) => m.id));
        const extra = prev.filter((m) => !ids.has(m.id) && m.roomId === roomId);
        return [...data, ...extra].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
    } catch {
      setMessages([]);
    }
  }, []);

  const pendingRecipientRef = useRef<{
    roomId: string;
    recipientId: string | null;
  } | null>(null);

  const switchRoom = useCallback(
    async (roomId: string, recipient?: string, recipientName?: string) => {
      try {
        await connect();
        setConnected(true);
      } catch {
        setConnected(false);
      }

      if (prevRoomRef.current && prevRoomRef.current !== roomId) {
        try {
          await leaveRoom(prevRoomRef.current);
        } catch {
          /* ignore */
        }
      }

      activeRoomRef.current = roomId;
      setActiveRoom(roomId);
      setActiveRoomName(recipientName ?? null);
      setMessages([]);
      prevRoomRef.current = roomId;

      // Always try to join and load - apiRooms may not be populated yet (race on mount)
      const isExisting = apiRooms.some((r) => r.roomId === roomId);
      try {
        await api.post(`/chat/rooms/${encodeURIComponent(roomId)}/join`, {
          recipientId: recipient || null,
        });
      } catch {
        /* ignore — room may not exist yet for brand new DMs */
      }
      try {
        await joinRoom(roomId);
      } catch {
        /* ignore */
      }

      // Load history if room exists on server (join succeeded = room exists)
      await loadMessages(roomId);

      if (!isExisting) {
        // New room — defer backend room creation until first message is sent
        pendingRecipientRef.current = {
          roomId,
          recipientId: recipient || null,
        };
      }

      // Apply pre-filled message from URL (e.g. coming from animal page)
      if (pendingMessageRef.current) {
        setInput(pendingMessageRef.current);
        pendingMessageRef.current = "";
        initialMessageAppliedRef.current = true;
      }
    },
    [loadMessages, apiRooms],
  );

  // Keep ref always pointing to latest switchRoom to avoid stale closure in useEffect
  switchRoomRef.current = switchRoom;
  useEffect(() => {
    let cancelled = false;

    const conn = getConnection();

    conn.off("ReceiveMessage");
    conn.on("ReceiveMessage", (msg: ChatMessage) => {
      if (cancelled) return;
      if (msg.roomId !== activeRoomRef.current) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        // Replace optimistic message from same sender with same text
        const optimisticIdx = prev.findIndex(
          (m) =>
            m.senderId === msg.senderId &&
            m.text === msg.text &&
            m.id.length === 36 &&
            !m.id.startsWith("msg-"),
        );
        if (optimisticIdx !== -1) {
          const next = [...prev];
          next[optimisticIdx] = msg;
          return next;
        }
        return [...prev, msg];
      });
      api
        .get("/chat/rooms")
        .then(({ data }) => {
          if (!cancelled) setApiRooms(data);
        })
        .catch(() => {});
    });

    conn.onreconnected(() => {
      if (!cancelled) setConnected(true);
    });
    conn.onreconnecting(() => {
      if (!cancelled) setConnected(false);
    });
    conn.onclose(() => {
      if (!cancelled) setConnected(false);
    });

    connect()
      .then(() => {
        if (!cancelled) setConnected(true);
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });

    return () => {
      cancelled = true;
      conn.off("ReceiveMessage");
      if (prevRoomRef.current) leaveRoom(prevRoomRef.current).catch(() => {});
      disconnect();
    };
  }, []);

  // Load rooms from API on mount
  useEffect(() => {
    api
      .get("/chat/rooms")
      .then(({ data }) => setApiRooms(data))
      .catch(() => {});
  }, []);

  // Open DM room from URL - runs only when recipientId/userId change, not on every switchRoom recreate
  useEffect(() => {
    if (!recipientId || !userId) return;
    if (!initialMessageAppliedRef.current) {
      pendingMessageRef.current = initialMessage;
    }
    const roomId = dmRoomId(userId, recipientId);
    const timeoutId = window.setTimeout(() => {
      void switchRoomRef.current(roomId, recipientId, recipientName);
    }, 0);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientId, userId]);

  // Auto-open first room if no recipientId in URL
  useEffect(() => {
    if (!recipientId && !activeRoom && rooms.length > 0) {
      const first = rooms[0];
      const timeoutId = window.setTimeout(() => {
        void switchRoom(
          first.roomId,
          undefined,
          first.recipientName ?? undefined,
        );
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [activeRoom, recipientId, rooms, switchRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeRoom || !connected) return;
    const text = input.trim();
    setInput("");

    // Optimistically add message to UI immediately
    const optimisticMsg: ChatMessage = {
      id: crypto.randomUUID(),
      roomId: activeRoom,
      senderId: user?.id ?? "",
      senderName: user?.name ?? "You",
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // If this is a new room, register it on the backend first
      if (pendingRecipientRef.current?.roomId === activeRoom) {
        const { roomId, recipientId } = pendingRecipientRef.current;
        pendingRecipientRef.current = null;
        await api.post(`/chat/rooms/${encodeURIComponent(roomId)}/join`, {
          recipientId,
        });
        api
          .get("/chat/rooms")
          .then(({ data }) => setApiRooms(data))
          .catch(() => {});
      }
      await sendMessage(activeRoom, text);
    } catch {
      // Remove optimistic message on failure but do NOT restore input —
      // the message was already cleared intentionally and restoring it
      // causes the "text stays in input" bug when SignalR briefly lags.
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    }
  }

  async function handleOpenNewChat() {
    if (showNewRoom) {
      setShowNewRoom(false);
      return;
    }
    try {
      const { data } = await api.get("/shelters?page=1&pageSize=100");
      const shelters = (Array.isArray(data?.shelters) ? data.shelters : []) as {
        id?: string;
        Id?: string;
        name?: string;
        Name?: string;
        ownerId?: string;
        OwnerId?: string;
      }[];
      setShelterList(
        shelters
          .filter((s) => (s.ownerId ?? s.OwnerId) !== user?.id)
          .map((s) => ({
            id: s.id ?? s.Id ?? "",
            name: s.name ?? s.Name ?? "Shelter",
            ownerId: s.ownerId ?? s.OwnerId ?? "",
          }))
          .filter((s) => s.id && s.ownerId),
      );
    } catch {
      setShelterList([]);
    }
    setShowNewRoom(true);
  }

  function handleStartChat(ownerId: string, shelterName: string) {
    if (!user?.id) return;
    const roomId = dmRoomId(user.id, ownerId);
    setShowNewRoom(false);
    void switchRoom(roomId, ownerId, shelterName);
  }

  return (
    <div className="py-8 space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.82)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary-600" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Chats
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`}
            />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {connected ? "Connected" : "Offline"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[300px_1fr] gap-6 h-[600px]">
        <aside className="flex flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Conversations
            </span>
            <button
              onClick={() => void handleOpenNewChat()}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              title="New conversation"
            >
              {showNewRoom ? (
                <X className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>

          {showNewRoom && (
            <div className="shrink-0 border-b border-slate-200/80 dark:border-slate-800">
              {shelterList.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400">
                  No shelters found
                </p>
              ) : (
                shelterList.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStartChat(s.ownerId, s.name)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {s.name}
                  </button>
                ))
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rooms.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No conversations yet
              </p>
            )}
            {rooms.map((room) => (
              <button
                key={room.roomId}
                type="button"
                onClick={() =>
                  switchRoom(
                    room.roomId,
                    undefined,
                    room.recipientName ?? undefined,
                  )
                }
                className={`w-full text-left rounded-2xl px-4 py-3 transition-colors ${
                  activeRoom === room.roomId
                    ? "border border-primary-100 bg-primary-50 dark:border-primary-400/20 dark:bg-primary-500/10"
                    : "border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {room.recipientName ??
                      roomNames[room.roomId] ??
                      room.lastMessage.senderName ??
                      room.roomId}
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-slate-400 dark:text-slate-500">
                    {formatTime(room.lastMessage.createdAt)}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {room.lastMessage.text}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
          {!activeRoom ? (
            <div className="flex flex-1 items-center justify-center text-slate-400 dark:text-slate-500">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-3 h-12 w-12 text-slate-200 dark:text-slate-700" />
                <p>Select a conversation or start a new one</p>
              </div>
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
                <h2 className="font-bold text-slate-900 dark:text-white">
                  {activeRoomName ?? roomNames[activeRoom] ?? activeRoom}
                </h2>
              </div>

              <div
                ref={messagesContainerRef}
                className="flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-6 py-4 dark:bg-slate-950/50"
              >
                {messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-sm rounded-2xl px-4 py-2.5 shadow-sm ${
                          isOwn
                            ? "bg-primary-600 text-white"
                            : "bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {!isOwn && (
                          <p className="mb-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p
                          className={`mt-1 text-xs ${isOwn ? "text-primary-200" : "text-slate-400 dark:text-slate-500"}`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSend}
                className="flex shrink-0 gap-3 border-t border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/90"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    connected ? "Type a message..." : "Reconnecting..."
                  }
                  disabled={!connected}
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !connected}
                  className="px-5 py-2.5 rounded-2xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
