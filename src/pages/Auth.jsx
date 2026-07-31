import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRevealObserver } from '../lib/motion'
import Logo from '../components/Logo'
import Credit from '../components/Credit'

const steps = [
  { n: '01', title: 'Estude', text: 'Terminou a sessão, tire uma foto. Sem foto, não vale check-in.' },
  { n: '02', title: 'Faça check-in', text: 'Título, matéria e duração. O calendário marca o dia.' },
  { n: '03', title: 'Suba no ranking', text: 'Classificação por dias ativos, na comunidade e nos desafios.' },
]

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const pageRef = useRef(null)
  const formRef = useRef(null)
  const firstInputRef = useRef(null)

  useRevealObserver(pageRef, [mode])

  /** Troca o modo e leva a pessoa até o formulário. */
  function goToForm(next) {
    setMode(next)
    setMsg(null)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => firstInputRef.current?.focus({ preventScroll: true }), 550)
    })
  }

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password, options: { data: { name } },
        })
        if (error) throw error
        setMsg({ ok: true, text: 'Conta criada. Se a confirmação por e-mail estiver ativa, verifique sua caixa de entrada.' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={pageRef} className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-30 border-b border-edge backdrop-blur-xl"
        style={{ background: 'var(--s-nav)' }}
      >
        <div className="max-w-[1000px] mx-auto px-6 h-14 flex items-center">
          <Logo wordmark className="h-9 w-auto" textClass="text-[17px]" />
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-20 pb-20 text-center stagger">
        <div data-reveal="scale">
          <Logo className="h-32 sm:h-44 w-auto mx-auto float" />
        </div>
        <h1 className="display mt-8" data-reveal>
          Estudo sem prova
          <br />
          <span className="text-muted">é só intenção.</span>
        </h1>
        <p className="lead mt-6 max-w-xl mx-auto" data-reveal>
          Cada check-in exige uma foto do que você estudou. O calendário registra sua
          consistência e o ranking mostra quem está mantendo o ritmo.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap" data-reveal>
          <button onClick={() => goToForm('signup')} className="btn btn-primary">
            Criar conta
          </button>
          <button onClick={() => goToForm('login')} className="btn btn-ghost">
            Já tenho conta
          </button>
        </div>
      </section>

      {/* Como funciona */}
      <section className="section-alt py-24 px-6">
        <div className="max-w-[1000px] mx-auto">
          <h2 className="h1 text-center" data-reveal>Como funciona.</h2>
          <div className="mt-16 grid md:grid-cols-3 gap-6 stagger">
            {steps.map((s) => (
              <div key={s.n} className="card lift p-8" data-reveal="scale">
                <p className="eyebrow">Passo {s.n}</p>
                <h3 className="h2 mt-3">{s.title}</h3>
                <p className="text-muted mt-3 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section id="entrar" ref={formRef} className="py-24 px-6 scroll-mt-20">
        <div className="max-w-[420px] mx-auto">
          <h2 className="h1 text-center" data-reveal>
            {mode === 'signup' ? 'Criar conta.' : 'Entrar.'}
          </h2>
          <p className="lead text-center mt-3" data-reveal>
            {mode === 'signup' ? 'Leva menos de um minuto.' : 'Continue de onde você parou.'}
          </p>

          <form onSubmit={submit} className="mt-10 space-y-3.5 rise" key={mode}>
            {mode === 'signup' && (
              <input
                ref={firstInputRef}
                className="field"
                placeholder="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <input
              ref={mode === 'signup' ? undefined : firstInputRef}
              type="email"
              className="field"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="field"
              placeholder="Senha (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />

            {msg && (
              <p className={`text-sm leading-snug px-1 ${msg.ok ? 'text-brand' : 'text-red-500'}`}>
                {msg.text}
              </p>
            )}

            <button disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Aguarde' : mode === 'signup' ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-7">
            {mode === 'signup' ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMsg(null) }}
              className="link"
            >
              {mode === 'signup' ? 'Entrar' : 'Criar agora'}
            </button>
          </p>
        </div>
      </section>

      <footer className="section-alt">
        <div className="max-w-[1000px] mx-auto px-6 py-8 flex justify-center">
          <Credit />
        </div>
      </footer>
    </div>
  )
}
