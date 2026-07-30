import Leaderboard from '../components/Leaderboard'

export default function Ranking() {
  return (
    <div className="space-y-16">
      <section className="text-center stagger">
        <p className="eyebrow" data-reveal>Comunidade Acelera Dev</p>
        <h1 className="display mt-3" data-reveal>Classificações.</h1>
        <p className="lead mt-5 max-w-xl mx-auto" data-reveal>
          Ordenado por dias com check-in. Empate é decidido pelo tempo estudado.
        </p>
      </section>

      <Leaderboard />
    </div>
  )
}
