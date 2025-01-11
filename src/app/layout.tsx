import "@/app/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import React from "react";
import Container from "./container";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pswds Helper",
  description: "Be Open to Share",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Container>
          <main>{children}</main>
        </Container>
      </body>
    </html>
  );
}
