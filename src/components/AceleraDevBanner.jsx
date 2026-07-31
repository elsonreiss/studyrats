/**
 * Convite para a comunidade Acelera Dev.
 *
 * A UTM identifica o StudyRats como origem — assim dá para saber
 * quantas pessoas chegaram lá pelo app, separado do Instagram.
 */
const LINK =
  'https://aceleradev.com.br/?utm_source=studyrats&utm_medium=app&utm_campaign=organico&utm_content=100dias'

const ITEMS = [
  { title: 'Discord ativo', text: 'Mais de 900 devs trocando ideia, feedback e vagas todo dia.' },
  { title: 'Currículo e LinkedIn', text: 'Como se posicionar para o recrutador te achar.' },
  { title: 'Entrevistas', text: 'Roteiro do que responder e ferramenta para acompanhar cada processo.' },
]

export default function AceleraDevBanner() {
  return (
    <section className="card-soft overflow-hidden" data-reveal>
      <div className="p-8 sm:p-10">
        <p className="eyebrow">Comunidade</p>
        <h2 className="h1 mt-2">Acelera Dev.</h2>
        <p className="lead mt-4 max-w-xl">
          Estudar todo dia é metade do caminho. A outra metade é saber como transformar
          isso em entrevista e vaga — e é exatamente o que a comunidade destrincha.
        </p>

        <div className="grid sm:grid-cols-3 gap-5 mt-10">
          {ITEMS.map((i) => (
            <div key={i.title}>
              <p className="font-semibold">{i.title}</p>
              <p className="text-muted text-sm mt-1.5 leading-relaxed">{i.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-4 flex-wrap">
          <a
            href={LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Conhecer a comunidade
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-none stroke-current stroke-[1.8]" aria-hidden="true">
              <path d="M6 3h7v7M13 3 3.5 12.5" />
            </svg>
          </a>
          <span className="label">aceleradev.com.br</span>
        </div>
      </div>
    </section>
  )
}
