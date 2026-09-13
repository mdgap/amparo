"""
Anonimizador do MindTheGap.

Serviço próprio em cima do Presidio, rodando na infraestrutura do projeto: o
documento identificado nunca sai daqui. Recebe texto, devolve texto com
marcadores e o placar do que foi removido.

Duas camadas, de propósito:

1. Padrão — CPF, CNS, CNPJ, CEP, telefone. Quando dispara, está certo. É o piso,
   e é o que dá para prometer de forma absoluta.
2. Modelo (spaCy pt) — nome de pessoa e local em texto corrido, sem depender de
   rótulo. É o teto: acha o que a regra não previu, mas erra em silêncio.

MARCADOR, NÃO APAGAR. O requisito (e) do Tema 6 exige laudo com CRM e histórico
de tratamentos com datas. Apagar destruiria a prova que o produto precisa
avaliar; com `[NOME]` e `[CRM]` o modelo continua vendo que existe, sem ver qual.
Data NÃO é anonimizada: data de tratamento é prova.
"""
import re

from fastapi import FastAPI
from pydantic import BaseModel
from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer, RecognizerRegistry
from presidio_analyzer.nlp_engine import NlpEngineProvider

IDIOMA = "pt"

# --- Reconhecedores brasileiros: o Presidio não traz seção Brasil ---
BRASILEIROS = [
    PatternRecognizer(
        supported_entity="BR_CPF",
        supported_language=IDIOMA,
        patterns=[Pattern("cpf", r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b", 0.95)],
        context=["cpf", "inscrição"],
    ),
    PatternRecognizer(
        supported_entity="BR_CNS",
        supported_language=IDIOMA,
        # Cartão Nacional de Saúde: 15 dígitos, normalmente em grupos de 4.
        patterns=[Pattern("cns", r"\b\d{3}\s?\d{4}\s?\d{4}\s?\d{4}\b", 0.92)],
        context=["cartão", "sus", "cns"],
    ),
    PatternRecognizer(
        supported_entity="BR_CNPJ",
        supported_language=IDIOMA,
        patterns=[Pattern("cnpj", r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b", 0.95)],
    ),
    PatternRecognizer(
        supported_entity="BR_CEP",
        supported_language=IDIOMA,
        patterns=[Pattern("cep", r"\b\d{5}-?\d{3}\b", 0.5)],
        context=["cep", "endereço", "rua", "avenida"],
    ),
    PatternRecognizer(
        supported_entity="BR_CRM",
        supported_language=IDIOMA,
        # CRM identifica o médico, não o paciente — mas é dado pessoal dele.
        patterns=[Pattern("crm", r"\bCRM[\s/-]*[A-Z]{0,2}[\s:/-]*\d{4,6}\b", 0.93)],
        context=["crm", "médico"],
    ),
]

# Nome ao lado do rótulo. Texto vindo de PDF chega como uma linha só, e
# sem quebra o modelo perde o contexto que usa para reconhecer pessoa —
# foi assim que "Paciente Fulano de Tal" escapou numa nota do e-NatJus.
# O rótulo, ao contrário, é literal e não depende de contexto nenhum.
BRASILEIROS += [
    PatternRecognizer(
        name=f"NomeApos{rotulo}",
        supported_entity="PERSON",
        supported_language=IDIOMA,
        patterns=[
            Pattern(
                f"nome apos {rotulo}",
                rf"(?<=\b{rotulo}\s)[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][\wÀ-ÿ]+(?:\s+(?:d[aeo]s?|e)\s+[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ]?[\wÀ-ÿ]+|\s+[A-ZÁÂÃÀÉÊÍÓÔÕÚÇ][\wÀ-ÿ]+){{1,5}}",
                0.9,
            )
        ],
    )
    for rotulo in ("Paciente", "Requerente", "Demandante", "Autora", "Beneficiária")
]

BRASILEIROS += [
    PatternRecognizer(
        supported_entity="BR_TELEFONE",
        supported_language=IDIOMA,
        patterns=[Pattern("tel", r"\b(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b", 0.35)],
        context=["telefone", "celular", "contato", "fone"],
    ),
]

# Como cada entidade aparece no texto anonimizado.
MARCADORES = {
    "PERSON": "[NOME]",
    "LOCATION": "[LOCAL]",
    "EMAIL_ADDRESS": "[EMAIL]",
    "BR_CPF": "[CPF]",
    "BR_CNS": "[CARTAO SUS]",
    "BR_CNPJ": "[CNPJ]",
    "BR_CEP": "[CEP]",
    "BR_CRM": "[CRM]",
    "BR_TELEFONE": "[TELEFONE]",
}

# O registro precisa nascer declarando o idioma: criado vazio, ele assume inglês
# e o AnalyzerEngine recusa a combinação.
registro = RecognizerRegistry(supported_languages=[IDIOMA])
registro.load_predefined_recognizers(languages=[IDIOMA])
for r in BRASILEIROS:
    registro.add_recognizer(r)

analisador = AnalyzerEngine(
    nlp_engine=NlpEngineProvider(
        nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": IDIOMA, "model_name": "pt_core_news_lg"}],
        }
    ).create_engine(),
    registry=registro,
    supported_languages=[IDIOMA],
)

# "síndrome de Lennox-Gastaut" e "doença de Crohn" são diagnóstico, não pessoa —
# mas o modelo enxerga nome próprio, porque é o que são. O que salva é o termo
# que vem ANTES.
ANTECEDENTES_CLINICOS = re.compile(
    r"(s[ií]ndrome|doen[çc]a|mal|sinal|escala|[ií]ndice|crit[ée]rios?|teste|manobra|"
    r"classifica[çc][ãa]o|reflexo|v[ií]rus|bact[ée]ria)\s+(de\s+|do\s+|da\s+)?$",
    re.IGNORECASE,
)


def e_clinico(texto: str, achado, preservar: list[str]) -> bool:
    """Achado que é termo clínico, não dado pessoal. Só vale para o modelo:
    CPF nunca vira exceção, por mais clínico que pareça o contexto."""
    if achado.entity_type not in ("PERSON", "LOCATION"):
        return False

    trecho = texto[achado.start : achado.end].strip().lower()
    if any(trecho == t.strip().lower() or t.strip().lower() in trecho for t in preservar if t):
        return True

    antes = texto[max(0, achado.start - 40) : achado.start]
    return bool(ANTECEDENTES_CLINICOS.search(antes))


app = FastAPI(title="Anonimizador MindTheGap")


class Entrada(BaseModel):
    texto: str
    # Vocabulário clínico que NÃO pode ser anonimizado. O backend manda os
    # princípios ativos da CMED: sem isso o modelo apaga "lamotrigina" como se
    # fosse nome de gente, e destrói a prova do requisito de substituição.
    preservar: list[str] = []
    # Abaixo disto o achado é descartado. Mais baixo remove mais, e errar para o
    # lado de remover demais é o certo aqui.
    confianca_minima: float = 0.4


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/anonimizar")
def anonimizar(entrada: Entrada):
    achados = [
        a
        for a in analisador.analyze(
            text=entrada.texto, language=IDIOMA, entities=list(MARCADORES)
        )
        if a.score >= entrada.confianca_minima
    ]

    achados = [a for a in achados if not e_clinico(entrada.texto, a, entrada.preservar)]

    # Sobreposição resolvida por PONTUAÇÃO, não por posição: o padrão de CRM
    # (0,93) tem que vencer o "nome de pessoa" que o modelo enxerga na sigla do
    # estado, e o cartão do SUS tem que vencer o padrão frouxo de telefone.
    escolhidos: list = []
    for a in sorted(achados, key=lambda x: (-x.score, x.start)):
        if any(a.start < e.end and e.start < a.end for e in escolhidos):
            continue
        escolhidos.append(a)

    # De trás para frente: substituir encurta o texto e invalidaria os índices
    # seguintes se fosse do começo.
    texto = entrada.texto
    removidos: dict[str, int] = {}
    for a in sorted(escolhidos, key=lambda x: x.start, reverse=True):
        marcador = MARCADORES[a.entity_type]
        texto = texto[: a.start] + marcador + texto[a.end :]
        removidos[marcador] = removidos.get(marcador, 0) + 1

    return {"texto": texto, "removidos": removidos, "total": sum(removidos.values())}
