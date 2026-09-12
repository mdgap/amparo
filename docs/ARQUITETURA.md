# Arquitetura

## Fluxo de uma análise

```
formulário (React/HeroUI)
        │  medicamento + preço CMED + posologia + laudo anonimizado
        ▼
POST /api/analise  (Fastify)
        │
        ├─ 1. guarda de PII ─────────► recusa 422 se houver CPF
        │
        ├─ 2. MOTOR DETERMINÍSTICO ──► custo anual, SM, foro, polo passivo
        │      domain/custo.ts             + memória de cálculo auditável
        │      domain/rota.ts
        │
        ├─ 3. RAG ───────────────────► trechos do corpus oficial
        │      rag/busca.ts                pgvector, fallback pg_trgm
        │
        ├─ 4. LLM: classificação ────► Tema 6, item a item: ok/fraco/falta
        │      llm/analisarTema6.ts        com evidência literal do laudo
        │
        ├─ 5. placar ────────────────► resumirTema6() — calculado em código,
        │      domain/tema6.ts             não pelo modelo
        │
        └─ 6. LLM: redação ──────────► memorando, requerimento, resumo,
               llm/redigirDossie.ts        pendências, trecho de petição
```

Os passos 4 e 6 são os únicos que passam pelo modelo, e ambos recebem os números
do passo 2 prontos, com instrução explícita de não recalcular.

## Por que Postgres com pgvector

O corpus normativo é pequeno e estável, mas cada afirmação do dossiê precisa
apontar para um trecho específico e citável. `documento` + `trecho` dá
rastreabilidade (`ancora` = "art. 19-Q", "item 3 da tese"), e o mesmo banco
guarda a tabela CMED, que é a origem dos números do motor. A busca é híbrida por
projeto: sem chave de embeddings o `pg_trgm` cobre a demo.

## O que não é persistido

Laudo, receita e nota do e-NatJus são processados em memória e descartados. A
tabela `analise` guarda a entrada numérica, o resultado do motor, a avaliação e
o dossiê — nada que identifique o paciente.

## Degradação

| Falta | Efeito |
|---|---|
| `ANTHROPIC_API_KEY` | Só o motor de regras; dossiê não é gerado, com aviso na UI |
| `VOYAGE_API_KEY` | Busca lexical em vez de vetorial |
| Banco indisponível | `/api/rota` continua respondendo (motor puro, sem I/O) |

## Interface

Quatro etapas, uma ação primária por etapa:

1. **Documentos** — envio ou colagem do laudo, receita, pedido administrativo e
   nota do e-NatJus, com guarda de CPF antes de sair do navegador.
2. **Conferência** — o advogado confere medicamento, preço CMED e posologia.
   São os campos que definem competência, então passam por revisão humana
   antes de qualquer análise.
3. **Achados** — documento ao lado dos achados. Cada achado traz o estado, o
   trecho literal do documento, a fonte e a próxima ação, em detalhe
   expansível. Em tela estreita, alterna entre achados e documento.
4. **Dossiê** — as peças geradas, com aviso quando o caso ainda não está apto
   ao protocolo.

O design system está descrito em `CLAUDE.md` e implementado em
`frontend/src/index.css`.
