-- Análise feita só pelo motor (sem chave de IA) também entra no histórico.
-- Sem avaliação do Tema 6, a coluna precisa aceitar NULL.
ALTER TABLE analise ALTER COLUMN tema6 DROP NOT NULL;
