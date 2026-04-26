import * as signalR from "@microsoft/signalr";
import { config } from "../config";

let connection: signalR.HubConnection | null = null;
let connectingPromise: Promise<void> | null = null;

function buildConnection(): signalR.HubConnection {
  return new signalR.HubConnectionBuilder()
    .withUrl(`${config.api.baseUrl}/chatHub`, {
      accessTokenFactory: () => localStorage.getItem("token") ?? "",
      withCredentials: false,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .build();
}

export function getConnection(): signalR.HubConnection {
  if (!connection) connection = buildConnection();
  return connection;
}

export async function connect(): Promise<void> {
  const conn = getConnection();

  if (conn.state === signalR.HubConnectionState.Connected) return;
  if (connectingPromise) return connectingPromise;

  if (
    conn.state === signalR.HubConnectionState.Disconnected ||
    conn.state === signalR.HubConnectionState.Disconnecting
  ) {
    connectingPromise = conn.start().finally(() => {
      connectingPromise = null;
    });
    return connectingPromise;
  }
}

export async function disconnect(): Promise<void> {
  connectingPromise = null;
  if (connection) {
    const conn = connection;
    connection = null;
    conn.off("ReceiveMessage");
    try {
      await conn.stop();
    } catch {
      // ignore
    }
  }
}

async function safeInvoke(method: string, ...args: unknown[]): Promise<void> {
  const conn = getConnection();
  if (conn.state !== signalR.HubConnectionState.Connected) return;
  await conn.invoke(method, ...args);
}

export async function joinRoom(roomId: string): Promise<void> {
  await safeInvoke("JoinRoom", roomId);
}

export async function leaveRoom(roomId: string): Promise<void> {
  await safeInvoke("LeaveRoom", roomId);
}

export async function sendMessage(roomId: string, text: string): Promise<void> {
  const conn = getConnection();
  if (conn.state !== signalR.HubConnectionState.Connected) {
    throw new Error("Not connected");
  }
  await conn.invoke("SendMessage", roomId, text);
}
