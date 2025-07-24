"use client";

import React, { useEffect, useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCall } from "@/contexts/CallContext";
import { motion, AnimatePresence } from "framer-motion";

export function IncomingCallModal() {
  const { incomingCall, acceptCall, declineCall } = useCall();
  const [ringtoneAudio, setRingtoneAudio] = useState<HTMLAudioElement | null>(
    null
  );

  useEffect(() => {
    if (incomingCall) {
      const audio = new Audio("/sounds/ringtone.mp3");
      audio.loop = true;
      setRingtoneAudio(audio);

      const tryPlay = () => {
        audio
          .play()
          .catch((err) => console.warn("Autoplay still blocked:", err));
        document.removeEventListener("click", tryPlay);
      };

      document.addEventListener("click", tryPlay);

      return () => {
        audio.pause();
        audio.currentTime = 0;
        setRingtoneAudio(null);
        document.removeEventListener("click", tryPlay);
      };
    }
  }, [incomingCall]);

  const handleAccept = () => {
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }
    acceptCall();
  };

  const handleDecline = () => {
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
    }
    declineCall();
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
          >
            {/* Caller Avatar */}
            <div className="relative mb-6">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto"
              >
                {incomingCall.from.fullName.charAt(0).toUpperCase()}
              </motion.div>
              <div className="absolute -top-2 -right-2">
                {incomingCall.type === "video" ? (
                  <Video className="h-6 w-6 text-blue-600" />
                ) : (
                  <Phone className="h-6 w-6 text-green-600" />
                )}
              </div>
            </div>

            {/* Caller Info */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {incomingCall.from.fullName}
            </h2>
            <p className="text-gray-600 mb-2">
              Incoming {incomingCall.type} call
            </p>
            <p className="text-sm text-gray-500 mb-8">
              {incomingCall.from.email}
            </p>

            {/* Call Actions */}
            <div className="flex items-center justify-center space-x-8">
              {/* Decline */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDecline}
                className="h-16 w-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors"
              >
                <PhoneOff className="h-6 w-6" />
              </motion.button>

              {/* Accept */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleAccept}
                className="h-16 w-16 rounded-full bg-green-600 text-white flex items-center justify-center shadow-lg hover:bg-green-700 transition-colors"
              >
                <Phone className="h-6 w-6" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
