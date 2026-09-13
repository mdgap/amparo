import type { FastifyError, FastifyInstance } from "fastify";

/**
 * Erro nunca devolve nem registra a mensagem original: ela pode carregar texto
 * do documento — o corpo de erro do OpenRouter que ecoa o prompt, a resposta do
 * modelo citada em `llm/cliente.ts`, um erro de banco com os valores da linha.
 * Resposta e log levam só status, código e tipo do erro.
 *
 * A resposta sai sempre no campo `erro`, em português, que é o que a interface
 * sabe ler — sem isso um 500 chegava na tela como "Falha na requisição".
 */
export function protegerErros(app: FastifyInstance) {
  app.setErrorHandler((erro: FastifyError, req, reply) => {
    const status = erro.statusCode && erro.statusCode >= 400 && erro.statusCode < 600 ? erro.statusCode : 500;
    const registro = { tipo: erro.name, codigo: erro.code, status, rota: req.routeOptions.url };

    if (status >= 500) req.log.error(registro, "falha ao processar a requisição");
    else req.log.info(registro, "requisição rejeitada");

    return reply.code(status).send({ erro: mensagemPublica(status) });
  });
}

function mensagemPublica(status: number): string {
  if (status === 400) return "Requisição inválida: confira o formato dos dados enviados.";
  if (status === 413) return "Conteúdo grande demais.";
  if (status === 415) return "Formato de conteúdo não suportado.";
  if (status < 500) return "A requisição não pôde ser atendida.";
  return "Falha interna ao processar a requisição. Tente novamente.";
}
