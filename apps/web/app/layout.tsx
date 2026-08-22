import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "./auth-provider";

import "./styles.css";

export const metadata: Metadata = {
  description: "Paper-only momentum trading operations dashboard.",
  title: "Momentum Autopilot",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
