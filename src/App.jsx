import { useEffect, useState, createContext, useContext, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase, todayISO } from './lib/supabase'
import { useDailyReminder } from './lib/reminder'
import Layout from './components/Layout'
import InstallPrompt from './components/InstallPrompt'
import RatLoader from './components/RatLoader'
import Auth from './pages/Auth'
import Feed from './pages/Feed'

// rotas carregadas sob demanda — reduz o bundle inicial
const NewCheckin = lazy(() => import('./pages/NewCheckin'))
const Race = lazy(() => import('./pages/Race'))
const Ranking = lazy(() => import('./pages/Ranking'))
const Groups = lazy(() => import('./pages/Groups'))
const GroupDetail = lazy(() => import('./pages/GroupDetail'))
const Profile = lazy(() => import('./pages/Profile'))

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function Fallback() {
  return <RatLoader size={52} />
}

function Shell() {
  const [checkedToday, setCheckedToday] = useState(null)

  useEffect(() => {
    supabase.rpc('get_my_streak').then(({ data }) => {
      setCheckedToday(data?.[0]?.checked_today ?? null)
    })
  }, [])

  useDailyReminder(checkedToday, todayISO())

  return (
    <Layout>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/checkin" element={<NewCheckin />} />
          <Route path="/100-dias" element={<Race />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/grupos" element={<Groups />} />
          <Route path="/grupos/:id" element={<GroupDetail />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/perfil/:id" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <InstallPrompt />
    </Layout>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen grid place-items-center">
        <RatLoader size={56} label="" />
      </div>
    )
  }

  if (!session) return <Auth />

  return (
    <AuthContext.Provider value={{ session, user: session.user }}>
      <Shell />
    </AuthContext.Provider>
  )
}
