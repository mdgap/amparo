# Demonstração pública do Amparo

Estrutura aprovada na conversa em 14/09/2026. A demonstração reutiliza as telas do frontend em um build Vite `demo`. Todas as operações do caso são locais. O Compose independente inicia somente nginx, sem API, PostgreSQL, anonimizador ou chave de modelo.

## Experiência

Seis cenários fictícios cobrem documentação completa, pedido administrativo pendente, histórico terapêutico incompleto, evidência insuficiente, custo elevado e ausência de registro informado. O painel começa preenchido e permite abrir resultados ou iniciar o percurso com os documentos. Um seletor permite trocar o cenário e reiniciar a sessão. Consultas têm espera curta; a análise apresenta cinco estados em cerca de dez segundos. Há controles para falha recuperável e indisponibilidade da IA.

Os documentos e as respostas de leitura são exemplos preparados. Editar documentos não executa classificação. O cálculo reutiliza o domínio determinístico; as respostas do formulário também usam as regras existentes. Arquivos escolhidos são ignorados e substituídos por exemplos do cenário, sem leitura nem envio. Downloads e cópias identificam o conteúdo fictício. Nenhuma nota demonstrativa se apresenta como publicação de autoridade.

A barra vermelha persistente informa a simulação e oferece contato `oi@paulojalowyj.com`. Os avisos sobre modelo, anonimização e consultas devem distinguir a demonstração da execução oficial. Histórico fica em memória, isolado por aba, e desaparece ao recarregar. O build oficial conserva os serviços atuais.

## Entrega e verificação

`docker-compose.demo.yml` contém apenas `demo`, com porta local configurável e imagem independente. nginx recusa `/api`, sem proxy. A documentação explica execução local e destino no Dokploy. Verificar contratos dos seis cenários, cálculo após edição, inexistência de chamadas de rede para operações, rejeição de CPF, histórico, falha e recuperação, uploads ignorados, downloads, responsividade e builds oficial/demo. A publicação no servidor permanece uma etapa separada.
