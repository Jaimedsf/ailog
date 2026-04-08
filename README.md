# SEAS · Gestão de Obras e Infraestrutura

Sistema web de gestão de obras e infraestrutura da **Superintendência do Sistema Estadual de Atendimento Socioeducativo (SEAS)**. Permite o acompanhamento completo do ciclo de vida de obras públicas — desde o cadastro até a conclusão — com controle financeiro por MAPP, medições de andamento e modo de apresentação para reuniões.

---

## Stack Tecnológica

| Camada        | Tecnologia                                              |
|---------------|---------------------------------------------------------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Linguagem** | TypeScript (`.tsx` / `.ts`)                             |
| **Estilo**    | [Tailwind CSS v4](https://tailwindcss.com/) + CSS puro  |
| **Banco**     | [Supabase](https://supabase.com/) (PostgreSQL + Realtime) |
| **Auth**      | Supabase Auth (e-mail/senha)                            |
| **Planilhas** | [SheetJS (xlsx)](https://sheetjs.com/)                  |

---

## Pré-requisitos

- **Node.js** ≥ 18
- **npm** ≥ 9
- Uma conta ativa no [Supabase](https://supabase.com/) com as tabelas configuradas

---

## Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd ilog

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.local.example .env.local
# Edite .env.local com suas credenciais do Supabase
```

### Variáveis de ambiente (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
```

| Variável                         | Prefixo            | Uso                                                    |
|----------------------------------|---------------------|--------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`       | `NEXT_PUBLIC_` ✓   | Acessível no cliente. URL do projeto Supabase.          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | `NEXT_PUBLIC_` ✓   | Acessível no cliente. Chave pública (RLS protegido).    |
| `SUPABASE_SERVICE_ROLE_KEY`      | Sem prefixo ✗      | **Somente server-side.** Usada nas Server Actions para operações admin (criação/exclusão de usuários). |

> ⚠️ **Segurança**: A `SUPABASE_SERVICE_ROLE_KEY` jamais é exposta ao navegador. Ela é consumida exclusivamente em `src/app/actions/usuarios.ts` via Next.js Server Actions.

---

## Scripts

```bash
npm run dev      # Servidor de desenvolvimento (Turbopack) → http://localhost:3000
npm run build    # Build de produção (valida TypeScript)
npm run start    # Serve o build de produção
npm run lint     # ESLint
```

---

## Estrutura do Projeto

```
src/
├── app/                          # Rotas (Next.js App Router)
│   ├── layout.tsx                # Layout raiz (providers + fontes)
│   ├── globals.css               # CSS completo com sistema de temas
│   ├── page.tsx                  # / — Dashboard central
│   ├── login/
│   │   └── page.tsx              # /login — Autenticação
│   ├── obras/
│   │   └── page.tsx              # /obras — Listagem + filtros + tabela
│   ├── mapp/
│   │   └── page.tsx              # /mapp — Controle financeiro por MAPP
│   ├── usuarios/
│   │   └── page.tsx              # /usuarios — Gestão de usuários (admin)
│   ├── config/
│   │   └── page.tsx              # /config — Cadastros base + importação
│   ├── apresentacao/
│   │   └── page.tsx              # /apresentacao — Modo apresentação
│   └── actions/
│       └── usuarios.ts           # Server Actions (admin user CRUD)
│
├── components/                   # Componentes React reutilizáveis
│   ├── AuthProvider.tsx          # Contexto de autenticação + proteção de rotas
│   ├── DataContext.tsx           # Estado global + sincronização Realtime
│   ├── MainLayout.tsx            # Layout (sidebar + topbar + content)
│   ├── Sidebar.tsx               # Navegação lateral + seletor de ano
│   ├── Topbar.tsx                # Barra superior + seletor de tema
│   └── ObraModal.tsx             # Modal de criação/edição de obra + medições
│
└── lib/                          # Módulos utilitários
    ├── supabase.ts               # Cliente Supabase (lê de process.env)
    └── utils.ts                  # Formatadores, helpers, showToast()
```

---

## Arquitetura

### Fluxo de Autenticação

```
Usuário abre o app
       │
  AuthProvider verifica sessão (Supabase Auth)
       │
  ┌────┴────┐
  │ Sessão? │
  └────┬────┘
    Não │        Sim
        ▼         ▼
   /login     Carrega perfil (tabela `perfis`)
                  │
           ┌──────┴──────┐
           │  É admin?   │
           └──────┬──────┘
              Sim │        Não
                  ▼         ▼
        Acesso total   Somente leitura
```

### Sincronização em Tempo Real

O `DataContext` estabelece um canal Supabase Realtime que escuta alterações nas tabelas `obras`, `medicoes`, `mapps`, `anos` e `configuracoes`. Qualquer mudança feita por qualquer usuário é refletida automaticamente em todas as sessões abertas.

### Sistema de Temas

O CSS utiliza variáveis CSS (`:root` + `[data-theme="..."]`) para suportar **7 temas visuais**:

| Tema    | Atributo                   | Descrição        |
|---------|-----------------------------|-----------------|
| Escuro  | `:root` (padrão)           | GitHub Dark      |
| Claro   | `[data-theme="light"]`     | Light mode       |
| Azul    | `[data-theme="blue"]`      | Navy blue        |
| Verde   | `[data-theme="green"]`     | Forest green     |
| Roxo    | `[data-theme="purple"]`    | Deep purple      |
| Marrom  | `[data-theme="brown"]`     | Warm brown       |
| Cinza   | `[data-theme="gray"]`      | Neutral gray     |

A seleção é persistida em `localStorage` sob a chave `seas-theme`.

---

## Módulos Funcionais

### 📊 Dashboard (`/`)

- Cards com totais: obras, valor, concluídas, em execução
- Gráficos de barras interativos por **status**, **cidade** e **unidade**
- Mini-cards de MAPPs com barra de utilização
- Filtro dinâmico ao clicar nos gráficos

### 🏗️ Obras (`/obras`)

- Tabela paginada com **ordenação** por coluna clicável
- Filtros combinados: busca textual, status, MAPP, cidade, empresa
- Barra de resultado com valor total filtrado
- Botão de edição (admin) abrindo `ObraModal` com abas para dados e medições

### 💰 MAPPs (`/mapp`)

- Card detalhado por MAPP com barra de comprometimento
- Edição inline do limite financeiro (admin)
- Resumo com 5 indicadores: total, empenhado, concluídas, em execução, aguardando
- Tabela de obras vinculadas com andamento

### 👥 Usuários (`/usuarios`) — Admin

- Listagem de todos os usuários do Supabase Auth
- Criação de novos usuários (via **Server Action** segura)
- Exclusão de usuários (via **Server Action** segura)
- Badges visuais: Administrador / Visualizador

### ⚙️ Configurações (`/config`) — Admin

- CRUD de cadastros base: cidades, regiões, empresas, unidades
- **Importador de planilhas** (`.xlsx`, `.xls`, `.csv`)
  - Preview dos dados antes da confirmação
  - Inserção em lote com chunking de 50 registros

### 📽️ Apresentação (`/apresentacao`)

- Modo tela cheia sem sidebar/topbar
- Obras agrupadas por cidade com tabelas estilizadas
- Filtros por ano, status, MAPP e cidade
- Cards de resumo no topo

---

## Banco de Dados (Supabase)

### Tabelas esperadas

| Tabela           | Campos principais                                                       |
|------------------|-------------------------------------------------------------------------|
| `anos`           | `id`, `ano`                                                             |
| `obras`          | `id`, `ano`, `descricao`, `empresa`, `unidade`, `local`, `regiao`, `nup`, `os`, `mapp`, `origem`, `status`, `obs`, `data_os`, `inicio`, `termino`, `valor`, `empenhado` |
| `mapps`          | `id`, `num`, `valor_total`, `obs`, `ano`                                |
| `medicoes`       | `id`, `obra_id`, `num`, `data`, `descricao`, `valor`                   |
| `configuracoes`  | `id`, `tipo`, `valor`, `descricao`, `ativo`                            |
| `perfis`         | `id` (= auth.user.id), `nome`, `perfil` (`admin` \| `visualizador`)   |

### Realtime

Ative o recurso **Realtime** no Supabase para as tabelas: `obras`, `medicoes`, `mapps`, `anos`, `configuracoes`.

---

## Tipos TypeScript

As interfaces principais estão definidas em `src/components/DataContext.tsx`:

```typescript
interface Ano      { id?: number; ano: number }
interface Obra     { id: string; ano: number; descricao: string; ... valor: number; empenhado: number }
interface Mapp     { id: string; num: string; valor_total: number; obs: string; ano: number }
interface Medicao  { id?: string; obra_id: string; num: string; data: string; descricao: string; valor: number }
interface Configuracao { id: string; tipo: string; valor: string; descricao: string; ativo: boolean }
```

---

## Deploy

### Vercel (recomendado)

1. Conecte o repositório ao [Vercel](https://vercel.com/)
2. Configure as variáveis de ambiente no painel da Vercel
3. O build roda automaticamente a cada push

### Outras plataformas

```bash
npm run build   # Gera a pasta .next/
npm run start   # Serve em produção na porta 3000
```

---

## Licença

Projeto interno da SEAS — uso restrito.
