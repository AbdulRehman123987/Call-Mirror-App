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

  // async getLocalStream(
  //   audio = true
  //   // video = true
  // ): Promise<MediaStream | null> {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       audio,
  //       // video,
  //     });
  //     return stream;
  //   } catch (err: any) {
  //     if (err.name === "NotFoundError") {
  //       console.error("🚫 No media devices found (camera/mic not available)");
  //     } else if (err.name === "NotAllowedError") {
  //       console.error("🔒 User denied permissions to media devices");
  //     } else {
  //       console.error("❌ Error accessing media devices:", err);
  //     }
  //     return null;
  //   }
  // }

  async getLocalStream(audio: boolean): Promise<MediaStream | null> {
    if (!audio) return null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTrack = stream.getAudioTracks()[0];

      if (audioTrack && audioTrack.readyState === "ended") {
        console.warn("🚫 Audio track ended immediately. Retrying...");
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      return stream;
    } catch (err) {
      console.error("🎙️ Failed to get local audio stream:", err);
      return null;
    }
  }

  async initializeCall(config: WebRTCConfig): Promise<void> {
    this.callId = config.callId;

    try {
      const available = await this.hasMediaDevices();

      if (!available.audio && !available.video) {
        throw new Error("No audio devices found");
      }

      this.localStream = await this.getLocalStream(
        available.audio
        // available.video
      );

      console.log(
        "WebRtc initialize call local stream console",
        this.localStream
      );

      console.log(
        "web rtc local stream Tracks:",
        this.localStream?.getTracks()
      );

      navigator.mediaDevices.enumerateDevices().then((devices) => {
        console.log(devices);
      });

      if (!this.localStream) {
        throw new Error("Local stream is not initialized");
      }

      console.log("LOCAL STREAM ", this.localStream);

      socketService.requestTurnCredentials().then((iceServers) => {
        console.log("🔧 Using dynamic ICE servers", iceServers);

        // this.peer = new SimplePeer({
        //   initiator: config.isInitiator,
        //   trickle: false,
        //   stream: this.localStream!,
        //   config: { iceServers },
        // });

        // this.setupPeerEvents(config);

        console.log("Local stream", this.localStream);

        setTimeout(() => {
          this.peer = new SimplePeer({
            initiator: config.isInitiator,
            trickle: false,
            stream: this.localStream!,
            config: { iceServers },
          });
          this.setupPeerEvents(config);
        }, 100);
      });
    } catch (error) {
      config.onError?.(error as Error);
      throw error;
    }
  }

  // async hasMediaDevices(): Promise<{ audio: boolean; video: boolean }> {
  //   const devices = await navigator.mediaDevices.enumerateDevices();
  //   return {
  //     audio: devices.some((d) => d.kind === "audioinput"),
  //     video: devices.some((d) => d.kind === "videoinput"),
  //   };
  // }

  async hasMediaDevices() {
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
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = this.peer._pc
          ?.getSenders()
          .find((s) => s.track?.kind === "video");

        if (sender) {
          await sender.replaceTrack(videoTrack);
        }

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
        .find((s) => s.track?.kind === "video");

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }
  }

  toggleAudio(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  toggleVideo(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  handleSignalingMessage(signal: any, from: string): void {
    const selfId = socketService.getSocketId();

    console.log("📨 Received signaling message", { signal, from });

    if (from === selfId) {
      console.log("🔁 Ignored own signal");
      return;
    }

    if (!this.peer || this.peer.destroyed) {
      console.warn("❌ No active peer connection");
      return;
    }

    const signalingState = this.peer._pc?.signalingState;
    console.log("📡 Received signal", signal.type, "in state:", signalingState);

    if (signal.type === "answer" && signalingState === "stable") {
      console.warn("⚠️ Skipping redundant answer in stable state");
      return;
    }

    try {
      this.peer.signal(signal);
    } catch (err) {
      console.error("❌ Error applying signal", err);
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

  // getLocalStream(): MediaStream | null {
  //   return this.localStream;
  // }

  private setupPeerEvents(config: WebRTCConfig): void {
    if (!this.peer) return;

    this.peer.on("signal", (signal) => {
      if (!this.callId) return;
      console.log("✅ Emitting signal for call:", this.callId);
      socketService.sendSignalingMessage(this.callId, signal);
    });

    this.peer.on("stream", (remoteStream) => {
      console.log("✅ Got remote stream");
      console.log("Remote stream audio track", remoteStream.getAudioTracks());
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
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.peer = null;
    this.callId = null;
  }
}

export const webrtcService = new WebRTCService();
