import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, MessageSquare, Send, UserRound } from 'lucide-react';
import { connectSignalR, disconnectSignalR, getSignalRConnection } from '@/services/signalr';

interface Message {
  user: string;
  text: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  subtitle: string;
  petName?: string;
  messages: Message[];
}

const defaultConversations: Conversation[] = [
  {
    id: 'riga-central-shelter',
    title: 'Riga Central Shelter',
    subtitle: 'Luna',
    petName: 'Luna',
    messages: [
      {
        user: 'Marta Ozola',
        text: 'Hello. Luna is calm indoors and does best with a quiet introduction to a new space.',
        timestamp: '09:14',
      },
      {
        user: 'You',
        text: 'Thank you. Is she comfortable with apartment living?',
        timestamp: '09:17',
      },
    ],
  },
  {
    id: 'jurmala-partner-shelter',
    title: 'Jurmala Partner Shelter',
    subtitle: 'Archie',
    petName: 'Archie',
    messages: [
      {
        user: 'Edgars Briedis',
        text: 'Archie enjoys long walks and already knows several commands.',
        timestamp: 'Yesterday',
      },
    ],
  },
  {
    id: 'coastal-shelter-network',
    title: 'Coastal Shelter Network',
    subtitle: 'General inquiry',
    messages: [
      {
        user: 'Laura Berzina',
        text: 'Feel free to ask about matching, visits, or adoption preparation.',
        timestamp: 'Monday',
      },
    ],
  },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const ChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>(defaultConversations);
  const [activeConversationId, setActiveConversationId] = useState(defaultConversations[0].id);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const target = searchParams.get('target');
  const pet = searchParams.get('pet');

  useEffect(() => {
    let mounted = true;

    connectSignalR()
      .then(() => {
        if (mounted) {
          setIsConnected(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsConnected(false);
        }
      });

    const connection = getSignalRConnection();
    const handleReceive = (user: string, text: string, timestamp: string) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                messages: [...conversation.messages, { user, text, timestamp }],
              }
            : conversation
        )
      );
    };

    connection.on('ReceiveMessage', handleReceive);

    return () => {
      mounted = false;
      connection.off('ReceiveMessage', handleReceive);
      disconnectSignalR();
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!target) {
      return;
    }

    const conversationId = slugify(target);

    setConversations((current) => {
      const existingConversation = current.find((conversation) => conversation.id === conversationId);
      if (existingConversation) {
        return current;
      }

      return [
        {
          id: conversationId,
          title: target,
          subtitle: pet ?? 'New inquiry',
          petName: pet ?? undefined,
          messages: [
            {
              user: target,
              text: pet
                ? `Thanks for reaching out about ${pet}. You can continue the conversation here.`
                : 'Thanks for reaching out. You can continue the conversation here.',
              timestamp: 'Now',
            },
          ],
        },
        ...current,
      ];
    });

    setActiveConversationId(conversationId);
  }, [target, pet]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0],
    [activeConversationId, conversations]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim() || !activeConversation) {
      return;
    }

    const newMessage: Message = {
      user: 'You',
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? {
              ...conversation,
              messages: [...conversation.messages, newMessage],
            }
          : conversation
      )
    );

    try {
      const connection = getSignalRConnection();
      if (isConnected) {
        await connection.invoke('SendMessage', input.trim());
      }
    } catch {
      setIsConnected(false);
    } finally {
      setInput('');
    }
  };

  if (!activeConversation) {
    return null;
  }

  return (
    <div className="py-8 space-y-6">
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-3">
          <MessageSquare className="w-6 h-6 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">Chats</h1>
        </div>
        <p className="text-gray-600 max-w-3xl">
          Manage conversations with shelters and other people listing pets. Open a pet profile, press Chat, and the relevant conversation will appear here.
        </p>
      </section>

      <section className="grid lg:grid-cols-[320px_1fr] gap-6 min-h-[680px]">
        <aside className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-medium text-gray-500 px-3 py-2">Active conversations</div>
          <div className="space-y-2">
            {conversations.map((conversation) => {
              const lastMessage = conversation.messages[conversation.messages.length - 1];

              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setActiveConversationId(conversation.id)}
                  className={`w-full text-left rounded-2xl px-4 py-4 transition-colors ${
                    activeConversation.id === conversation.id
                      ? 'bg-primary-50 border border-primary-100'
                      : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="font-semibold text-gray-900">{conversation.title}</div>
                    <div className="text-xs text-gray-400">{lastMessage?.timestamp}</div>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">{conversation.subtitle}</div>
                  <div className="text-sm text-gray-600 line-clamp-2">{lastMessage?.text}</div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{activeConversation.title}</h2>
              <p className="text-sm text-gray-500">
                {activeConversation.petName ? `Conversation about ${activeConversation.petName}` : activeConversation.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="inline-flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Shelter contact
              </div>
              <div className="inline-flex items-center gap-2">
                <UserRound className="w-4 h-4" />
                {isConnected ? 'Live' : 'Offline draft'}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
            {activeConversation.messages.map((message, index) => {
              const isOwnMessage = message.user === 'You';

              return (
                <div key={`${message.timestamp}-${index}`} className={`mb-4 flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xl rounded-2xl px-4 py-3 shadow-sm ${isOwnMessage ? 'bg-primary-600 text-white' : 'bg-white text-gray-800'}`}>
                    <div className={`text-xs mb-1 ${isOwnMessage ? 'text-primary-100' : 'text-gray-400'}`}>
                      {message.user} • {message.timestamp}
                    </div>
                    <div>{message.text}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-5 border-t border-gray-100 bg-white">
            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={isConnected ? 'Type your message...' : 'Connection unavailable, but you can still prepare the draft.'}
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-5 py-3 rounded-2xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ChatPage;
