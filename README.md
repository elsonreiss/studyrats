<div align="center">

<img src="public/logo.png" alt="StudyRats" width="200" />

**Registre seus estudos com foto, mantenha a sequência e corra 100 dias com a comunidade.**

App de consistência nos estudos inspirado no [GymRats](https://www.gymrats.app/),
feito para a comunidade **Acelera Dev**.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-instalável-5A0FC8?style=flat-square)

</div>

---

## A ideia

Estudar é fácil de dizer e difícil de comprovar. No StudyRats, **cada sessão de estudo
exige uma foto** — anotações, a tela do editor, o livro aberto. Sem foto, não vale check-in.

O que importa não é quanto tempo você estudou, e sim **quantos dias seguidos você apareceu**.
O calendário mostra sua consistência, a sequência mostra seu compromisso, e a corrida dos
100 dias coloca todo mundo na mesma pista.

## Funcionalidades

### Check-ins

- **Foto obrigatória**, com câmera nativa dentro do app (`getUserMedia`) ou escolha da galeria
- Título, matéria, descrição e duração em seletor estilo roleta
- Publicação em **vários desafios de uma vez**
- Edição depois de publicado, remoção com confirmação
- **Curtidas e comentários**, liberados apenas entre quem divide um desafio

### Progresso

- **Corrida dos 100 dias** — pista com a foto de cada pessoa avançando conforme os dias de
  check-in, com marcos em 25/50/75 e linha de chegada
- **Sequência de dias seguidos**, com alerta quando está prestes a quebrar
- **Calendário mensal** no perfil, cada dia mostrando a miniatura da foto
- **Ranking** por dias ativos, com desempate por tempo estudado

### Desafios

- Grupos **privados** com foto de capa, prazo e barra de progresso
- Só entra quem recebe o link ou o código de convite
- Ranking interno, estatísticas, lista de membros e **bate-papo em tempo real**

### Interface

- **Tema claro e escuro** seguindo o sistema, com alternância manual
- Animações de entrada, contadores animados e transições entre páginas
- **Instalável como app** (PWA), com lembrete diário de check-in

## Stack

| Camada | Tecnologia |
|---|---|
| Front-end | React 18 + Vite 5 |
| Estilo | Tailwind CSS v4 (tokens em CSS custom properties) |
| Banco e auth | Supabase (Postgres + Row Level Security) |
| Arquivos | Supabase Storage, bucket privado com URLs assinadas |
| Tempo real | Supabase Realtime (chat e comentários) |
| Deploy | Vercel |

## Rodando localmente

### 1. Supabase

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode os arquivos de [`supabase/`](supabase/) na ordem descrita
   em [`supabase/README.md`](supabase/README.md).
3. Em **Authentication → Sign In / Providers → Email**, desative "Confirm email" para
   login imediato (opcional).
4. Em **Project Settings → API Keys**, copie a **Project URL** e a chave **anon public**.

### 2. Projeto

```bash
git clone https://github.com/elsonreiss/studyrats.git
cd studyrats

cp .env.example .env
# preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

Abra <http://localhost:5173>.

> A chave `anon` é pública por natureza — ela fica exposta no navegador de qualquer forma.
> A segurança vem das políticas de RLS no banco. **Nunca** use a chave `service_role`
> no front-end.

## Deploy

O projeto está pronto para a Vercel: o [`vercel.json`](vercel.json) já reescreve as rotas
do SPA.

1. Importe o repositório em [vercel.com](https://vercel.com).
2. Adicione as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Deploy.

> O service worker e o "instalar como app" exigem **HTTPS**, ou seja, só funcionam em
> produção. Em `localhost` o PWA fica desligado de propósito.

## Estrutura

```
supabase/              # schema e migrações numeradas
public/                # logos, ícones do PWA, manifest e service worker
src/
  App.jsx              # rotas sob demanda, contexto de auth e lembrete
  lib/
    supabase.js        # cliente, formatação, fuso e upload
    photos.js          # URLs assinadas com cache persistente
    cleanup.js         # limpeza de fotos antigas e uso de espaço
    theme.js           # tema claro / escuro / automático
    motion.js          # revelação no scroll e contadores animados
    reminder.js        # lembrete diário de check-in
  components/          # 25 componentes reutilizáveis
  pages/               # Auth, Feed, NewCheckin, Race, Ranking,
                       # Groups, GroupDetail, Profile
```

## Decisões técnicas

<details>
<summary><b>Privacidade mora no banco, não no front-end</b></summary>

Todas as regras de acesso são políticas de **Row Level Security**. Quem não é membro de
um desafio não lê o grupo, a lista de membros, o ranking, os check-ins nem o chat — mesmo
chamando a API diretamente. Entrar num desafio acontece por uma função `security definer`
que exige link ou código válido.

</details>

<details>
<summary><b>O dia fecha à meia-noite de Brasília</b></summary>

Servidor em UTC faria o dia virar às 21h no Brasil. O fuso `America/Sao_Paulo` é aplicado
nos dois lados: no cliente via `Intl.DateTimeFormat` e no banco via `br_today()`, que
também é o default da coluna `studied_at`.

</details>

<details>
<summary><b>Fotos privadas com URLs assinadas de 24h</b></summary>

O bucket `checkins` não é público. O app pede URLs assinadas em lote, com cache em
`localStorage`. A validade longa é proposital: assinatura de 1 hora muda a cada
carregamento e invalida o cache do navegador, o que multiplica a banda consumida.

</details>

<details>
<summary><b>Storage com teto, não crescimento infinito</b></summary>

Cada foto é salva em duas resoluções (900px e 300px), somando ~130 KB por check-in.
Passados 60 dias a imagem é apagada, mas o check-in permanece — dias ativos, sequência
e ranking não mudam. A limpeza roda no máximo uma vez por dia, disparada quando alguém
publica, sem precisar de cron nem servidor.

Resultado: com 300 pessoas ativas, o consumo estabiliza em torno de **800 MB de storage**
e **2–3 GB de banda por mês**, dentro do plano gratuito do Supabase.

</details>

<details>
<summary><b>Lembrete sem backend</b></summary>

A notificação diária é agendada pelo próprio dispositivo enquanto o app está aberto ou
instalado na tela inicial. Push de verdade exigiria um servidor com chaves VAPID.

</details>

## Roteiro

- [ ] Push real (servidor VAPID) para o lembrete funcionar com o app fechado
- [ ] Onboarding com trilha e nível, para rankings por stack
- [ ] Metas por desafio (ex.: 5 check-ins por semana)
- [ ] Gráfico de horas por semana e matérias mais estudadas
- [ ] Busca e filtro por tecnologia no feed

## Licença

MIT

---

<div align="center">

feito por [**elsonreiss**](https://github.com/elsonreiss) · comunidade Acelera Dev

</div>
