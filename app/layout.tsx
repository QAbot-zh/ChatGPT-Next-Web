/* eslint-disable @next/next/no-page-custom-font */
import "./styles/globals.scss";
import "./styles/markdown.scss";
import "./styles/highlight.scss";
import { getClientConfig } from "./config/client";
import { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getServerSideConfig, getSidebarConfig } from "./config/server";
import { GoogleTagManager } from "@next/third-parties/google";
import localFont from "next/font/local";

const notoSans = localFont({
  src: [
    {
      path: "./fonts/NotoSans-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/NotoSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/NotoSans-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/NotoSans-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-noto-sans",
  display: "swap",
});

const serverConfig = getServerSideConfig();
const siderbarConfig = getSidebarConfig();

export const metadata: Metadata = {
  title: siderbarConfig.siteTitle,
  description: "Your personal ChatGPT Chat Bot.",
  appleWebApp: {
    title: siderbarConfig.siteTitle,
    statusBarStyle: "default",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#151515" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={notoSans.variable}>
      <head>
        <meta name="config" content={JSON.stringify(getClientConfig())} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <link
          rel="manifest"
          href="/site.webmanifest"
          crossOrigin="use-credentials"
        ></link>
        <script src="/serviceWorkerRegister.js" defer></script>
      </head>
      <body>
        {children}
        {serverConfig?.isVercel && !serverConfig?.disableVercelInsights && (
          <>
            <SpeedInsights />
          </>
        )}
        {serverConfig?.gtmId && (
          <>
            <GoogleTagManager gtmId={serverConfig.gtmId} />
          </>
        )}
      </body>
    </html>
  );
}
