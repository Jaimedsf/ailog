# SEAS - Gestão de Obras

> Leia `AGENTS.md` para o guia completo de arquitetura e padrões.

## Quick Reference

### Setup
```bash
npm install
# Configure .env.local com as chaves Supabase
npm run dev
```

### Variáveis de Ambiente (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # SOMENTE server-side
```

### Stack
- **Next.js 16** (App Router) + **TypeScript**
- **TailwindCSS v4** + CSS puro (`globals.css`)
- **Supabase** (Auth + DB + Realtime)

### Arquitetura
- Providers: `ThemeProvider` → `AuthProvider` → `DataProvider` → `MainLayout`
- Tipos: `DataContext.tsx` (Obra, Mapp, Medicao, Configuracao, Ano)
- Modais: Sempre usar `<Modal>` de `src/components/Modal.tsx`
- Temas: Via `data-theme` em `<html>` — 7 temas (dark/light/blue/green/purple/brown/gray)
- Server Actions: `src/app/actions/usuarios.ts` (admin only, service role key)

### Rotas
| Rota             | Descrição                    | Acesso |
|------------------|------------------------------|--------|
| `/`              | Dashboard                    | Todos  |
| `/obras`         | Listagem de obras            | Todos  |
| `/mapp`          | Controle financeiro MAPP     | Todos  |
| `/usuarios`      | Gestão de usuários           | Admin  |
| `/config`        | Configs + importação         | Admin  |
| `/apresentacao`  | Modo apresentação            | Todos  |
| `/login`         | Autenticação                 | Public |

### Padrões de Código
- Sempre tipar props com interfaces
- CSS vars (`var(--bg)`, `var(--surface)`, etc.) em vez de cores hardcoded
- Modais: componente `Modal.tsx` (nunca markup inline)
- Currency: `parseCurrency()` e `handleCurrency()` de `utils.ts`
- Status: `getStatusGroup()` + `statusClass()` + `statusLabel()`

### Build
```bash
npm run build    # Valida TS + gera produção
npm run lint     # ESLint
```
