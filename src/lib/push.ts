import { get, post } from '../api/client'

export type PushState = 'unsupported' | 'idle' | 'asking' | 'on' | 'denied'

export function pushSupported() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function initialPushState(): PushState {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return 'idle'
}

function urlBase64ToBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

// Asks the browser for permission, subscribes it to push and hands the subscription to the server for this order
export async function subscribeToOrder(token: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'idle'
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const { publicKey } = await get<{ publicKey: string }>('/public/push/public-key')
  const subscription = (await registration.pushManager.getSubscription())
    ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(publicKey) }))
  await post(`/public/takeaway-orders/${token}/push-subscriptions`, subscription.toJSON())
  return 'on'
}
