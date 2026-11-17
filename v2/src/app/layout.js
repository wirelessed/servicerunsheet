import { AuthContextProvider } from "../context/AuthContext";
import { DashboardContextProvider } from "../context/DashboardContext";
import "./globals.css";
import { Manrope } from 'next/font/google';
import { TooltipProvider } from "@/components/ui/tooltip";

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata = {
  title: "RunsheetPro v4",
  description: "Modern Runsheet Application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${manrope.variable} antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
          (function() {
            try {
              var theme = localStorage.getItem('theme');
              if (theme === 'light') {
                document.documentElement.classList.remove('dark');
              } else if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch(e) {}
          })();
        ` }} />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-48KLWFBBZK"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-48KLWFBBZK');
        ` }} />
      </head>
      <body className="font-manrope">
        <AuthContextProvider>
          <DashboardContextProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </DashboardContextProvider>
        </AuthContextProvider>
        <script dangerouslySetInnerHTML={{
          __html: `
          window.Userback = window.Userback || { };
          Userback.access_token = "A-JavE1oVG9a849HKZI9zgIyBkN";
          (function(d) {
            var s = d.createElement('script');s.async = true;s.src = 'https://static.userback.io/widget/v1.js';(d.head || d.body).appendChild(s);
          })(document);
        ` }} />
      </body>
    </html>
  );
}
