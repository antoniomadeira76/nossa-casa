-- ============================================================================
-- Nossa Casa — chaves de idempotência nas operações de dinheiro
-- ============================================================================
-- Correr DEPOIS de 01-esquema.sql.
--
-- Porquê: docs/seguranca.html §6 exige que fechar as compras, pagar a semanada
-- e acertar contas levem uma chave gerada no cliente, «para que um segundo
-- toque, ou um reenvio após falha de rede, devolva o mesmo resultado em vez de
-- duplicar a despesa». A §9 lista «aceitar uma operação de dinheiro sem chave
-- de idempotência» entre as coisas que nunca devem acontecer.
--
-- O 01-esquema.sql não as tinha. Numa app onde a fila de escritas reenvia após
-- reconexão, isto não é teórico: é uma semanada paga duas vezes.
--
-- A coluna é anulável para não invalidar linhas já existentes, mas o índice
-- único garante que duas escritas com a mesma chave não passam ambas.
-- ============================================================================

begin;

alter table despesas          add column if not exists idem_key text;
alter table acertos           add column if not exists idem_key text;
alter table cofre_movimentos  add column if not exists idem_key text;
alter table transferencias    add column if not exists idem_key text;

-- Único por casa e não por tabela global: duas casas podem gerar a mesma chave
-- e não se devem estorvar.
create unique index if not exists despesas_idem
  on despesas (casa_id, idem_key) where idem_key is not null;
create unique index if not exists acertos_idem
  on acertos (casa_id, idem_key) where idem_key is not null;
create unique index if not exists cofre_movimentos_idem
  on cofre_movimentos (casa_id, idem_key) where idem_key is not null;
create unique index if not exists transferencias_idem
  on transferencias (casa_id, idem_key) where idem_key is not null;

comment on column despesas.idem_key is
  'Chave gerada no cliente. Um reenvio após falha de rede colide no índice em vez de duplicar a despesa.';

commit;
