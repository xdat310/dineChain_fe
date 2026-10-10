import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { get, getSession, onSessionChange, post, saveSession, type Session } from './api/client'
import type { AuthResponse, BranchResponse } from './api/types'

interface AuthState {
  session: Session | null
  role?: string
  // The branch this screen works on: the staff member's own, or the one the owner picked
  branchId?: number
  branches: BranchResponse[]
  setBranchId: (id: number) => void
  // After a branch is added, renamed or closed
  reloadBranches: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)
const BRANCH_KEY = 'dinechain.branch'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(getSession())
  const [branches, setBranches] = useState<BranchResponse[]>([])
  const [pickedBranch, setPickedBranch] = useState<number | undefined>(() => {
    try {
      const v = localStorage.getItem(BRANCH_KEY)
      return v ? Number(v) : undefined
    } catch {
      return undefined
    }
  })

  useEffect(() => onSessionChange(setSession), [])

  const loadBranches = () => get<BranchResponse[]>('/branches').then(setBranches).catch(() => setBranches([]))
  useEffect(() => {
    if (!session) return
    loadBranches()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const role = session?.staff.role
  const ownBranch = session?.staff.branchId
  const branchId = ownBranch ?? pickedBranch ?? branches[0]?.id

  const value: AuthState = {
    session,
    role,
    branchId,
    branches,
    reloadBranches: loadBranches,
    setBranchId: (id) => {
      setPickedBranch(id)
      try {
        localStorage.setItem(BRANCH_KEY, String(id))
      } catch {
        // remembered for this tab only
      }
    },
    login: async (username, password) => {
      const data = await post<AuthResponse>('/auth/login', { username, password })
      saveSession({ accessToken: data.accessToken!, refreshToken: data.refreshToken!, staff: data.staff! })
    },
    logout: async () => {
      const refreshToken = getSession()?.refreshToken
      try {
        if (refreshToken) await post('/auth/logout', { refreshToken })
      } catch {
        // signing out locally is what matters
      }
      saveSession(null)
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}

export const can = {
  pos: (role?: string) => ['ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'WAITER'].includes(role ?? ''),
  // Cashiers and waiters hand dishes out from the POS ("Bưng ra"); the kitchen screen is for cooking
  kitchen: (role?: string) => ['ADMIN', 'BRANCH_MANAGER', 'CHEF'].includes(role ?? ''),
  // Taking the money, closing and cancelling a bill
  cash: (role?: string) => ['ADMIN', 'BRANCH_MANAGER', 'CASHIER'].includes(role ?? ''),
  // Dropping a dish the kitchen already started
  cancelCooking: (role?: string) => ['ADMIN', 'BRANCH_MANAGER'].includes(role ?? ''),
  // The chain owner is not scheduled on shifts
  shifts: (role?: string) => role !== 'ADMIN',
  manage: (role?: string) => ['ADMIN', 'BRANCH_MANAGER'].includes(role ?? ''),
  stock: (role?: string) => ['ADMIN', 'BRANCH_MANAGER', 'WAREHOUSE'].includes(role ?? ''),
  owner: (role?: string) => role === 'ADMIN',
}

// Everything for the restaurant's own people (owner, managers, staff) lives under this prefix; guests use the root
export const STAFF = '/nha-hang'

export function homeFor(role?: string) {
  if (role === 'ADMIN') return `${STAFF}/chuoi`
  if (role === 'CHEF') return `${STAFF}/bep`
  if (role === 'BRANCH_MANAGER') return `${STAFF}/quan-ly`
  if (role === 'WAREHOUSE') return `${STAFF}/kho`
  return `${STAFF}/ban-hang`
}
