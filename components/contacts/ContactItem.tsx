"use client";

import React from "react";
import { Phone, Video } from "lucide-react";
import { Contact } from "@/lib/socket";

interface ContactItemProps {
  contact: Contact;
  onCall: (contact: Contact, type: "audio" | "video") => void;
}

export function ContactItem({ contact, onCall }: ContactItemProps) {
  return (
    <div className="flex items-center justify-between py-3 px-2 hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
            {contact.fullName?.charAt(0).toUpperCase()}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
              contact.isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{contact?.fullName}</h3>
          <p className="text-sm text-gray-500">{contact.email}</p>
          {!contact.isOnline && contact.lastSeen && (
            <p className="text-xs text-gray-400">
              Last seen {new Date(contact.lastSeen).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onCall(contact, "audio")}
          // disabled={!contact.isOnline}
          className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Audio call"
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          onClick={() => onCall(contact, "video")}
          // disabled={!contact.isOnline}
          className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Video call"
        >
          <Video className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
