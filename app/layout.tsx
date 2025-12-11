import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {

  
  title: 'Manu AI',
  description: 'AI toolkit UI',
}

import type { ReactNode } from 'react'
import ChatFab from '../components/ChatFab'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        {/* Client chat widget */}
        <ChatFab />
      </body>
    </html>
  )
}


