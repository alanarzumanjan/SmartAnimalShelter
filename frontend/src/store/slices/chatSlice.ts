import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface ChatState {
  messages: Message[];
  activeChatId: string | null;
  isTyping: boolean;
  isConnected: boolean;
}

const initialState: ChatState = {
  messages: [],
  activeChatId: null,
  isTyping: false,
  isConnected: false,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setActiveChat: (state, action: PayloadAction<string | null>) => {
      state.activeChatId = action.payload;
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const { addMessage, setActiveChat, setTyping, setConnected, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;