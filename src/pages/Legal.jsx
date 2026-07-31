import { Link, useLocation } from 'react-router-dom'

export const TERMS_VERSION = '2026-07-31'
export const CONTACT_EMAIL = 'elsonreis084@gmail.com'

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="h2">{title}</h2>
      <div className="text-muted leading-relaxed mt-3 space-y-3">{children}</div>
    </section>
  )
}

function Privacidade() {
  return (
    <>
      <p className="label">Última atualização: 31 de julho de 2026</p>
      <h1 className="display mt-3">Privacidade.</h1>
      <p className="lead mt-5">
        Este documento explica quais dados o StudyRats coleta, por que coleta, onde eles ficam
        e o que você pode fazer com eles. Em linguagem direta, sem juridiquês desnecessário.
      </p>

      <Section title="Quem é responsável">
        <p>
          O StudyRats é um projeto pessoal mantido por Elson Reis. O contato para qualquer
          assunto sobre seus dados é <a className="link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="O que é coletado">
        <p><strong className="text-ink font-medium">Ao criar a conta:</strong> nome e e-mail. A senha é guardada
        criptografada pelo Supabase — nem eu tenho acesso a ela.</p>
        <p><strong className="text-ink font-medium">Ao usar o app:</strong> foto de perfil e bio (se você
        preencher), fotos dos check-ins, título, matéria, descrição, duração e data de cada
        check-in, comentários, mensagens nos bate-papos, curtidas e de quais desafios você participa.</p>
        <p><strong className="text-ink font-medium">Automaticamente:</strong> nada além disso. Não há
        rastreamento, analytics, pixel de anúncio nem cookie de terceiros.</p>
      </Section>

      <Section title="Para que os dados são usados">
        <p>
          Exclusivamente para o app funcionar: montar seu perfil e calendário, calcular sua
          sequência, posicionar você na corrida dos 100 dias e nos rankings, e mostrar seus
          check-ins para as outras pessoas da comunidade.
        </p>
        <p>
          Seus dados não são vendidos, alugados nem compartilhados com anunciantes.
        </p>
      </Section>

      <Section title="O que fica visível para outras pessoas">
        <p>
          <strong className="text-ink font-medium">Público para quem tem conta:</strong> seu nome, foto de
          perfil, bio, e seus check-ins com as fotos, além dos rankings e da corrida.
        </p>
        <p>
          <strong className="text-ink font-medium">Restrito aos membros do desafio:</strong> as mensagens do
          bate-papo, a lista de membros e o ranking interno. Quem não é membro não consegue
          ler nada disso, nem pela API.
        </p>
        <p>
          Como o check-in exige foto, tenha em mente que a imagem será vista por outras pessoas.
          Evite enquadrar documentos, endereços, telefones ou terceiros que não autorizaram.
        </p>
      </Section>

      <Section title="Onde os dados ficam">
        <p>
          O banco de dados e as imagens ficam no <strong className="text-ink font-medium">Supabase</strong>, com
          servidores nos <strong className="text-ink font-medium">Estados Unidos (região de Oregon)</strong>. O site é
          hospedado na <strong className="text-ink font-medium">Vercel</strong>.
        </p>
        <p>
          Isso significa que há transferência internacional dos seus dados. Ao criar a conta,
          você concorda com essa transferência. Ambos os serviços têm compromissos contratuais
          de proteção de dados.
        </p>
      </Section>

      <Section title="Por quanto tempo">
        <p>
          Seus dados ficam guardados enquanto sua conta existir. Quando você apaga a conta,
          tudo é removido: perfil, check-ins, fotos, comentários, mensagens e curtidas.
        </p>
        <p>
          <strong className="text-ink font-medium">As fotos dos check-ins são apagadas automaticamente após
          60 dias.</strong> O registro do check-in continua contando para sua sequência e para o
          ranking, mas a imagem em si é excluída.
        </p>
      </Section>

      <Section title="Seus direitos">
        <p>Pela LGPD, você pode a qualquer momento:</p>
        <p>
          <strong className="text-ink font-medium">Acessar e exportar</strong> — em Perfil → Ajustes existe o botão
          "Baixar meus dados", que gera um arquivo com tudo que o app guardou sobre você.
        </p>
        <p>
          <strong className="text-ink font-medium">Corrigir</strong> — nome, bio e foto de perfil são editáveis
          direto no app, e cada check-in pode ser editado ou removido.
        </p>
        <p>
          <strong className="text-ink font-medium">Apagar</strong> — em Perfil → Ajustes existe "Apagar minha conta".
          A exclusão é imediata e não tem volta.
        </p>
        <p>
          Se preferir, escreva para <a className="link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> e
          eu faço por você.
        </p>
      </Section>

      <Section title="Idade mínima">
        <p>
          O StudyRats é para maiores de 16 anos. Entre 16 e 18, o uso deve ser acompanhado
          pelos responsáveis. Menores de 16 não devem criar conta — se isso acontecer e eu for
          avisado, a conta será removida.
        </p>
      </Section>

      <Section title="Segurança">
        <p>
          Todo o acesso aos dados passa por regras no próprio banco (Row Level Security), não
          apenas por checagens no navegador. As fotos dos check-ins ficam em armazenamento
          privado, acessível só por links temporários gerados para quem está logado.
        </p>
        <p>
          Nenhum sistema é infalível. Se você notar qualquer falha, me avise no e-mail acima.
        </p>
      </Section>

      <Section title="Mudanças">
        <p>
          Se este documento mudar de forma relevante, você será avisado dentro do app antes de
          continuar usando.
        </p>
      </Section>
    </>
  )
}

