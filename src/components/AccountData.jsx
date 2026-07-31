import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'
import ConfirmDialog from './ConfirmDialog'

const BUCKETS = ['checkins', 'avatars', 'groups']

export default function AccountData() {
  const { user } = useAuth()
  const [busy, setBusy] = useState(null)
  const [ask, setAsk] = useState(false)
  const [msg, setMsg] = useState(null)

  async function exportData() {
    setBusy('export')
    setMsg(null)
    try {
      const { data, error } = await supabase.rpc('export_my_data')
      if (error) throw error

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `studyrats-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      setMsg({ ok: true, text: 'Arquivo baixado.' })
    } catch {
      setMsg({ ok: false, text: 'Não foi possível gerar o arquivo. Tente de novo.' })
    } finally {
      setBusy(null)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  /** Remove as imagens antes de apagar a conta — o storage não cai em cascata. */
  async function removeMyFiles() {
    for (const bucket of BUCKETS) {
      try {
        const { data } = await supabase.storage.from(bucket).list(user.id, { limit: 1000 })
        const paths = (data || []).map((f) => `${user.id}/${f.name}`)
        if (paths.length) await supabase.storage.from(bucket).remove(paths)
      } catch {
        // se uma falhar, segue para as outras
      }
    }
  }

  async function deleteAccount() {
    setBusy('delete')
    setMsg(null)
    try {
      await removeMyFiles()
      const { error } = await supabase.rpc('delete_my_account')
      if (error) throw error

      await supabase.auth.signOut()
      window.location.href = '/'
    } catch {
      setBusy(null)
      setAsk(false)
      setMsg({ ok: false, text: 'Não foi possível apagar a conta. Tente de novo ou me escreva.' })
    }
  }

  return (
    <div className="card-soft p-6">
      <h3 className="font-semibold">Seus dados</h3>
      <p className="text-sm text-muted mt-1 max-w-md leading-relaxed">
        Você pode levar tudo embora ou apagar de vez, a qualquer momento. Veja o que é
        guardado na{' '}
        <Link to="/privacidade" className="link">política de privacidade</Link>.
      </p>

      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button
          type="button"
          onClick={exportData}
          disabled={busy === 'export'}
          className="btn btn-ghost btn-sm"
        >
          {busy === 'export' ? 'Gerando' : 'Baixar meus dados'}
        </button>

        <button
          type="button"
          onClick={() => setAsk(true)}
          className="btn btn-sm !text-red-500 !border !border-red-500/40 hover:!bg-red-500/10"
        >
          Apagar minha conta
        </button>
      </div>

      {msg && (
        <p className={`text-sm mt-4 ${msg.ok ? 'text-brand' : 'text-red-500'}`}>{msg.text}</p>
      )}

      <ConfirmDialog
        open={ask}
        danger
        loading={busy === 'delete'}
        title="Apagar sua conta?"
        message="Some tudo: perfil, check-ins, fotos, comentários, mensagens e os desafios que você criou — inclusive para os outros membros deles. Não tem como desfazer."
        confirmLabel="Sim, apagar tudo"
        cancelLabel="Não, voltar"
        onConfirm={deleteAccount}
        onCancel={() => setAsk(false)}
      />
    </div>
  )
}
