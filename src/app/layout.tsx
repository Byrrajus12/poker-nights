import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PWARegister } from "@/components/pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  style: "italic",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poker Nights",
  description: "Track home poker games with friends.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poker Nights",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#070605",
};

const appleSplashScreens = [
  { width: 440, height: 956, pixelRatio: 3, file: "iPhone_17_Pro_Max__iPhone_16_Pro_Max" },
  { width: 402, height: 874, pixelRatio: 3, file: "iPhone_17_Pro__iPhone_17__iPhone_16_Pro" },
  { width: 430, height: 932, pixelRatio: 3, file: "iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max" },
  { width: 420, height: 912, pixelRatio: 3, file: "iPhone_Air" },
  { width: 393, height: 852, pixelRatio: 3, file: "iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro" },
  { width: 428, height: 926, pixelRatio: 3, file: "iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max" },
  { width: 390, height: 844, pixelRatio: 3, file: "iPhone_17e__iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12" },
  { width: 375, height: 812, pixelRatio: 3, file: "iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X" },
  { width: 414, height: 896, pixelRatio: 3, file: "iPhone_11_Pro_Max__iPhone_XS_Max" },
  { width: 414, height: 896, pixelRatio: 2, file: "iPhone_11__iPhone_XR" },
  { width: 414, height: 736, pixelRatio: 3, file: "iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus" },
  { width: 375, height: 667, pixelRatio: 2, file: "iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE" },
  { width: 320, height: 568, pixelRatio: 2, file: "4__iPhone_SE__iPod_touch_5th_generation_and_later" },
  { width: 1032, height: 1376, pixelRatio: 2, file: "13__iPad_Pro_M4" },
  { width: 1024, height: 1366, pixelRatio: 2, file: "12.9__iPad_Pro" },
  { width: 834, height: 1210, pixelRatio: 2, file: "11__iPad_Pro_M4" },
  { width: 834, height: 1194, pixelRatio: 2, file: "11__iPad_Pro__10.5__iPad_Pro" },
  { width: 820, height: 1180, pixelRatio: 2, file: "10.9__iPad_Air" },
  { width: 834, height: 1112, pixelRatio: 2, file: "10.5__iPad_Air" },
  { width: 810, height: 1080, pixelRatio: 2, file: "10.2__iPad" },
  { width: 768, height: 1024, pixelRatio: 2, file: "9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad" },
  { width: 744, height: 1133, pixelRatio: 2, file: "8.3__iPad_Mini" },
] as const;

const splashOrientations = ["landscape", "portrait"] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {splashOrientations.flatMap((orientation) =>
          appleSplashScreens.map(({ width, height, pixelRatio, file }) => (
            <link
              key={`${file}-${orientation}`}
              rel="apple-touch-startup-image"
              media={`screen and (device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${pixelRatio}) and (orientation: ${orientation})`}
              href={`/icons/splash/${file}_${orientation}.png`}
            />
          )),
        )}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <PWARegister />
      </body>
    </html>
  );
}
