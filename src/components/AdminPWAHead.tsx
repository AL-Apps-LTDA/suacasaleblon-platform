'use client'

import { useEffect } from 'react'

export function AdminPWAHead() {
  useEffect(() => {
    // Inject PWA meta tags into <head>
    const tags = [
      { tag: 'link', attrs: { rel: 'manifest', href: '/admin-manifest.json' } },
      { tag: 'meta', attrs: { name: 'theme-color', content: '#0c0c0f' } },
      { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' } },
      { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' } },
      { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'SCL Admin' } },
      { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/images/icon-180.png' } },
    ]

    const elements: HTMLElement[] = []

    tags.forEach(({ tag, attrs }) => {
      const el = document.createElement(tag)
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
      el.setAttribute('data-admin-pwa', 'true')
      document.head.appendChild(el)
      elements.push(el)
    })

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/admin-sw.js', { scope: '/admin' })
        .catch((err) => console.warn('Admin SW registration failed:', err))
    }

    return () => {
      elements.forEach((el) => el.remove())
    }
  }, [])

  return null
}
