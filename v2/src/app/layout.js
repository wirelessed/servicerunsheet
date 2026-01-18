import { AuthContextProvider } from "../context/AuthContext";
import "./globals.css";
import { Manrope } from 'next/font/google';
import { TooltipProvider } from "@/components/ui/tooltip";

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata = {
  title: "RunsheetPro v2",
  description: "Modern Runsheet Application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} antialiased dark`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="font-manrope">
        <AuthContextProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
