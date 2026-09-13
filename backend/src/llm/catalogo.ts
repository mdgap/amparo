/**
 * Catálogo dos pontos em que o sistema usa — ou NÃO usa — modelo de linguagem.
 *
 * Serve à ajuda contextual da interface, feita para auditoria. Três regras
 * governam este arquivo:
 *
 * 1. O template exibido é montado pelas MESMAS funções que montam o prompt
 *    real, chamadas com placeholders no lugar dos documentos. Não há como o
 *    texto mostrado divergir do que é enviado.
 * 2. Nada aqui dispara chamada ao modelo. É leitura de código, não execução.
 * 3. Ponto que não usa IA é declarado como tal. Upload, extração de PDF,
 *    cálculo de custo e reconhecimento de medicamento são determinísticos, e
 *    rotulá-los como IA seria mentir para quem audita.
 */
import { montarPromptTema6 } from "./analisarTema6.ts";
import { montarPromptDossie } from "./redigirDossie.ts";
import { PROMPT_VERSAO, SISTEMA } from "./prompts/sistema.ts";
import { env } from "../env.ts";

/** Como aquele ponto produz o que mostra. */
export type NaturezaDoPonto = "ia" | "deterministico" | "modelo_local";

export interface PontoDeIA {
  id: string;
  titulo: string;
  natureza: NaturezaDoPonto;
  /** Arquivo onde isso acontece, no repositório. */
  arquivo: string;
  /** O que este ponto faz, concretamente. */
  oQueFaz: string;
  /** Por que é preciso linguagem natural aqui — ou por que não é. */
  porQue: string;
  /** Campos e documentos efetivamente enviados. */
  entradas: string[];
  /** Instrução de sistema, quando há chamada ao modelo. */
  sistema?: string;
  /** Template com placeholders, montado pela função real. */
  template?: string;
  versao?: string;
  modelo?: string;
  /** Explicação de cada bloco do template, em linguagem simples. */
  blocos?: { trecho: string; explicacao: string }[];
  /** Formato de saída, campos usados na tela e o que exige conferência. */
  saida: string;
  limites: string;
}

/** Marcadores usados no lugar dos documentos do caso. */
const LAUDO = "{{TEXTO DO LAUDO, JÁ ANONIMIZADO}}";
const RECEITA = "{{TEXTO DA RECEITA, JÁ ANONIMIZADA}}";
const NOTA = "{{NOTA TÉCNICA DO e-NatJus, JÁ ANONIMIZADA}}";
const REQUERIMENTO = "{{PEDIDO ADMINISTRATIVO, JÁ ANONIMIZADO}}";
const CORPUS = "{{TRECHOS DO CORPUS NORMATIVO RECUPERADOS PARA ESTE CASO, COMO [F1], [F2]...}}";

const templateTema6 = () =>
  montarPromptTema6(
    {
      laudo: LAUDO,
      receita: RECEITA,
      notaENatJus: NOTA,
      requerimentoAdministrativo: REQUERIMENTO,
      medicamento: "{{NOME DO MEDICAMENTO}}",
    },
    CORPUS,
  );

const templateDossie = () =>
  montarPromptDossie(
    {
      rota: {
        justica: "{{JUSTIÇA}}" as never,
        poloPassivo: ["{{POLO PASSIVO}}"],
        faixa: "{{FAIXA}}" as never,
        custeio: "{{CUSTEIO}}",
        fundamento: ["{{FUNDAMENTO DA ROTA, CALCULADO PELO MOTOR}}"],
        zonaDeAtencao: false,
        custo: {
          unidadesPorAno: 0,
          apresentacoesPorAno: 0,
          custoAnual: 0,
          custoMensalMedio: 0,
          precoUnitario: 0,
          emSalariosMinimos: 0,
          salarioMinimoUsado: 0,
          tetoEmReais: 0,
          precoProvisorio: false,
          memoria: ["{{MEMÓRIA DE CÁLCULO, LINHA A LINHA}}"],
        },
      },
      resumo: {
        total: 6,
        ok: 0,
        fracos: 0,
        faltantes: 0,
        naoAvaliados: 0,
        prontidao: 0,
        aptoParaProtocolo: false,
        pendencias: ["{{PENDÊNCIAS APURADAS EM CÓDIGO}}"],
      },
      medicamento: "{{NOME DO MEDICAMENTO}}",
      alertaENatJus: "{{ALERTA DO e-NatJus, SE HOUVER}}",
      fontes: [],
    },
    CORPUS,
  );

