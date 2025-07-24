"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { socketService, Contact, IncomingCall } from "@/lib/socket";
import { webrtcService } from "@/lib/webrtc";
import { notificationService } from "@/lib/notifications";
import { generateCallId } from "@/lib/utils";
import { useAuth } from "./AuthContext";

export interface CallState {
  callId: string | null;
  isActive: boolean;
  isIncoming: boolean;
  contact: Contact | null;
  type: "audio" | "video" | null;
  status: "connecting" | "connected" | "ended" | "declined";
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  duration: number;
}

interface CallContextType {
  callState: CallState;
  incomingCall: IncomingCall | null;
  initiateCall: (contact: Contact, type: "audio" | "video") => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
}

const initialCallState: CallState = {
  callId: null,
  isActive: false,
  isIncoming: false,
  contact: null,
  type: null,
  status: "ended",
  localStream: null,
  remoteStream: null,
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  duration: 0,
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>(initialCallState);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [durationTimer, setDurationTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const callIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      initializeSocket();
      initializeNotifications();
    }

    return () => {
      socketService.disconnect();
      if (durationTimer) {
        clearInterval(durationTimer);
      }
    };
  }, [user]);

  useEffect(() => {
    if (callState.status === "connecting") {
      const timeout = setTimeout(() => {
        if (callState.status === "connecting") {
          console.error("Call timeout: Ending call");
          endCall();
        }
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [callState.status]);

  const initializeSocket = async () => {
    try {
      await socketService.connect();
      setupSocketListeners();
    } catch (error) {
      console.error("Socket connection failed:", error);
    }
  };

  const initializeNotifications = async () => {
    await notificationService.initialize();
    const hasPermission = await notificationService.requestPermission();
    if (hasPermission) {
      await notificationService.subscribeToPush();
    }
  };

  const setupSocketListeners = () => {
    socketService.onIncomingCall((call) => {
      console.log("Incomming call data", call);
      if (user?.id !== call.from.id) {
        console.log("Incoming call received:", call);
        setIncomingCall(call);

        notificationService.showIncomingCallNotification(
          call.from.fullName,
          call.callId
        );

        const timeoutCallId = call.callId;
        setTimeout(() => {
          setIncomingCall((currentCall) =>
            currentCall?.callId === timeoutCallId ? null : currentCall
          );
        }, 30000);
      }
    });

    socketService.onCallAccepted((data) => {
      console.log("Call accepted for callId:", data.callId);

      if (callState.callId === data.callId) {
        startCall(false, data.callId);
      }
    });

    socketService.onCallDeclined((data) => {
      if (callState.callId === data.callId) {
        setCallState((prev) => ({ ...prev, status: "declined" }));
        setTimeout(() => resetCallState(), 2000);
      }
    });

    socketService.onCallEnded((data) => {
      if (callState.callId === data.callId) {
        endCall();
      }
    });

    socketService.onSignalingMessage((data) => {
      const selfId = socketService.getSocketId();
      const { callId, signal, from } = data;

      if (callId !== callState.callId && callId !== callIdRef.current) {
        console.warn("⚠️ Received signaling message for unmatched callId", {
          expected: callState.callId,
          ref: callIdRef.current,
          received: callId,
        });
        return;
      }

      if (from === selfId) {
        console.log("🔁 Ignored own signal");
        return;
      }

      webrtcService.handleSignalingMessage(signal, from);
    });
  };

  const initiateCall = async (contact: Contact, type: "audio" | "video") => {
    try {
      const callId = await socketService.initiateCall(contact.id, type);
      callIdRef.current = callId;

      setCallState({
        ...initialCallState,
        callId,
        isActive: true,
        isIncoming: false,
        contact,
        type,
        status: "connecting",
      });

      startCall(true, callId);
    } catch (err) {
      console.error("Failed to initiate call:", err);
    }
  };

  const declineCall = () => {
    if (!incomingCall) return;

    socketService.declineCall(incomingCall.callId);
    setIncomingCall(null);
  };

  const acceptCall = () => {
    if (!incomingCall) return;

    const { callId, from, type } = incomingCall;

    console.log("In accept call - incoming call:", incomingCall);
    callIdRef.current = callId;

    setCallState({
      ...initialCallState,
      callId,
      isActive: true,
      isIncoming: true,
      contact: from,
      type,
      status: "connected",
    });

    socketService.acceptCall(callId);
    startCall(true, callId);

    setIncomingCall(null);
  };

  const startCall = async (isInitiator: boolean, passedCallId?: string) => {
    console.log("Call State", callState);
    const activeCallId = passedCallId;
    if (!activeCallId) {
      console.error("❌ No call ID available to start the call.");
      return;
    }

    try {
      console.log("Starting call with ID:", activeCallId);

      await webrtcService.initializeCall({
        callId: activeCallId,
        isInitiator,
        onStream: (remoteStream) => {
          setCallState((prev) => ({
            ...prev,
            remoteStream,
            status: "connected",
          }));
          startDurationTimer();
        },
        onClose: () => {
          endCall();
        },
        onError: (error) => {
          console.error("WebRTC error:", error);
          endCall();
        },
      });

      const localStream = webrtcService.getLocalStream();
      setCallState((prev) => ({
        ...prev,
        localStream,
      }));
    } catch (error) {
      console.error("Failed to start call:", error);
      endCall();
    }
  };

  const endCall = () => {
    webrtcService.endCall();
    if (durationTimer) {
      clearInterval(durationTimer);
      setDurationTimer(null);
    }
    resetCallState();
  };

  const toggleAudio = () => {
    const newState = !callState.isAudioEnabled;
    webrtcService.toggleAudio(newState);
    setCallState((prev) => ({ ...prev, isAudioEnabled: newState }));
  };

  const toggleVideo = () => {
    const newState = !callState.isVideoEnabled;
    webrtcService.toggleVideo(newState);
    setCallState((prev) => ({ ...prev, isVideoEnabled: newState }));
  };

  const toggleScreenShare = async () => {
    try {
      if (callState.isScreenSharing) {
        await webrtcService.stopScreenShare();
        setCallState((prev) => ({ ...prev, isScreenSharing: false }));
      } else {
        await webrtcService.initializeScreenShare();
        setCallState((prev) => ({ ...prev, isScreenSharing: true }));
      }
    } catch (error) {
      console.error("Screen share toggle failed:", error);
    }
  };

  const startDurationTimer = () => {
    const timer = setInterval(() => {
      setCallState((prev) => ({ ...prev, duration: prev.duration + 1 }));
    }, 1000);
    setDurationTimer(timer);
  };

  const resetCallState = () => {
    setCallState(initialCallState);
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        incomingCall,
        initiateCall,
        acceptCall,
        declineCall,
        endCall,
        toggleAudio,
        toggleVideo,
        toggleScreenShare,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
}
