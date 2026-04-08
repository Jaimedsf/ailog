# SEAS - Gestão de Obras · Guia para Agentes AI

## Identidade do Projeto
- **Nome**: SEAS - Gestão de Obras e Infraestrutura
- **Framework**: Next.js 16.2 (App Router, Turbopack)
- **Linguagem**: TypeScript (`.tsx` / `.ts`)
- **Estilo**: TailwindCSS v4 + CSS puro (`globals.css`)
- **Backend**: Supabase (Auth + PostgreSQL + Realtime)
- **Importação**: SheetJS (`xlsx`)

## Regras de Ouro

### Next.js
<!-- BEGIN:nextjs-agent-rules -->
Esta versão do Next.js pode ter breaking changes em APIs e convenções. Leia os docs em `node_modules/next/dist/docs/` antes de escrever qualquer código. Preste atenção a deprecation notices.
<!-- END:nextjs-agent-rules -->

### TypeScript
- **Tudo é tipado**. Nunca use `any` sem necessidade explícita (único caso aceito: eventos `onInput` para currency).
- Interfaces de dados ficam em `src/components/DataContext.tsx`: `Ano`, `Obra`, `Mapp`, `Medicao`, `Configuracao`.
- Props de componentes devem ter interfaces nomeadas (`SidebarProps`, `TopbarProps`, etc.).

### Estilização
- **CSS puro** via variáveis CSS (`var(--bg)`, `var(--surface)`, etc.) definidas em `globals.css`.
- **Tailwind** é instalado (v4) mas usado minimamente. Priorize as classes CSS definidas.
- **Nunca use cores hardcoded** (`#0d1117`). Sempre use `var(--accent)`, `var(--surface2)`, etc.
- **Temas**: Implementados via atributo `data-theme` no `<html>`. Existem 7 temas (dark, light, blue, green, purple, brown, gray).

### Segurança
- Credenciais Supabase ficam **exclusivamente** em `.env.local` (gitignored).
- A `SUPABASE_SERVICE_ROLE_KEY` é usada **somente** em Server Actions (`src/app/actions/`).
- Nunca exponha chaves sem prefixo `NEXT_PUBLIC_` no cliente.

## Estrutura de Arquivos

```
src/
├── app/                          # Rotas (App Router)
│   ├── layout.tsx                # Layout raiz: ThemeProvider > AuthProvider > DataProvider > MainLayout
│   ├── globals.css               # Todas as classes CSS + sistema de 7 temas via data-theme
│   ├── page.tsx                  # Dashboard
│   ├── login/page.tsx            # Autenticação
│   ├── obras/page.tsx            # Listagem de obras
│   ├── mapp/page.tsx             # Controle financeiro MAPP
│   ├── usuarios/page.tsx         # Gestão de usuários (admin)
│   ├── config/page.tsx           # Configurações + importação
│   ├── apresentacao/page.tsx     # Modo apresentação
│   └── actions/usuarios.ts      # Server Actions (admin CRUD)
├── components/
│   ├── Modal.tsx                 # ⭐ Componente reutilizável de modal (padrão único)
│   ├── ThemeProvider.tsx         # Provider de tema (global, roda em TODAS as rotas)
│   ├── AuthProvider.tsx          # Autenticação + proteção de rotas
│   ├── DataContext.tsx           # Estado global + Realtime + tipos/interfaces
│   ├── MainLayout.tsx            # Layout: sidebar + topbar + content
│   ├── Sidebar.tsx               # Navegação + seletor de ano
│   ├── Topbar.tsx                # Barra superior + seletor de tema
│   └── ObraModal.tsx             # Modal complexo (usa Modal.tsx) para obras + medições
└── lib/
    ├── supabase.ts               # Cliente Supabase
    └── utils.ts                  # fmtNum, parseCurrency, statusClass, showToast, etc.
```

## Padrões Obrigatórios

### Modais
Todos os modais do sistema usam o componente `Modal` (`src/components/Modal.tsx`):
```tsx
<Modal isOpen={open} onClose={close} title="Título" maxWidth="440px" footer={<>botões</>}>
  {conteúdo}
</Modal>
```
Features do Modal: ESC fecha, click no overlay fecha, body scroll lock, header sticky.

### Formulários
- Use a classe `.form-grid` (grid 2 colunas) + `.field` para labels/inputs.
- `.field.full` para campos que ocupam toda a largura.
- Currency inputs usam `onInput` com mask `handleCurrency()`.

### Tabelas
- `<div className="table-wrap">` -> `<table>` -> `<thead>` com `.th` sortable -> `<tbody>`.
- Paginação: classe `.pagination` + `.page-btn`.

### Status de Obra
5 grupos: `CONCLUIDO`, `EM EXECUÇÃO`, `ARQUIVADO`, `AGUARDANDO`, `OUTROS`.
Funções: `getStatusGroup()`, `statusClass()`, `statusLabel()` em `utils.ts`.

### Toasts
`showToast(msg, color)` — cria elemento DOM temporário (3.5s), classe `.toast`.

## Banco de Dados (Supabase)

| Tabela          | Uso                                               |
|-----------------|---------------------------------------------------|
| `anos`          | Anos de referência                                |
| `obras`         | Cadastro de obras (vinculado a ano e MAPP)        |
| `mapps`         | Limites financeiros por MAPP                      |
| `medicoes`      | Medições de andamento (vinculadas a `obra_id`)    |
| `configuracoes` | Cadastros base: cidades, regiões, empresas, etc.  |
| `perfis`        | Perfil do usuário (`admin` / `visualizador`)      |

## Provider Hierarchy (layout.tsx)
```
ThemeProvider        ← Restaura tema em TODAS as rotas (inclusive /login, /apresentacao)
  └─ AuthProvider    ← Sessão + perfil + redirecionamento
      └─ DataProvider ← Dados globais + Realtime
          └─ MainLayout ← Sidebar/Topbar (skip em /login e /apresentacao)
```

## Comandos
```bash
npm run dev      # Dev server (Turbopack, port 3000)
npm run build    # Build de produção + type check
npm run start    # Serve produção
npm run lint     # ESLint
```
