import * as signalR from '@microsoft/signalr';
import { config } from '../config';

let connection: signalR.HubConnection | null = null;

export const getSignalRConnection = (): signalR.HubConnection => {
  if (connection) return connection;

  const token = localStorage.getItem('token');

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${config.api.baseUrl}/chatHub`, {
      accessTokenFactory: () => token || '',
      withCredentials: false,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .build();

  return connection;
};

export const connectSignalR = async (): Promise<void> => {
  const conn = getSignalRConnection();
  
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    try {
      await conn.start();
      console.log('✅ SignalR Connected');
    } catch (err) {
      console.error('❌ SignalR Connection Error:', err);
      setTimeout(() => connectSignalR(), 5000);
    }
  }
};

export const disconnectSignalR = async (): Promise<void> => {
  if (connection) {
    await connection.stop();
    connection = null;
    console.log('🔌 SignalR Disconnected');
  }
};