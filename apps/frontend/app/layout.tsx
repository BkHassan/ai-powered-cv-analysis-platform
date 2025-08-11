import type { Metadata } from "next";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';


export const metadata: Metadata = {
  title: "my App",
  description: "Created by me",
  generator: "me",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (typeof window !== "undefined") {
    console.log("NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);
  }
  return (
    <html lang="en">
      <body>
      {children}
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} />
      </body>
    </html>
  );
}
