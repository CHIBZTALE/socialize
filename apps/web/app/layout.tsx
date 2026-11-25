import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Socialize — Connect. Create. Belong.', description: 'Your world. Your people. Your Socialize.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
