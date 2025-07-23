import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { CallProvider } from "@/contexts/CallContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CallApp - Video Calling Made Simple",
  description: "Secure video calling application with real-time communication",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CallProvider>{children}</CallProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
