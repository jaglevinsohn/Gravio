import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "ClearView Dashboard",
    description: "A simple parent dashboard for monitoring academic performance.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="min-h-screen bg-[var(--color-bg-dark)] text-[#f8fafc]">{children}</body>
        </html>
    );
}
