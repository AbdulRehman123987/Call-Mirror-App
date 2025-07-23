import SimplePeer from "simple-peer";
import { socketService } from "./socket";

export interface WebRTCConfig {
  callId: string;
  isInitiator: boolean;
  onStream?: (stream: MediaStream) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

class WebRTCService {
  private peer: SimplePeer.Instance | null = null;
  private localStream: MediaStream | null = null;
  private callId: string | null = null;

  async initializeCall(config: WebRTCConfig): Promise<void> {
    console.log("CONFIG", config);
    console.log("Config call id ", config.callId);
    console.log("Creating peer. Initiator?", config.isInitiator);
    this.callId = config.callId;

    try {
      const available = await this.hasMediaDevices();

      if (!available.audio && !available.video) {
        throw new Error("No audio or video devices found");
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: available.video,
        audio: available.audio,
      });

      // Create peer connection
      this.peer = new SimplePeer({
        initiator: config.isInitiator,
        trickle: false,
        stream: this.localStream,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });

      console.log("This peer", this.peer);

      this.setupPeerEvents(config);
    } catch (error) {
      config.onError?.(error as Error);
      throw error;
    }
  }

  async hasMediaDevices(): Promise<{ audio: boolean; video: boolean }> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      audio: devices.some((d) => d.kind === "audioinput"),
      video: devices.some((d) => d.kind === "videoinput"),
    };
  }

  async initializeScreenShare(): Promise<MediaStream> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      if (this.peer && this.localStream) {
        // Replace video track with screen share
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = this.peer._pc
          ?.getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }

        // Handle screen share end
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      return screenStream;
    } catch (error) {
      throw new Error("Screen share not supported or denied");
    }
  }

  async stopScreenShare(): Promise<void> {
    if (this.peer && this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      const sender = this.peer._pc
        ?.getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  handleSignalingMessage(signal: any): void {
    if (this.peer && !this.peer.destroyed) {
      this.peer.signal(signal);
    }
  }

  endCall(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.callId) {
      socketService.endCall(this.callId);
      this.callId = null;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  private setupPeerEvents(config: WebRTCConfig): void {
    if (!this.peer) return;

    this.peer.on("signal", (signal) => {
      if (!this.callId) {
        console.warn("❌ No callId set when trying to send signal", signal);
        return;
      }

      console.log("✅ Sending signal for callId:", this.callId);
      socketService.sendSignalingMessage(this.callId, signal);
    });

    this.peer.on("stream", (remoteStream) => {
      config.onStream?.(remoteStream);
    });

    this.peer.on("close", () => {
      config.onClose?.();
      this.cleanup();
    });

    this.peer.on("error", (error) => {
      config.onError?.(error);
      this.cleanup();
    });
  }

  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.peer = null;
    this.callId = null;
  }
}

export const webrtcService = new WebRTCService();
