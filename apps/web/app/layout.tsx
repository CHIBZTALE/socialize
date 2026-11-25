import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
export const metadata: Metadata = { title: 'Socialize — Connect. Create. Belong.', description: 'Your world. Your people. Your Socialize.' };
export default function RootLayout({children}:{children:ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
