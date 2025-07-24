import { io, Socket } from "socket.io-client";
import { authService } from "./auth";

export interface Contact {
  id: string;
  fullName: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface IncomingCall {
  callId: string;
  from: Contact;
  type: "audio" | "video";
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = authService.getAccessToken();
      if (!token) {
        reject(new Error("No access token available"));
        return;
      }

      this.socket = io(process.env.NEXT_PUBLIC_API_URL, {
        auth: { token },
        transports: ["websocket"],
      });

      this.socket.on("connect", () => {
        console.log("Connected to server");
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        reject(error);
      });

      this.socket.on("disconnect", () => {
        console.log("Disconnected from server");
        this.handleReconnect();
      });

      this.setupEventHandlers();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onPresenceUpdate(callback: (contacts: Contact[]) => void): void {
    this.socket?.on("presence:update", callback);
  }

  onIncomingCall(callback: (call: IncomingCall) => void): void {
    this.socket?.on("call:incoming", callback);
  }

  onCallAccepted(
    callback: (data: { callId: string; by: string }) => void
  ): void {
    this.socket?.on("call:accepted", callback);
  }

  onCallDeclined(
    callback: (data: { callId: string; by: string }) => void
  ): void {
    this.socket?.on("call:declined", callback);
  }

  onCallEnded(callback: (data: { callId: string; by: string }) => void): void {
    this.socket?.on("call:ended", callback);
  }

  onSignalingMessage(callback: (data: any) => void): void {
    this.socket?.on("call:signal", callback);
  }

  initiateCall(contactId: string, type: "audio" | "video"): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket?.emit("call:initiate", { contactId, type });

      this.socket?.once("call:initiated", (data: { callId: string }) => {
        console.log("Socket: call:initiated", data);
        resolve(data.callId);
      });

      setTimeout(() => {
        reject(new Error("Timeout waiting for call:initiated"));
      }, 5000);
    });
  }

  acceptCall(callId: string): void {
    this.socket?.emit("call:accept", { callId });
  }

  declineCall(callId: string): void {
    this.socket?.emit("call:decline", { callId });
  }

  endCall(callId: string): void {
    this.socket?.emit("call:end", { callId });
  }

  sendCallInitiated(callId: string): void {
    this.socket?.emit("call:initiated", { callId });
  }

  sendSignalingMessage(callId: string, signal: any): void {
    this.socket?.emit("call:signal", {
      callId,
      signal,
      from: this.getSocketId(),
    });
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(
          `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        this.connect().catch(console.error);
      }, 1000 * this.reconnectAttempts);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
