import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mikey's Favorite Things",
  description: "Mikey's personal catalog of design tools, agent tools, and GitHub repos.",
};

const themeScript = `(function(){try{var k="toolfolio.theme.v1";var s=localStorage.getItem(k);var t=s==="light"||s==="dark"?s:"dark";document.documentElement.dataset.theme=t;var f=function(){var i=document.getElementById("theme-favicon");if(!i){i=document.createElement("link");i.id="theme-favicon";i.rel="icon";document.head.appendChild(i)}i.setAttribute("href","/branding/favicon-"+t+".png")};document.addEventListener("DOMContentLoaded",f);}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
