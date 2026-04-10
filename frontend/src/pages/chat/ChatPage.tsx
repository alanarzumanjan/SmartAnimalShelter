import React, { useEffect, useRef, useState } from 'react';
import { connectSignalR, getSignalRConnection, disconnectSignalR } from '@/services/signalr';
import { Button } from '@/components/ui/Button';

interface Message {
  user: string;
  text: string;
  timestamp: string;
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    connectSignalR().then(() => setIsConnected(true));
    const conn = getSignalRConnection();

    const handleReceive = (user: string, text: string, timestamp: string) => {
      if (mounted) setMessages((prev) => [...prev, { user, text, timestamp }]);
    };
    conn.on('ReceiveMessage', handleReceive);

    return () => {
      mounted = false;
      conn.off('ReceiveMessage', handleReceive);
      disconnectSignalR();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const conn = getSignalRConnection();
    try {
      await conn.invoke('SendMessage', input);
      setInput('');
    } catch (err) {
      alert('Failed to send the message.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col h-[70vh]">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Shelter Chat</h1>
      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow p-4 mb-4 border">
        {messages.length === 0 && (
          <div className="text-gray-400 text-center mt-12">No messages yet</div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className="mb-3">
            <div className="text-xs text-gray-400 mb-1">{msg.user} <span className="ml-2">{msg.timestamp}</span></div>
            <div className="bg-primary-50 rounded-lg px-4 py-2 inline-block text-gray-800">{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded-lg px-4 py-2"
          placeholder={isConnected ? 'Type your message...' : 'Connecting to chat...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!isConnected}
        />
        <Button type="submit" disabled={!isConnected || !input.trim()}>Send</Button>
      </form>
    </div>
  );
};

export default ChatPage;
