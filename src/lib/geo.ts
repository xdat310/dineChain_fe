import { useState } from 'react'

// Straight-line distance in km between two points on Earth (haversine)
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export function formatKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000 / 10) * 10} m` : `${km.toLocaleString('vi-VN', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`
}

type State =
  | { status: 'idle' | 'asking' }
  | { status: 'ok'; lat: number; lng: number }
  | { status: 'error'; message: string }

// The guest's position from the phone itself (GPS / Wi-Fi), asked only when they tap the button.
// Browsers only allow it on https or localhost, like the camera.
export function useMyLocation() {
  const [state, setState] = useState<State>({ status: 'idle' })
  function ask() {
    if (!window.isSecureContext || !navigator.geolocation) {
      setState({ status: 'error', message: 'Trình duyệt chỉ cho lấy vị trí trên trang https. Hãy chọn chi nhánh theo địa chỉ.' })
      return
    }
    setState({ status: 'asking' })
    navigator.geolocation.getCurrentPosition(
      (p) => setState({ status: 'ok', lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => setState({
        status: 'error',
        message: e.code === e.PERMISSION_DENIED
          ? 'Bạn chưa cho phép lấy vị trí. Bật quyền vị trí cho trình duyệt rồi thử lại.'
          : 'Chưa lấy được vị trí, thử lại sau ít giây.',
      }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5 * 60 * 1000 },
    )
  }
  return { state, ask }
}

// Branches nearest first; branches without a map position go last. distance is null for those.
export function byDistance<T extends { latitude?: number; longitude?: number }>(items: T[], from: { lat: number; lng: number } | null) {
  const withKm = items.map((b) => ({
    item: b,
    km: from && b.latitude != null && b.longitude != null ? distanceKm(from, { lat: b.latitude, lng: b.longitude }) : null,
  }))
  if (!from) return withKm
  return [...withKm].sort((x, y) => (x.km ?? Infinity) - (y.km ?? Infinity))
}
