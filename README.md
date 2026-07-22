# Smash Station Manager — Protótipo

Protótipo funcional da plataforma de gestão descrita no documento de planejamento.
Roda hoje em **modo protótipo**: as telas usam dados de exemplo (`src/lib/mock-data.ts`)
para você navegar e validar a UX antes de conectar um banco de dados real.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## O que já está implementado (modo protótipo)

- Dashboard consolidado (Club + Dom): venda, lucro, CMV, alertas
- Lojas (listagem)
- Estoque: central + por loja, com esperado x contado e % de diferença destacada
- Fichas técnicas: custo, margem e CMV calculados por produto
- DRE por loja e consolidada, mesma estrutura da seção 19 do planejamento
- Central de alertas com níveis (informativo/atenção/importante/crítico)
- Funções puras de cálculo financeiro em `src/lib/calculations.ts` (CMV, margem,
  ponto de equilíbrio, meta de lucro, diferença de estoque) — já prontas para
  virar a base do simulador de cenários (v2) e para testes automatizados

## Conectando um banco de dados real

O schema Drizzle completo do MVP já existe em `src/server/db/schema.ts`
(lojas, produtos, estoque, transferências, contagens, fichas técnicas,
vendas, despesas, DRE).

1. Crie um projeto gratuito em https://supabase.com
2. Copie `.env.example` para `.env` e preencha `DATABASE_URL` (Connection
   string, modo "Transaction pooler") e as chaves do Supabase
3. Gere e aplique as migrations:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```
4. As páginas hoje leem de `src/lib/mock-data.ts` — trocar para o banco real
   é criar as funções de consulta em `src/server/actions/` usando `db` de
   `src/server/db/index.ts` (que já detecta `DATABASE_URL` automaticamente)
   e apontar cada página para elas no lugar do mock.

## Próximos passos sugeridos

- Autenticação real (Supabase Auth + 2FA)
- CRUD de produtos/fichas técnicas (hoje são só leitura)
- Assistente de importação de vendas por Excel
- Deploy: ver seção 29 do documento de planejamento (VPS + Coolify)
- Página de Compras: quando entrarmos no upload de notas fiscais, ter uma tela
  dedicada para ver as compras registradas (não só o cadastro de insumos)
- Fichas técnicas: adicionar filtro de produtos (a lista cresce bastante) e uma
  seção de edição (hoje é só leitura)
- DRE mais detalhado (hoje é só a estrutura básica)
- Análises extras sobre vendas — ex: por dia da semana, sazonalidade

Veja o documento completo de planejamento para o roadmap e as decisões de
arquitetura por trás de cada escolha.
