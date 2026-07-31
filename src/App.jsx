import { useEffect, useState, createContext, useContext, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { supabase, todayISO } from './lib/supabase'
import { useDailyReminder } from './lib/reminder'
import Layout from './components/Layout'
import InstallPrompt from './components/InstallPrompt'
import RatLoader from './components/RatLoader'
import ScrollToTop from './components/ScrollToTop'
import Auth from './pages/Auth'
import Feed from './pages/Feed'

// rotas carregadas sob demanda — reduz o bundle inicial
const Legal = lazy(() => import('./pages/Legal'))
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

const LEGAL_DOCS = ['privacidade', 'termos']

/** Sem sessão, só privacidade e termos abrem; o resto cai no login. */
function LegalOrAuth() {
  const { doc } = useParams()
  if (!LEGAL_DOCS.includes(doc)) return <Auth />
  return (
    <div className="min-h-screen px-6 py-12">
      <Legal />
    </div>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const [checkedToday, setCheckedToday] = useState(null)

  // reconsulta a cada troca de tela: sem isso o lembrete podia avisar
  // "você não fez check-in hoje" para quem acabou de fazer
  useEffect(() => {
    let alive = true
    supabase.rpc('get_my_streak').then(({ data }) => {
      if (alive) setCheckedToday(data?.[0]?.checked_today ?? null)
    })
    return () => { alive = false }
  }, [pathname])

  useDailyReminder(checkedToday, todayISO())

  return (
    <Layout>
      <ScrollToTop />
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
          <Route path="/privacidade" element={<Legal />} />
          <Route path="/termos" element={<Legal />} />
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

  // privacidade e termos precisam abrir sem conta: quem vai se cadastrar
  // tem que conseguir ler antes de aceitar
  if (!session) {
    return (
      <Suspense fallback={<RatLoader size={52} />}>
        <Routes>
          <Route path="/:doc" element={<LegalOrAuth />} />
          <Route path="*" element={<Auth />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <AuthContext.Provider value={{ session, user: session.user }}>
      <Shell />
    </AuthContext.Provider>
  )
}