export function catalogoDePontos(): PontoDeIA[] {
  return [
    {
      id: "tema6",
      titulo: "Classificação dos seis requisitos do Tema 6",
      natureza: "ia",
      arquivo: "backend/src/llm/analisarTema6.ts",
      oQueFaz:
        "Lê os documentos do caso e classifica cada um dos seis requisitos do Tema 6 em ok, fraco ou falta, copiando o trecho literal que sustenta cada classificação e apontando a pendência quando não estiver ok.",
      porQue:
        "Decidir se um laudo descreve o histórico terapêutico com datas, ou se a nota do e-NatJus aponta alternativa que o laudo não enfrenta, exige ler texto corrido escrito por outra pessoa. Não há regra que faça isso. O placar, esse sim, é somado em código: o modelo não decide se o caso está apto.",
      entradas: [
        "Laudo médico (anonimizado)",
        "Receita (anonimizada)",
        "Nota técnica do e-NatJus (anonimizada), quando houver",
        "Pedido administrativo (anonimizado)",
        "Nome do medicamento conferido na etapa 2",
        "Trechos do corpus normativo recuperados para este caso",
      ],
      sistema: SISTEMA,
      template: templateTema6(),
      versao: PROMPT_VERSAO,
      modelo: env.OPENROUTER_MODEL,
      blocos: [
        {
          trecho: "CONTEXTO NORMATIVO (cite como [F1], [F2]...)",
          explicacao:
            "Os trechos do corpus recuperados para este caso. É deles que devem sair as citações; sem trecho que sustente, a instrução manda escrever 'sem fonte no corpus'.",
        },
        {
          trecho: "REQUISITOS A AVALIAR + REGRA DE CLASSIFICAÇÃO",
          explicacao:
            "Cada requisito vai com a régua de ok/fraco/falta transcrita do Guia do CNJ. A régua é do domínio, versionada em backend/src/domain/tema6.ts — não fica a critério do modelo.",
        },
        {
          trecho: "DOCUMENTOS DO CASO",
          explicacao:
            "Os documentos entram entre marcadores, já anonimizados. Nome, CPF, cartão do SUS e contato foram substituídos por marcador antes desta chamada.",
        },
        {
          trecho: "TAREFA, itens 1 a 4",
          explicacao:
            "Exige trecho literal para marcar ok, manda escolher o status menos favorável na dúvida, e pede o alerta quando a nota do e-NatJus apontar alternativa que o laudo não enfrenta.",
        },
      ],
      saida:
        "JSON com um objeto por requisito — id, status, justificativa, evidências e pendência — mais o alerta do e-NatJus. A tela usa o status no selo, a justificativa no resumo, as evidências no trecho expandido e a pendência na próxima ação.",
      limites:
        "O modelo classifica; quem decide protocolar é o advogado. Requisito não devolvido pelo modelo entra como 'não analisado' e bloqueia o apto para protocolo. Sem chave de API, a etapa não roda e os seis ficam como não analisados.",
    },
    {
      id: "dossie",
      titulo: "Redação das peças do dossiê",
      natureza: "ia",
      arquivo: "backend/src/llm/redigirDossie.ts",
      oQueFaz:
        "Redige, em uma única chamada, o memorando de rota, o requerimento administrativo, o resumo de evidência, a lista de pendências e o trecho de petição.",
      porQue:
        "Escrever minuta é gerar linguagem. Os números, porém, chegam prontos do motor de regras, com instrução explícita de repetir sem recalcular — é o que impede o modelo de produzir um valor de causa próprio.",
      entradas: [
        "Rota calculada pelo motor: justiça, polo passivo, custeio e fundamento",
        "Memória de cálculo, linha a linha",
        "Placar dos seis requisitos, somado em código",
        "Pendências apuradas em código",
        "Trechos do corpus normativo",
      ],
      sistema: SISTEMA,
      template: templateDossie(),
      versao: PROMPT_VERSAO,
      modelo: env.OPENROUTER_MODEL,
      blocos: [
        {
          trecho: "NÚMEROS JÁ CALCULADOS PELO MOTOR — repita exatamente, não recalcule",
          explicacao:
            "É a instrução que sustenta a regra número um do projeto. Custo, salários mínimos, foro, polo passivo e custeio entram prontos; ao modelo cabe repetir.",
        },
        {
          trecho: "SITUAÇÃO DO TEMA 6 e Pendências apuradas",
          explicacao:
            "O placar e as pendências vêm de resumirTema6, em código. O modelo recebe o resultado, não a conta.",
        },
        {
          trecho: "TAREFA — produza cinco peças",
          explicacao:
            "Define o que cada peça deve conter. O requerimento pede lacunas como [NOME] e [CPF] em vez de dado de paciente.",
        },
        {
          trecho: "IMPORTANTE: nem todos os requisitos estão cumpridos",
          explicacao:
            "Bloco condicional: só entra quando o caso não está apto, e manda abrir o memorando dizendo isso. É o que impede a minuta de soar como aprovação.",
        },
      ],
      saida:
        "JSON com as cinco peças. A tela mostra quatro delas no alternador e a lista de pendências abaixo. O texto passa por uma limpeza que remove Markdown, porque as peças são copiadas para dentro de petições.",
      limites:
        "São minutas revisáveis, não peça pronta. Toda afirmação jurídica deve citar [F1], [F2] do corpus; sem trecho que sustente, a instrução manda escrever 'sem fonte no corpus'. Conferência do advogado é obrigatória.",
    },
    {
      id: "rota",
      titulo: "Custo anual, foro e polo passivo",
      natureza: "deterministico",
      arquivo: "backend/src/domain/custo.ts e backend/src/domain/rota.ts",
      oQueFaz:
        "Calcula o custo anual a partir do preço da apresentação e da posologia, converte em salários mínimos e define justiça competente, polo passivo e custeio pelas três faixas do Tema 1234.",
      porQue:
        "Não há modelo envolvido, por decisão de projeto. É conta e regra, com memória de cálculo linha a linha e cobertura por testes automatizados. Um número que define competência não pode depender de geração de texto.",
      entradas: [
        "Preço da apresentação (PMVG da CMED, ou orçamento da parte)",
        "Unidades por apresentação e posologia conferidas na etapa 2",
        "Registro na ANVISA e parâmetros versionados: salário mínimo, teto de 210 SM, piso de 7 SM",
      ],
      saida:
        "Justiça, polo passivo, faixa, custeio, fundamento e a memória de cálculo exibida na etapa de achados.",
      limites:
        "Os parâmetros mudam por ato normativo e ficam versionados em domain/parametros.ts. Medicamento incorporado ao SUS segue o Componente da assistência farmacêutica, e o motor apenas avisa: essa rota ainda pede conferência humana.",
    },
    {
      id: "reconhecimento",
      titulo: "Reconhecimento do medicamento e da posologia nos documentos",
      natureza: "deterministico",
      arquivo: "backend/src/domain/cmed.ts",
      oQueFaz:
        "Encontra o princípio ativo cruzando o texto com o vocabulário fechado da CMED, e lê a posologia por padrão de escrita — '1 comprimido', 'de 12 em 12 horas', 'uso contínuo'.",
      porQue:
        "Não usa modelo. O vocabulário da CMED é finito e oficial, então o que não está nele não é medicamento — e nome de paciente nunca casa com princípio ativo. A garantia é estrutural, não probabilística.",
      entradas: ["Texto do laudo e da receita", "Vocabulário de princípios ativos da tabela CMED"],
      saida:
        "Lista de princípios ativos citados, separando o provável pedido do que já foi tentado, e os três campos de posologia sugeridos na etapa 2.",
      limites:
        "A ordem é palpite pela redação do laudo, não conclusão. Dose em mg/kg não vira unidade por tomada. Tudo entra como sugestão para conferência na etapa 2.",
    },
    {
      id: "formulario",
      titulo: "Situação na CONITEC e incapacidade financeira",
      natureza: "deterministico",
      arquivo: "backend/src/domain/formulario.ts",
      oQueFaz:
        "Apura dois dos seis requisitos a partir do que foi informado na conferência: a situação do medicamento na CONITEC e a prova de hipossuficiência.",
      porQue:
        "Não usa modelo, e antes usava. Situação na CONITEC vem de consulta ao portal, e hipossuficiência vem de declaração e comprovante — nenhum dos dois está no laudo ou na receita. Pedir ao modelo que os encontrasse nos documentos produzia 'falta' em todo caso, não por falha dele, mas porque o dado nunca era perguntado.",
      entradas: [
        "Situação na CONITEC: nunca avaliado, em análise desde uma data, ou recomendação desfavorável",
        "Se houve demonstração da ilegalidade do ato, quando a recomendação for desfavorável",
        "Declaração de hipossuficiência e comprovante de renda",
      ],
      saida:
        "Os requisitos (b) e (f) com status, justificativa e pendência, que entram no placar junto com os quatro avaliados pelo modelo.",
      limites:
        "A mora é contada por data: 180 dias prorrogáveis por 90, do art. 19-R da Lei 8.080/1990. Em análise sem data informada não vira mora por suposição — fica como revisão necessária. Recomendação desfavorável só é ok com demonstração da ilegalidade do ato, que é juízo do advogado.",
    },
    {
      id: "anonimizacao",
      titulo: "Anonimização dos documentos",
      natureza: "modelo_local",
      arquivo: "anonimizador/app.py e backend/src/documentos/anonimizar.ts",
      oQueFaz:
        "Substitui nome, CPF, cartão do SUS, CNPJ, CEP, telefone e CRM por marcador, antes de qualquer envio ao modelo de linguagem.",
      porQue:
        "Usa um modelo de reconhecimento de entidades em português, não um modelo generativo, e roda em contêiner próprio: o documento identificado não sai da infraestrutura. Padrões de formato fixo, como CPF, são pegos por regra, que é mais confiável que modelo para isso.",
      entradas: ["Texto dos quatro documentos do caso", "Vocabulário clínico da CMED, protegido contra remoção"],
      saida: "Texto com marcadores e o placar do que foi substituído, exibido na etapa de achados.",
      limites:
        "Nenhuma anonimização automática é completa. O produto erra para o lado de remover demais, e o texto anonimizado fica visível no painel de transparência para conferência. Se o serviço estiver fora, nada é processado — falha fechada.",
    },
  ];
}
