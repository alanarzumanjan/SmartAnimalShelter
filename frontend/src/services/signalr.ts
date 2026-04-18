import * as signalR from '@microsoft/signalr';
import { config } from '../config';

let connection: signalR.HubConnection | null = null;

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
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start();
  }
}

export async function disconnect(): Promise<void> {
  if (connection) {
    await connection.stop();
    connection = null;
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
