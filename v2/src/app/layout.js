import { AuthContextProvider } from "../context/AuthContext";
import "./globals.css";

export const metadata = {
  title: "RunsheetPro v2",
  description: "Modern Runsheet Application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className='light'>
      <body>
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </body>
    </html>
  );
}
