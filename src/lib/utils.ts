import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function nightsBetween(ci: string, co: string): number | null {
  const a = new Date(`${ci}T00:00:00`)
  const b = new Date(`${co}T00:00:00`)
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

export function whatsappLink(message: string): string {
  return `https://wa.me/5521995360322?text=${encodeURIComponent(message)}`
}
