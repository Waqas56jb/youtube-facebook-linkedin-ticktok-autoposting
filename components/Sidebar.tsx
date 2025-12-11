"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';

// Minimal, crisp inline SVG icons (no external deps)
const Icon = {
  dashboard: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm7 0h11v8H10v-8z"/>
    </svg>
  ),
  transcript: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5L14 3.5zM7 11h10v2H7v-2zm0 4h10v2H7v-2zm0-8h5v2H7V7z"/>
    </svg>
  ),
  story: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M12 2l3 7h7l-5.6 4.1L18.8 21 12 16.6 5.2 21l2.4-7.9L2 9h7l3-7z"/>
    </svg>
  ),
  trim: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M4 4h3v3H4V4zm13 0h3v3h-3V4zM7 7h10v10H7V7zM4 17h3v3H4v-3zm13 0h3v3h-3v-3z"/>
    </svg>
  ),
  schedule: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2zm15 8H2v10h20V10zm-9 2h2v5h-2v-5zm-4 0h2v5H9v-5zm8 0h2v5h-2v-5z"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M19.4 12.9c.04-.3.06-.6.06-.9s-.02-.6-.06-.9l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.2 7.2 0 0 0-1.56-.9l-.38-2.65A.5.5 0 0 0 13.5 2h-4a.5.5 0 0 0-.49.41l-.38 2.65c-.56.22-1.08.51-1.56.9l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64L4.6 11.1c-.04.3-.06.6-.06.9s.02.6.06.9L2.49 14.55a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.49-1c.48.39 1 .68 1.56.9l.38 2.65c.04.24.25.41.49.41h4c.24 0 .45-.17.49-.41l.38-2.65c.56-.22 1.08-.51 1.56-.9l2.49 1a.5.5 0 0 0 .6-.22l2-3.46a.5.5 0 0 0-.12-.64L19.4 12.9zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="currentColor" d="M10 17v-2h4v-6h-4V7H5v10h5zm9-5-3-3v2h-4v2h4v2l3-3z"/>
    </svg>
  ),
};

const nav = [
  { href: '/', label: 'Dashboard', icon: Icon.dashboard },
  { href: '/transcript', label: 'Transcript', icon: Icon.transcript },
  { href: '/story-generate', label: 'Story Generate', icon: Icon.story },
  { href: '/video-trim', label: 'Video Trim', icon: Icon.trim },
  { href: '/schedule-post', label: 'Schedule Post', icon: Icon.schedule },
  { href: '/schedule', label: 'Schedule', icon: Icon.schedule },
  // Rename from Analysis → Settings, keep the route
  { href: '/analysis', label: 'Settings', icon: Icon.settings },
  { href: '/logout', label: 'Logout', icon: Icon.logout },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:block fixed left-0 top-0 h-screen w-60 border-r border-border bg-[#0a0a0a] p-4">
      <Logo />
      <div className="my-3 h-px w-full bg-border" />
      <nav className="flex flex-col gap-2">
        {nav.map((item) => {
          const active = pathname === item.href;
          const isTranscript = item.href === '/transcript';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg border border-border bg-panel px-3 py-2 transition-all duration-200 hover:bg-panelHover hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#3a3a3a] ${active ? 'bg-panelActive border-[#3a3a3a] shadow-lg' : ''} ${isTranscript ? 'hover:border-[#3a3a3a] hover:shadow-md' : ''}`}
              title={isTranscript ? 'Upload files or write manual scripts for transcription' : ''}
            >
              <span className="flex items-center gap-2">
                <span className="text-[#b5b5b5]">{item.icon}</span>
                <span>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


