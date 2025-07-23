"use client";

import React, { useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
} from "lucide-react";
import { useCall } from "@/contexts/CallContext";
import { formatCallDuration } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function CallScreen() {
  const { callState, endCall, toggleAudio, toggleVideo, toggleScreenShare } =
    useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
    }
  }, [callState.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.remoteStream]);

  if (!callState.isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900 z-50">
      {/* Remote Video */}
      <div className="relative h-full w-full">
        {callState.remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {callState.contact?.fullName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                {callState.contact?.fullName}
              </h2>
              <p className="text-gray-300">
                {callState.status === "connecting"
                  ? "Connecting..."
                  : "Connected"}
              </p>
            </div>
          </div>
        )}

        {/* Call Info Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
            <p className="text-white font-medium">
              {callState.contact?.fullName}
            </p>
            <p className="text-gray-300 text-sm">
              {callState.status === "connected"
                ? formatCallDuration(callState.duration)
                : callState.status}
            </p>
          </div>
        </div>

        {/* Local Video Preview */}
        <AnimatePresence>
          {callState.type === "video" && callState.localStream && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg"
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {!callState.isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Call Controls */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-4 bg-black bg-opacity-50 rounded-full px-6 py-4">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-colors ${
                callState.isAudioEnabled
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
              title={callState.isAudioEnabled ? "Mute" : "Unmute"}
            >
              {callState.isAudioEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </button>

            {/* Video Toggle */}
            {callState.type === "video" && (
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  callState.isVideoEnabled
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
                title={
                  callState.isVideoEnabled
                    ? "Turn off camera"
                    : "Turn on camera"
                }
              >
                {callState.isVideoEnabled ? (
                  <Video className="h-5 w-5" />
                ) : (
                  <VideoOff className="h-5 w-5" />
                )}
              </button>
            )}

            {/* Screen Share Toggle */}
            {callState.type === "video" && (
              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full transition-colors ${
                  callState.isScreenSharing
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
                title={
                  callState.isScreenSharing ? "Stop sharing" : "Share screen"
                }
              >
                {callState.isScreenSharing ? (
                  <MonitorOff className="h-5 w-5" />
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
              </button>
            )}

            {/* End Call */}
            <button
              onClick={endCall}
              className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
              title="End call"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
