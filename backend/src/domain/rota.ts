import { brl, calcularCustoAnual, sm } from "./custo.ts";
import { PARAMETROS, pisoEmReais, tetoEmReais, type Parametros } from "./parametros.ts";
import type { FaixaCusto, Medicamento, Posologia, ResultadoRota } from "./types.ts";

/** Margem (em % do teto) que aciona conferência humana antes de protocolar. */
const MARGEM_ZONA_DE_ATENCAO = 0.1;

/**
 * Define justiça competente, polo passivo e custeio de medicamento NÃO
 * incorporado, segundo o Tema 1234/STF na leitura do Guia Rápido do CNJ
 * (nov/2025) — três faixas de custo, não duas:
 *
 *  - sem registro na ANVISA          → Justiça Federal, União (Tema 500/STF)
 *  - igual ou superior a 210 SM      → Justiça Federal, União custeia 100%
 *  - de 7 SM até abaixo de 210 SM    → Justiça Estadual, Estado custeia,
 *                                      União ressarce 65%
 *  - abaixo de 7 SM                  → Justiça Estadual, Estado custeia integral
 *
 * A tese fala em custo anual "igual ou superior" a 210 SM (Guia do CNJ no
 * corpus: "Custo anual ≥ 210 salários mínimos"), então o valor exatamente no
 * teto já vai para a Justiça Federal.
 *
 * O Município NÃO entra no polo passivo por medicamento não incorporado, salvo
 * pactuação na CIB do respectivo Estado (`municipioRespondePorNaoIncorporado`).
 *
 * Os limites e fundamentos vêm de `parametros.ts` e do corpus normativo; a
 * revisão jurídica da equipe é obrigatória antes da demo.
 */
export function definirRota(
  medicamento: Medicamento,
  posologia: Posologia,
  parametros: Parametros = PARAMETROS,
): ResultadoRota {
  const custo = calcularCustoAnual(medicamento, posologia, parametros);
  const semRegistroAnvisa = medicamento.registroAnvisa?.possui === false;
  const teto = parametros.tetoCompetenciaEmSalariosMinimos;
  const piso = parametros.pisoRessarcimentoEmSalariosMinimos;
  // Compara em centavos, não em SM: o valor em SM é arredondado para 2 casas e
  // faria R$ 340.409 (209,9994 SM) virar 210,00 e mudar de justiça.
  const centavos = (valor: number) => Math.round(valor * 100);
  const atingeOTeto = centavos(custo.custoAnual) >= centavos(tetoEmReais(parametros));
  const abaixoDoPiso = centavos(custo.custoAnual) < centavos(pisoEmReais(parametros));
  const ressarcimento = Math.round(parametros.fracaoRessarcimentoUniao * 100);
  const custoAnual = `${brl(custo.custoAnual)} (${sm(custo.emSalariosMinimos)})`;

  const fundamento: string[] = [];
  let justica: ResultadoRota["justica"];
  let faixa: FaixaCusto;
  let custeio: string;
  let poloPassivo: string[];

  if (semRegistroAnvisa) {
    justica = "federal";
    faixa = "sem_registro_anvisa";
    poloPassivo = ["União"];
    custeio = "União";
    fundamento.push(
      "Medicamento sem registro na ANVISA: competência da Justiça Federal, com a União no polo passivo (Tema 500/STF).",
      "Regra geral: a ausência de registro IMPEDE o fornecimento judicial. A exceção por mora irrazoável da ANVISA exige três requisitos cumulativos: pedido de registro no Brasil (salvo órfãos e doenças raras), registro em agência internacional renomada e inexistência de substituto terapêutico registrado no Brasil.",
    );
  } else if (atingeOTeto) {
    justica = "federal";
    faixa = "acima_do_teto";
    poloPassivo = ["União"];
    custeio = "União custeia 100%";
    fundamento.push(
      `Custo anual de ${custoAnual} atinge ou supera o teto de ${teto} SM: Justiça Federal, com a União no polo passivo, que custeia integralmente (Tema 1234/STF; Guia Rápido do CNJ, nov/2025).`,
    );
  } else if (abaixoDoPiso) {
    justica = "estadual";
    faixa = "abaixo_do_piso";
    poloPassivo = ["Estado"];
    custeio = "Estado custeia integralmente";
    fundamento.push(
      `Custo anual de ${custoAnual} fica abaixo do piso de ${piso} SM: Justiça Estadual, contra o Estado, que custeia integralmente (Guia Rápido do CNJ, nov/2025).`,
    );
  } else {
    justica = "estadual";
    faixa = "ressarcimento_federal";
    poloPassivo = ["Estado"];
    custeio = `Estado custeia; União ressarce ${ressarcimento}%`;
    fundamento.push(
      `Custo anual de ${custoAnual} fica entre o piso de ${piso} SM e o teto de ${teto} SM: Justiça Estadual, contra o Estado, com ressarcimento de ${ressarcimento}% pela União (Guia Rápido do CNJ, nov/2025).`,
    );
  }

  if (parametros.municipioRespondePorNaoIncorporado && justica === "estadual") {
    poloPassivo.push("Município");
    fundamento.push(
      "Município incluído no polo passivo por pactuação na CIB do Estado. Confira a pactuação vigente antes de protocolar.",
    );
  } else if (justica === "estadual") {
    fundamento.push(
      "O Município não responde por medicamento não incorporado, salvo pactuação na CIB do respectivo Estado (Guia Rápido do CNJ, nov/2025).",
    );
  }

  if (medicamento.incorporadoSus === true) {
    fundamento.push(
      "ATENÇÃO: medicamento informado como INCORPORADO ao SUS. Nesse caso a competência vem do Componente da assistência farmacêutica (CBAF, CESAF, CEAF 1A/1B/2/3), não da faixa de custo. Esta rota não se aplica e precisa de conferência humana.",
    );
  }

  if (custo.precoProvisorio) {
    fundamento.push(
      "Preço fora da tabela CMED: a competência acima foi fixada sobre orçamento da parte autora, valor PROVISÓRIO. O Guia Rápido do CNJ orienta oficiar a CMED para obter o preço; sem resposta a tempo, o orçamento serve de referência.",
    );
  }

  const distanciaDoTeto = Math.abs(custo.emSalariosMinimos - teto);
  const zonaDeAtencao = distanciaDoTeto <= teto * MARGEM_ZONA_DE_ATENCAO;

  if (zonaDeAtencao) {
    fundamento.push(
      "Atenção: o custo está a menos de 10% do teto. Confira preço CMED e posologia antes de protocolar: pequena variação muda o foro.",
    );
  }

  return { justica, poloPassivo, faixa, custeio, fundamento, zonaDeAtencao, custo };
}
