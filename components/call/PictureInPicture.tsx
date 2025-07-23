"use client";

import React, { useState, useRef, useEffect } from "react";
import { Minimize2, Maximize2, PhoneOff } from "lucide-react";
import { useCall } from "@/contexts/CallContext";
import { formatCallDuration } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PictureInPictureProps {
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export function PictureInPicture({
  isMinimized,
  onToggleMinimize,
}: PictureInPictureProps) {
  const { callState, endCall } = useCall();
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.remoteStream]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const handleMouseMove = (e: MouseEvent) => {
        setPosition({
          x: Math.max(
            0,
            Math.min(window.innerWidth - 320, e.clientX - offsetX)
          ),
          y: Math.max(
            0,
            Math.min(window.innerHeight - 240, e.clientY - offsetY)
          ),
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
  };

  if (!callState.isActive || !isMinimized) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={dragRef}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 1000,
        }}
        className={`w-80 h-60 bg-gray-900 rounded-lg overflow-hidden shadow-2xl border-2 border-white ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={handleMouseDown}
      >
        {/* Video Content */}
        <div className="relative h-full">
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
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold mx-auto mb-2">
                  {callState.contact?.fullName.charAt(0).toUpperCase()}
                </div>
                <p className="text-white text-sm">
                  {callState.contact?.fullName}
                </p>
              </div>
            </div>
          )}

          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 group">
            {/* Call Info */}
            <div className="absolute top-2 left-2 bg-black bg-opacity-50 rounded px-2 py-1">
              <p className="text-white text-xs font-medium">
                {formatCallDuration(callState.duration)}
              </p>
            </div>

            {/* Controls */}
            <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMinimize();
                }}
                className="p-1 bg-black bg-opacity-50 rounded text-white hover:bg-opacity-70"
                title="Maximize"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  endCall();
                }}
                className="p-1 bg-red-600 bg-opacity-80 rounded text-white hover:bg-opacity-100"
                title="End call"
              >
                <PhoneOff className="h-3 w-3" />
              </button>
            </div>

            {/* Contact Name */}
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white text-sm font-medium truncate">
                {callState.contact?.fullName}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
