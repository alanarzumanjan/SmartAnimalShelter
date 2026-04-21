import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MessageSquare, Send, Plus } from 'lucide-react';

import api from '@/services/api';
import { connect, disconnect, getConnection, joinRoom, leaveRoom, sendMessage } from '@/services/signalr';
import type { RootState } from '@/store/store';

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
  lastMessage: { senderName: string; text: string; createdAt: string };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function roomIdFromTarget(target: string) {
  return target.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const { user } = useSelector((state: RootState) => state.auth);

  const [apiRooms, setApiRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);

  const activeRoomRef = useRef<string | null>(null);
  const prevRoomRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const target = searchParams.get('target');
  const pet = searchParams.get('pet');
  const recipientId = searchParams.get('recipientId') || undefined;
  const initialMessage = searchParams.get('message') || '';

  const pendingMessageRef = useRef('');

  // Merge URL target room into the rooms list without setState in effect
  const rooms = useMemo<Room[]>(() => {
    if (!target) return apiRooms;
    const roomId = roomIdFromTarget(target);
    const exists = apiRooms.find((r) => r.roomId === roomId);
    if (exists) return apiRooms;
    return [
      {
        roomId,
        lastMessage: {
          senderName: target,
          text: pet ? `Inquiry about ${pet}` : 'New conversation',
          createdAt: new Date().toISOString(),
        },
      },
      ...apiRooms,
    ];
  }, [apiRooms, target, pet]);

  function scrollToBottom() {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const { data } = await api.get(`/chat/rooms/${encodeURIComponent(roomId)}/messages`);
      setMessages((prev) => {
        const ids = new Set(data.map((m: ChatMessage) => m.id));
        const extra = prev.filter((m) => !ids.has(m.id) && m.roomId === roomId);
        return [...data, ...extra].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    } catch {
      setMessages([]);
    }
  }, []);

  const switchRoom = useCallback(async (roomId: string, recipient?: string) => {
    try {
      await connect();
      setConnected(true);
    } catch {
      setConnected(false);
    }

    if (prevRoomRef.current && prevRoomRef.current !== roomId) {
      try { await leaveRoom(prevRoomRef.current); } catch { /* ignore */ }
    }

    activeRoomRef.current = roomId;
    setActiveRoom(roomId);
    setMessages([]);
    prevRoomRef.current = roomId;

    try {
      await api.post(`/chat/rooms/${encodeURIComponent(roomId)}/join`, {
        recipientId: recipient || null,
      });
    } catch { /* ignore */ }

    try { await joinRoom(roomId); } catch { /* ignore */ }
    await loadMessages(roomId);

    // Apply pre-filled message from URL (e.g. coming from animal page)
    if (pendingMessageRef.current) {
      setInput(pendingMessageRef.current);
      pendingMessageRef.current = '';
    }
  }, [loadMessages]);

  // SignalR connect + message handler
  useEffect(() => {
    connect()
      .then(() => setConnected(true))
      .catch(() => setConnected(false));

    const conn = getConnection();
    conn.on('ReceiveMessage', (msg: ChatMessage) => {
      if (msg.roomId !== activeRoomRef.current) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      api.get('/chat/rooms')
        .then(({ data }) => setApiRooms(data))
        .catch(() => {});
    });

    return () => {
      conn.off('ReceiveMessage');
      if (prevRoomRef.current) leaveRoom(prevRoomRef.current);
      disconnect();
    };
  }, []);

  // Load rooms from API on mount
  useEffect(() => {
    api.get('/chat/rooms')
      .then(({ data }) => setApiRooms(data))
      .catch(() => {});
  }, []);

  // Open target room from URL
  useEffect(() => {
    if (!target) return;
    pendingMessageRef.current = initialMessage;
    const roomId = roomIdFromTarget(target);
    const timeoutId = window.setTimeout(() => {
      void switchRoom(roomId, recipientId);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [initialMessage, recipientId, switchRoom, target]);

  // Auto-open first room if no target
  useEffect(() => {
    if (!target && !activeRoom && rooms.length > 0) {
      const timeoutId = window.setTimeout(() => {
        void switchRoom(rooms[0].roomId);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [activeRoom, rooms, switchRoom, target]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeRoom || !connected) return;
    try {
      await sendMessage(activeRoom, input.trim());
      setInput('');
    } catch {
      setConnected(false);
    }
  }

  function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const roomId = roomIdFromTarget(newRoomName.trim());
    setApiRooms((prev) => {
      if (prev.find((r) => r.roomId === roomId)) return prev;
      return [
        {
          roomId,
          lastMessage: {
            senderName: user?.name ?? 'You',
            text: 'Conversation started',
            createdAt: new Date().toISOString(),
          },
        },
        ...prev,
      ];
    });
    setNewRoomName('');
    setShowNewRoom(false);
    switchRoom(roomId);
  }

  return (
    <div className="py-8 space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_28px_90px_-36px_rgba(2,6,23,0.82)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary-600" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Chats</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <span className="text-sm text-slate-500 dark:text-slate-400">{connected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[300px_1fr] gap-6 h-[600px]">
        <aside className="flex flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_22px_70px_-34px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_28px_80px_-40px_rgba(2,6,23,0.8)]">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Conversations</span>
            <button
              onClick={() => setShowNewRoom((v) => !v)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              title="New conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showNewRoom && (
            <form onSubmit={handleCreateRoom} className="shrink-0 border-b border-slate-200/80 px-3 py-2 dark:border-slate-800">
              <input
                autoFocus
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </form>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rooms.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No conversations yet</p>
            )}
            {rooms.map((room) => (
              <button
                key={room.roomId}
                type="button"
                onClick={() => switchRoom(room.roomId)}
                className={`w-full text-left rounded-2xl px-4 py-3 transition-colors ${
                  activeRoom === room.roomId
                    ? 'border border-primary-100 bg-primary-50 dark:border-primary-400/20 dark:bg-primary-500/10'
                    : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{room.roomId}</span>
                  <span className="ml-2 shrink-0 text-xs text-slate-400 dark:text-slate-500">{formatTime(room.lastMessage.createdAt)}</span>
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{room.lastMessage.text}</p>
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
                <h2 className="font-bold text-slate-900 dark:text-white">{activeRoom}</h2>
              </div>

              <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-6 py-4 dark:bg-slate-950/50">
                {messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm rounded-2xl px-4 py-2.5 shadow-sm ${
                        isOwn
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100'
                      }`}>
                        {!isOwn && <p className="mb-1 text-xs font-medium text-slate-400 dark:text-slate-500">{msg.senderName}</p>}
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className={`mt-1 text-xs ${isOwn ? 'text-primary-200' : 'text-slate-400 dark:text-slate-500'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="flex shrink-0 gap-3 border-t border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/90">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={connected ? 'Type a message...' : 'Reconnecting...'}
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
