-- ============================================================================
-- Storage — os ficheiros
-- ============================================================================
-- Faturas, fotografias de equipamento, exames e recibos. Nunca na base de dados:
-- a tabela anexos guarda só o caminho.
--
-- Caminho: {casa_id}/{tipo}/{uuid}.{ext}
-- O casa_id como primeiro segmento é o que faz a política funcionar.

insert into storage.buckets (id, name, public) values ('anexos', 'anexos', false)
  on conflict do nothing;

-- Ler: quem pertence à casa cujo id é o primeiro segmento do caminho.
create policy anexos_ler on storage.objects for select
  using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = minha_casa_id()::text
    and sou_adulto()
  );

create policy anexos_escrever on storage.objects for insert
  with check (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = minha_casa_id()::text
    and sou_adulto()
  );

-- Apagar um anexo é apagar a linha; o ficheiro segue por limpeza agendada.
-- Não dar delete direto no Storage — um ficheiro órfão é melhor que uma
-- referência quebrada.
