import type { Repositorio } from "./app.ts";
import { query } from "./db.ts";
import type { LinhaAnalise } from "./domain/historico.ts";
import { PARAMETROS } from "./domain/parametros.ts";
import { PROMPT_VERSAO } from "./llm/prompts/sistema.ts";

const COLUNAS = "id, criado_em, entrada, rota, tema6, dossie";

/** Janela das métricas: as análises mais recentes, não a tabela inteira. */
const JANELA_METRICAS = 1000;

export const repositorioPostgres: Repositorio = {
  async gravarAnalise(registro) {
    await query(
      `INSERT INTO analise (parametros_versao, entrada, rota, tema6, dossie)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        `${PARAMETROS.versao}/${PROMPT_VERSAO}`,
        JSON.stringify(registro.entrada),
        JSON.stringify(registro.rota),
        registro.tema6 === null ? null : JSON.stringify(registro.tema6),
        registro.dossie == null ? null : JSON.stringify(registro.dossie),
      ],
    );
  },

  async listarAnalises({ limite, antesDe }) {
    return antesDe === undefined
      ? query<LinhaAnalise>(`SELECT ${COLUNAS} FROM analise ORDER BY id DESC LIMIT $1`, [limite])
      : query<LinhaAnalise>(
          `SELECT ${COLUNAS} FROM analise WHERE id < $2 ORDER BY id DESC LIMIT $1`,
          [limite, antesDe],
        );
  },

  async linhasParaMetricas() {
    return query<LinhaAnalise>(
      `SELECT ${COLUNAS} FROM analise ORDER BY id DESC LIMIT $1`,
      [JANELA_METRICAS],
    );
  },
};
