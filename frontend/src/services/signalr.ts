import * as signalR from '@microsoft/signalr';
import { config } from '../config';

let connection: signalR.HubConnection | null = null;
let connectingPromise: Promise<void> | null = null;

export function getConnection(): signalR.HubConnection {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${config.api.baseUrl}/chatHub`, {
      accessTokenFactory: () => localStorage.getItem('token') ?? '',
      withCredentials: false,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .build();

  return connection;
}

export async function connect(): Promise<void> {
  const conn = getConnection();

  if (conn.state === signalR.HubConnectionState.Connected) return;

  // If already connecting — wait for that promise instead of starting a new one
  if (connectingPromise) return connectingPromise;

  if (conn.state === signalR.HubConnectionState.Disconnected) {
    connectingPromise = conn.start().finally(() => {
      connectingPromise = null;
    });
    return connectingPromise;
  }
}

export async function disconnect(): Promise<void> {
  if (connection) {
    await connection.stop();
    connection = null;
    connectingPromise = null;
  }
}

export async function joinRoom(roomId: string): Promise<void> {
  await getConnection().invoke('JoinRoom', roomId);
}

export async function leaveRoom(roomId: string): Promise<void> {
  await getConnection().invoke('LeaveRoom', roomId);
}

export async function sendMessage(roomId: string, text: string): Promise<void> {
  await getConnection().invoke('SendMessage', roomId, text);
}
