/**
 * Leitura da lista de preços da CMED. Só o que é regra de negócio mora aqui —
 * o script de carga cuida de arquivo e banco.
 */

/**
 * Preço no formato pt-BR da planilha ("1.608,56") vira número.
 * Devolve null em vez de NaN: preço ausente é ausência, não zero.
 */
export function precoCmed(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string") return null;
  const limpo = valor.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/**
 * Unidades por apresentação a partir do texto da CMED.
 *
 * Deliberadamente CONSERVADOR: só devolve número quando a apresentação termina
 * em "X <n>" sem unidade de medida depois. "X 30" são 30 comprimidos; "X 4ML",
 * "X 40 G" e "X 120 ACION" são volume, massa e acionamentos — não unidades.
 *
 * Na dúvida devolve null, e quem preenche é o advogado. Este número multiplica
 * o preço e define competência: chutar aqui produziria foro errado com cara de
 * dado oficial.
 */
export function unidadesDaApresentacao(apresentacao: string): number | null {
  const texto = apresentacao.toUpperCase().replace(/\s+/g, " ").trim();
  const m = /\bX\s*(\d{1,5})\s*$/.exec(texto);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Versão da tabela a partir do preâmbulo ("Publicada em 09/09/2026 19h30min.").
 * Vai para `tabela_versao` e é citada na memória de cálculo do dossiê.
 */
export function versaoDaTabela(preambulo: string): string | null {
  const m = /publicada\s+em\s+(\d{2})\/(\d{2})\/(\d{4})/i.exec(preambulo);
  return m ? `${m[3]}-${m[2]}` : null;
}

/**
 * Reconhecimento do medicamento no texto do laudo, por vocabulário fechado.
 *
 * Não é extração por IA: é casamento contra a lista de princípios ativos da
 * CMED, que é finita e oficial. Nenhum texto sai da máquina, e o que não está
 * na CMED não é medicamento — nome de paciente nunca casa com princípio ativo.
 *
 * Mesma lógica do invariante nº 1: se existe fonte determinística, o modelo
 * não entra.
 */

/** Tira acento, caixa e pontuação — laudo escreve minúsculo, CMED maiúsculo. */
export function normalizarTermo(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/**
 * Variações sob as quais um princípio ativo pode aparecer no laudo.
 * A CMED registra a forma de sal ("MALEATO DE LEVOMEPROMAZINA"); a receita
 * costuma trazer só o núcleo ("levomepromazina").
 */
const SAIS = new Set([
  "CLORIDRATO", "SULFATO", "MALEATO", "ACETATO", "FOSFATO", "FUMARATO",
  "TARTARATO", "CITRATO", "NITRATO", "BROMIDRATO", "SUCCINATO", "MESILATO",
  "BESILATO", "OXALATO", "LACTATO", "GLUCONATO", "CARBONATO", "CLORETO",
  "DIPROPIONATO", "VALERATO", "PROPIONATO", "PAMOATO", "HEMIFUMARATO",
  "DICLORIDRATO", "BITARTARATO", "ESTEARATO", "SODICO", "CALCICO",
]);

export function variacoesDoPrincipio(principio: string): string[] {
  const variacoes = new Set<string>();
  for (const parte of principio.split(";")) {
    const termo = normalizarTermo(parte);
    if (termo.length >= 5) variacoes.add(termo);

    // A CMED registra a forma completa; a receita escreve o nome usual, que
    // tanto pode estar DEPOIS do "DE" ("CLORIDRATO DE METFORMINA" ->
    // "metformina") quanto ANTES ("VALPROATO DE SÓDIO" -> "valproato").
    const corte = termo.indexOf(" DE ");
    if (corte > 0) {
      const antes = termo.slice(0, corte);
      const depois = termo.slice(corte + 4);
      // Só o que não é nome de sal: "CLORIDRATO" sozinho não identifica nada.
      if (antes.length >= 5 && !SAIS.has(antes)) variacoes.add(antes);
      if (depois.length >= 5 && !SAIS.has(depois)) variacoes.add(depois);
    }
  }
  return [...variacoes];
}

/** Papel do medicamento no documento — ordena a lista, não decide nada. */
export type PapelNoLaudo = "pedido" | "ja_tentado" | "indefinido";

/**
 * Pistas de redação de laudo. O pleiteado aparece perto de verbo de indicação;
 * o que já falhou aparece perto de relato de uso anterior. É heurística de
 * ORDENAÇÃO: erra sem consequência, porque quem escolhe é o advogado.
 */
const PISTAS_PEDIDO =
  /\b(indic|prescrev|proponh|propoe|propoe-se|solicit|pleite|receit|necessit)/;
const PISTAS_JA_TENTADO =
  /\b(ja\s+for|ja\s+utilizad|ja\s+empregad|foram\s+empregad|foram\s+utilizad|sem\s+controle|sem\s+resposta|nao\s+respond|refratari|falha\s+terapeutic|em\s+uso\s+de|vem\s+usand|tentad)/;

/** Olha a vizinhança de cada ocorrência para decidir o papel. */
function papelDaOcorrencia(alvo: string, variacao: string): PapelNoLaudo {
  let papel: PapelNoLaudo = "indefinido";
  let de = 0;
  for (;;) {
    const i = alvo.indexOf(` ${variacao} `, de);
    if (i < 0) break;
    de = i + 1;
    const antes = alvo.slice(Math.max(0, i - 160), i).toLowerCase();
    // Pedido ganha de qualquer menção anterior: basta uma indicação explícita.
    if (PISTAS_PEDIDO.test(antes)) return "pedido";
    if (PISTAS_JA_TENTADO.test(antes)) papel = "ja_tentado";
  }
  return papel;
}

export interface MedicamentoReconhecido {
  /** Princípio ativo como está na CMED. */
  principioAtivo: string;
  /** O trecho do texto que casou — para o advogado conferir. */
  termoEncontrado: string;
  /** Provável papel no documento. Palpite de ordenação, não conclusão. */
  papel: PapelNoLaudo;
}

/**
 * Procura, no texto, os princípios ativos do vocabulário. Casa por palavra
 * inteira: "ferro" não pode casar dentro de "conferro".
 */
export function reconhecerMedicamentos(
  texto: string,
  vocabulario: string[],
): MedicamentoReconhecido[] {
  const alvo = ` ${normalizarTermo(texto)} `;
  const achados: MedicamentoReconhecido[] = [];

  for (const principio of vocabulario) {
    for (const variacao of variacoesDoPrincipio(principio)) {
      if (alvo.includes(` ${variacao} `)) {
        achados.push({
          principioAtivo: principio,
          termoEncontrado: variacao,
          papel: papelDaOcorrencia(alvo, variacao),
        });
        break;
      }
    }
  }

  // O pleiteado primeiro: num laudo, o que já falhou costuma ser citado em
  // maior número que o pedido, e sem isso o medicamento do caso afunda na
  // lista. Depois, monodroga antes de associação, e termo mais longo antes.
  const ordemDoPapel: Record<PapelNoLaudo, number> = {
    pedido: 0,
    indefinido: 1,
    ja_tentado: 2,
  };
  const componentes = (p: string) => p.split(";").length;
  return achados.sort(
    (a, b) =>
      ordemDoPapel[a.papel] - ordemDoPapel[b.papel] ||
      componentes(a.principioAtivo) - componentes(b.principioAtivo) ||
      b.termoEncontrado.length - a.termoEncontrado.length,
  );
}

/**
 * Posologia lida da receita ou do laudo, por padrão de redação — sem modelo.
 *
 * Conservador como o resto: só devolve o campo que reconheceu. Dose em mg/kg
 * ("5 mg/kg/dia") não vira unidade por tomada, porque depende da concentração
 * do produto, que o próprio laudo manda calcular à parte.
 */
export interface PosologiaLida {
  unidadesPorTomada?: number;
  tomadasPorDia?: number;
  diasPorAno?: number;
  /** Trechos que sustentam cada campo — vão para a tela, não para o dossiê. */
  evidencias: string[];
}

const NUMERO_POR_EXTENSO: Record<string, number> = {
  UM: 1, UMA: 1, DOIS: 2, DUAS: 2, TRES: 3, QUATRO: 4, CINCO: 5, SEIS: 6,
  MEIO: 0.5, MEIA: 0.5,
};

function numero(bruto: string): number | null {
  const t = bruto.trim().toUpperCase().replace(",", ".");
  if (NUMERO_POR_EXTENSO[t] !== undefined) return NUMERO_POR_EXTENSO[t]!;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function extrairPosologia(texto: string): PosologiaLida {
  const t = normalizarTermo(texto).replace(/\s+/g, " ");
  const lido: PosologiaLida = { evidencias: [] };

  // "1 COMPRIMIDO", "2 CAPSULAS", "MEIO COMPRIMIDO", "10 GOTAS"
  const forma =
    /\b([0-9]+(?:[.,][0-9]+)?|UM|UMA|DOIS|DUAS|TRES|QUATRO|CINCO|SEIS|MEIO|MEIA)\s+(COMPRIMIDOS?|CAPSULAS?|DRAGEAS?|GOTAS?|SACHES?|AMPOLAS?|FRASCOS?|ML)\b/;
  const mForma = forma.exec(t);
  if (mForma) {
    const n = numero(mForma[1]!);
    if (n !== null) {
      lido.unidadesPorTomada = n;
      lido.evidencias.push(`${mForma[1]} ${mForma[2]!.toLowerCase()}`);
    }
  }

  // "DE 12 EM 12 HORAS", "A CADA 8 HORAS", e a forma abreviada "12/12H", que
  // a normalização transforma em "12 12H".
  const intervalo =
    /\b(?:DE\s+([0-9]{1,2})\s+EM\s+\1|A\s+CADA\s+([0-9]{1,2})|([0-9]{1,2})\s+\3)\s*H(?:ORAS?)?\b/.exec(t);
  // "2 VEZES AO DIA", "DUAS VEZES AO DIA", "2X AO DIA" e "2X/DIA" — a receita
  // costuma abreviar sem preposição, e exigir "ao|por" deixava o campo vazio.
  const vezes =
    /\b([0-9]+|UMA?|DUAS|TRES|QUATRO)\s*(?:X|VEZES?)\s*(?:(?:AO|POR)\s+)?DIA\b/.exec(t);
  const umaVezAoDia = /\b(?:AO|POR)\s+DIA\b|\bDIARIAMENTE\b|\b1X\s*DIA\b/.test(t);

  if (intervalo) {
    const horas = Number(intervalo[1] ?? intervalo[2] ?? intervalo[3]);
    if (horas > 0 && 24 % horas === 0) {
      lido.tomadasPorDia = 24 / horas;
      lido.evidencias.push(`a cada ${horas} horas`);
    }
  } else if (vezes) {
    const n = numero(vezes[1]!);
    if (n !== null) {
      lido.tomadasPorDia = n;
      lido.evidencias.push(`${vezes[1]!.toLowerCase()} vezes ao dia`);
    }
  } else if (umaVezAoDia) {
    lido.tomadasPorDia = 1;
    lido.evidencias.push("ao dia");
  }

  // "USO CONTINUO" / "CONTINUAMENTE" -> ano inteiro; "POR 30 DIAS"; "POR 6 MESES"
  if (/\bUSO\s+CONTINUO\b|\bCONTINUAMENTE\b|\bDE\s+USO\s+CONTINUO\b/.test(t)) {
    lido.diasPorAno = 365;
    lido.evidencias.push("uso contínuo");
  } else {
    const dias = /\b(?:POR|DURANTE)\s+([0-9]{1,3})\s+DIAS?\b/.exec(t);
    const meses = /\b(?:POR|DURANTE)\s+([0-9]{1,2})\s+(?:MES|MESES)\b/.exec(t);
    if (dias) {
      lido.diasPorAno = Math.min(365, Number(dias[1]));
      lido.evidencias.push(`por ${dias[1]} dias`);
    } else if (meses) {
      lido.diasPorAno = Math.min(365, Number(meses[1]) * 30);
      lido.evidencias.push(`por ${meses[1]} meses`);
    }
  }

  return lido;
}
