import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  lastMessage: {
    senderName: string;
    text: string;
    createdAt: string;
  };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
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

  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);

  // Keep a ref so the SignalR handler always sees the current room
  const activeRoomRef = useRef<string | null>(null);
  const prevRoomRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }

  async function loadRooms() {
    try {
      const { data } = await api.get('/chat/rooms');
      setRooms(data);
    } catch { /* no rooms yet */ }
  }

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const { data } = await api.get(`/chat/rooms/${encodeURIComponent(roomId)}/messages`);
      // Merge with any messages already received via SignalR during loading
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

  async function switchRoom(roomId: string, recipientId?: string) {
    if (prevRoomRef.current && prevRoomRef.current !== roomId) {
      try { await leaveRoom(prevRoomRef.current); } catch { /* ignore */ }
    }

    activeRoomRef.current = roomId;
    setActiveRoom(roomId);
    setMessages([]); // clear previous room messages immediately
    prevRoomRef.current = roomId;

    try {
      await api.post(`/chat/rooms/${encodeURIComponent(roomId)}/join`, {
        recipientId: recipientId || null,
      });
    } catch { /* ignore */ }

    try { await joinRoom(roomId); } catch { /* ignore */ }
    await loadMessages(roomId);
  }

  // Connect SignalR once on mount
  useEffect(() => {
    connect()
      .then(() => setConnected(true))
      .catch(() => setConnected(false));

    const conn = getConnection();

    conn.on('ReceiveMessage', (msg: ChatMessage) => {
      // Only add if it belongs to the currently open room
      if (msg.roomId !== activeRoomRef.current) return;
      setMessages((prev) => {
        // Avoid duplicates (optimistic update + server echo)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      loadRooms();
    });

    return () => {
      conn.off('ReceiveMessage');
      if (prevRoomRef.current) leaveRoom(prevRoomRef.current);
      disconnect();
    };
  }, []);

  useEffect(() => {
    loadRooms();
  }, []);

  // Handle ?target= from animal page
  useEffect(() => {
    const target = searchParams.get('target');
    const pet = searchParams.get('pet');
    const recipientId = searchParams.get('recipientId') || undefined;
    if (!target) return;

    const roomId = roomIdFromTarget(target);

    setRooms((prev) => {
      if (prev.find((r) => r.roomId === roomId)) return prev;
      return [
        {
          roomId,
          lastMessage: {
            senderName: target,
            text: pet ? `Inquiry about ${pet}` : 'New conversation',
            createdAt: new Date().toISOString(),
          },
        },
        ...prev,
      ];
    });

    switchRoom(roomId, recipientId);
  }, [searchParams]);

  // Auto-open first room
  useEffect(() => {
    if (!activeRoom && rooms.length > 0) {
      switchRoom(rooms[0].roomId);
    }
  }, [rooms]);

  // Scroll to bottom when messages load or new message arrives
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
    setRooms((prev) => {
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
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Chats</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-500">{connected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[300px_1fr] gap-6 h-[600px]">
        {/* Sidebar */}
        <aside className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <span className="text-sm font-medium text-gray-500">Conversations</span>
            <button
              onClick={() => setShowNewRoom((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
              title="New conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showNewRoom && (
            <form onSubmit={handleCreateRoom} className="px-3 py-2 border-b border-gray-100 shrink-0">
              <input
                autoFocus
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </form>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {rooms.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No conversations yet</p>
            )}
            {rooms.map((room) => (
              <button
                key={room.roomId}
                type="button"
                onClick={() => switchRoom(room.roomId)}
                className={`w-full text-left rounded-2xl px-4 py-3 transition-colors ${
                  activeRoom === room.roomId
                    ? 'bg-primary-50 border border-primary-100'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-gray-900 truncate">{room.roomId}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">{formatTime(room.lastMessage.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{room.lastMessage.text}</p>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat window */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          {!activeRoom ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p>Select a conversation or start a new one</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                <h2 className="font-bold text-gray-900">{activeRoom}</h2>
              </div>

              {/* Messages — fixed height, internal scroll only */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50 space-y-3"
              >
                {messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm rounded-2xl px-4 py-2.5 shadow-sm ${isOwn ? 'bg-primary-600 text-white' : 'bg-white text-gray-800'}`}>
                        {!isOwn && (
                          <p className="text-xs font-medium mb-1 text-gray-400">{msg.senderName}</p>
                        )}
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-primary-200' : 'text-gray-400'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white flex gap-3 shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={connected ? 'Type a message...' : 'Reconnecting...'}
                  disabled={!connected}
                  className="flex-1 border border-gray-300 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
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