function Termos() {
  return (
    <>
      <p className="label">Última atualização: 31 de julho de 2026</p>
      <h1 className="display mt-3">Termos de uso.</h1>
      <p className="lead mt-5">
        As regras para usar o StudyRats. São curtas de propósito.
      </p>

      <Section title="O que é o StudyRats">
        <p>
          Um app gratuito para registrar sessões de estudo com foto, acompanhar consistência e
          competir de forma saudável com outras pessoas. É um projeto pessoal, sem empresa por
          trás e sem garantia de funcionamento ininterrupto.
        </p>
      </Section>

      <Section title="Sua conta">
        <p>
          Você é responsável pela sua senha e pelo que publica. Use um nome pelo qual as pessoas
          possam te reconhecer — não é obrigatório usar o nome completo.
        </p>
      </Section>

      <Section title="O que você publica">
        <p>
          As fotos e textos continuam sendo seus. Ao publicar, você autoriza o app a exibi-los
          para as outras pessoas da comunidade, conforme explicado na política de privacidade.
        </p>
        <p>Só publique fotos que você tirou e que você tem o direito de mostrar.</p>
      </Section>

      <Section title="O que não é permitido">
        <p>
          Conteúdo ofensivo, discriminatório, sexual ou ilegal. Fotos de outras pessoas sem
          autorização. Assédio ou perseguição a qualquer participante. Fraudar o ranking com
          check-ins que não correspondem a estudo real. Spam ou divulgação não solicitada nos
          bate-papos.
        </p>
        <p>
          Contas que descumprirem isso podem ser removidas sem aviso prévio.
        </p>
      </Section>

      <Section title="Sobre os desafios">
        <p>
          Quem cria um desafio é responsável por quem convida. Ao apagar a conta, os desafios
          criados por você são apagados junto, para todos os membros.
        </p>
      </Section>

      <Section title="Encerramento">
        <p>
          Você pode apagar sua conta quando quiser, em Perfil → Ajustes. O app também pode ser
          descontinuado — nesse caso, haverá aviso com antecedência para exportar seus dados.
        </p>
      </Section>

      <Section title="Limitação">
        <p>
          O StudyRats é oferecido "como está". Não há garantia de disponibilidade, e o
          responsável não se compromete a indenizar por perda de dados, indisponibilidade ou
          qualquer prejuízo decorrente do uso.
        </p>
      </Section>
    </>
  )
}

export default function Legal() {
  const { pathname } = useLocation()
  const isTerms = pathname.includes('termos')

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <Link to="/" className="label hover:text-ink transition">← Voltar</Link>

      <div className="mt-6">{isTerms ? <Termos /> : <Privacidade />}</div>

      <div className="flex gap-6 mt-14 pt-8 border-t border-edge">
        <Link to="/privacidade" className={isTerms ? 'link' : 'label'}>Privacidade</Link>
        <Link to="/termos" className={isTerms ? 'label' : 'link'}>Termos de uso</Link>
      </div>
    </div>
  )
}
