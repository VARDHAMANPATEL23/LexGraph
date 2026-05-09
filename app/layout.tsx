import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexGraph — Oxford 3D Knowledge Graph",
  description:
    "Explore English vocabulary as an interactive 3D knowledge graph. Words spawn and connect based on NLP-weighted co-occurrence from Oxford dictionary definitions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
