"use client";

import React, { useState } from "react";
import { ContactsList } from "@/components/contacts/ContactsList";
import { CallScreen } from "@/components/call/CallScreen";
import { IncomingCallModal } from "@/components/call/IncomingCallModal";
import { PictureInPicture } from "@/components/call/PictureInPicture";
import { useCall } from "@/contexts/CallContext";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Settings, User, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { callState } = useCall();
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const router = useRouter();

  const signOutUser = () => {
    signOut();
    setTimeout(() => {
      router.push("/");
    }, 700);
  };

  const handleCallScreenNavigation = () => {
    if (callState.isActive) {
      setIsCallMinimized(true);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Call Mirror</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                {user?.fullName.charAt(0).toUpperCase()}
                {/* {user?.fullName} */}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user?.fullName}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>

              <button
                onClick={signOutUser}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Contacts */}
        <div className="w-82 bg-white border-r border-gray-200 flex flex-col">
          <ContactsList />
        </div>

        {/* Main Area */}
        <div className="flex-1 flex items-center justify-center">
          {callState.isActive && !isCallMinimized ? (
            <CallScreen />
          ) : (
            <>
              <div className="text-center">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  <User className="h-12 w-12" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome to Call Mirror
                </h2>
                <p className="text-gray-600 mb-8">
                  Select a contact from the sidebar to start a call
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals and Overlays */}
      <IncomingCallModal />
      <PictureInPicture
        isMinimized={isCallMinimized}
        onToggleMinimize={() => setIsCallMinimized(!isCallMinimized)}
      />
    </div>
  );
}
