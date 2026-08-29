-- Nossa Casa — esquema e políticas de visibilidade (PostgreSQL / Supabase)
--
-- Implementa docs/seguranca.html: a tabela de autorização da secção 4, a
-- visibilidade por registo da secção 5, e a integridade de dinheiro da 6.
--
-- A frase que governa tudo o resto, da secção 1 do documento:
--   «O cliente decide o que MOSTRA. O servidor decide o que EXISTE.»
-- Por isso não há aqui nenhuma política que confie num identificador vindo do
-- corpo do pedido. Tudo se resolve a partir de auth.uid().
--
-- ⚠ NÃO APLICADO. Nada nesta app fala com um servidor: src/supabase.js é um
-- esqueleto e ninguém o importa. Este ficheiro é o que falta aplicar, e a
-- secção 6 (saúde) tem um bloqueio explícito antes de o ser.

begin;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Casa e membros
-- ─────────────────────────────────────────────────────────────────────

create type papel as enum ('crianca', 'adulto', 'admin');

create table casa (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  criada_em   timestamptz not null default now()
);

create table membro (
  id          uuid primary key default gen_random_uuid(),
  casa_id     uuid not null references casa(id) on delete cascade,
  -- Adultos têm conta (auth.users). Crianças não têm — entram por PIN, e a
  -- minimização da secção 8 diz para manter assim: sem conta, sem e-mail.
  user_id     uuid unique references auth.users(id) on delete set null,
  nome        text not null,
  papel       papel not null,
  -- §3.2: hash lento com sal, no servidor. Nunca no dispositivo, nunca SHA-256.
  pin_hash    text,
  pin_tentativas   int not null default 0,
  pin_bloqueado_ate timestamptz,
  criado_em   timestamptz not null default now(),
  unique (casa_id, nome)
);

-- O papel e a casa vêm SEMPRE daqui, resolvidos pela sessão.
-- §9: «Ler o papel (…) do armazenamento do dispositivo como fonte de verdade»
-- é a primeira coisa da lista do que nunca deve acontecer.
create or replace function membro_atual() returns membro
  language sql stable security definer set search_path = public as $$
  select * from membro where user_id = auth.uid() limit 1;
$$;

create or replace function casa_atual() returns uuid
  language sql stable as $$ select (membro_atual()).casa_id; $$;

create or replace function papel_atual() returns papel
  language sql stable as $$ select (membro_atual()).papel; $$;

create or replace function e_adulto() returns boolean
  language sql stable as $$ select papel_atual() in ('adulto', 'admin'); $$;

create or replace function e_admin() returns boolean
  language sql stable as $$ select papel_atual() = 'admin'; $$;

alter table casa   enable row level security;
alter table membro enable row level security;

create policy casa_leitura on casa for select
  using (id = casa_atual());
-- §4: alterar a casa exige administração.
create policy casa_escrita on casa for update
  using (id = casa_atual() and e_admin()) with check (id = casa_atual());

create policy membro_leitura on membro for select
  using (casa_id = casa_atual());
-- §4: «Gerir membros, papéis e PINs» — administração.
create policy membro_escrita on membro for all
  using (casa_id = casa_atual() and e_admin())
  with check (casa_id = casa_atual());

-- §4: recusar a despromoção do último administrador e a transição adulto→criança.
-- O cliente já tenta impedi-lo; aqui é que passa a ser regra.
create or replace function membro_guarda() returns trigger
  language plpgsql as $$
begin
  if old.papel = 'admin' and new.papel <> 'admin'
     and (select count(*) from membro
          where casa_id = old.casa_id and papel = 'admin' and id <> old.id) = 0 then
    raise exception 'A casa ficaria sem administração.';
  end if;
  if old.papel in ('adulto','admin') and new.papel = 'crianca' then
    raise exception 'Um adulto não passa a criança.';
  end if;
  return new;
end $$;

create trigger membro_guarda_trg before update on membro
  for each row execute function membro_guarda();

-- ─────────────────────────────────────────────────────────────────────
-- 2. Agenda — §5: evento privado
-- ─────────────────────────────────────────────────────────────────────

create table evento (
  id         uuid primary key default gen_random_uuid(),
  casa_id    uuid not null references casa(id) on delete cascade,
  dono_id    uuid not null references membro(id) on delete cascade,
  titulo     text not null,
  dia        date not null,
  hora       time,
  partilhado boolean not null default true
);

alter table evento enable row level security;

-- «A consulta filtra por partilhado, ou o dono é quem pede.» Um evento privado
-- de outro membro não é escondido na interface — não é devolvido.
create policy evento_leitura on evento for select
  using (casa_id = casa_atual()
         and (partilhado or dono_id = (membro_atual()).id));

create policy evento_escrita on evento for all
  using (casa_id = casa_atual() and e_adulto())
  with check (casa_id = casa_atual() and dono_id = (membro_atual()).id);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Tarefas — §4: qualquer membro conclui, só a si atribuída;
--    a confirmação que valida os pontos exige adulto.
-- ─────────────────────────────────────────────────────────────────────

create table tarefa (
  id        uuid primary key default gen_random_uuid(),
  casa_id   uuid not null references casa(id) on delete cascade,
  titulo    text not null,
  membro_id uuid references membro(id) on delete set null,
  pontos    int not null default 0 check (pontos between 0 and 99),
  urgencia  smallint not null default 1 check (urgencia between 0 and 2)
);

create type estado_tarefa as enum ('feita', 'confirmada');

-- Aditivo: conclusões são registos, não um campo booleano reescrito (§6).
create table tarefa_evento (
  id         uuid primary key default gen_random_uuid(),
  tarefa_id  uuid not null references tarefa(id) on delete cascade,
  por_id     uuid not null references membro(id) on delete cascade,
  estado     estado_tarefa not null,
  em         timestamptz not null default now(),
  idem_key   text not null,
  unique (tarefa_id, idem_key)
);

alter table tarefa        enable row level security;
alter table tarefa_evento enable row level security;

create policy tarefa_leitura on tarefa for select using (casa_id = casa_atual());
create policy tarefa_escrita on tarefa for all
  using (casa_id = casa_atual() and e_adulto())
  with check (casa_id = casa_atual());

create policy tarefa_evento_leitura on tarefa_evento for select
  using (exists (select 1 from tarefa t where t.id = tarefa_id and t.casa_id = casa_atual()));

create policy tarefa_evento_insercao on tarefa_evento for insert
  with check (
    exists (select 1 from tarefa t where t.id = tarefa_id and t.casa_id = casa_atual())
    and por_id = (membro_atual()).id
    and (
      -- concluir: só a tarefa que lhe está atribuída
      (estado = 'feita' and exists (
        select 1 from tarefa t where t.id = tarefa_id and t.membro_id = (membro_atual()).id))
      -- confirmar: exige adulto
      or (estado = 'confirmada' and e_adulto())
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 4. Dinheiro — §6: só movimentos, nunca saldos
-- ─────────────────────────────────────────────────────────────────────

create type tipo_movimento as enum ('semanada', 'bonus', 'retirada');

-- INVARIANTE #2 do CLAUDE.md, aqui como estrutura e não como convenção:
-- a tabela é de inserções, e o saldo é a soma. Sem UPDATE, sem DELETE —
-- não existe política que os permita, portanto o RLS recusa-os.
create table vault_move (
  id        uuid primary key default gen_random_uuid(),
  casa_id   uuid not null references casa(id) on delete cascade,
  crianca_id uuid not null references membro(id) on delete cascade,
  por_id    uuid not null references membro(id) on delete restrict,
  delta_cent bigint not null,          -- cêntimos: nunca vírgula flutuante em dinheiro
  tipo      tipo_movimento not null,
  descricao text not null,
  dia       date not null default current_date,
  -- §6: chave de idempotência. Um segundo toque devolve o mesmo resultado
  -- em vez de duplicar a semanada.
  idem_key  text not null,
  unique (casa_id, idem_key)
);

alter table vault_move enable row level security;

-- Adultos inserem; a criança lê o seu próprio cofre.
create policy vault_leitura on vault_move for select
  using (casa_id = casa_atual()
         and (e_adulto() or crianca_id = (membro_atual()).id));

-- §4: «Pagar semanada e dar bónus» — papel adulto, e o destino é um perfil de
-- criança da mesma casa.
create policy vault_insercao on vault_move for insert
  with check (
    casa_id = casa_atual() and e_adulto()
    and por_id = (membro_atual()).id
    and exists (select 1 from membro m
                where m.id = crianca_id and m.casa_id = casa_atual() and m.papel = 'crianca')
  );

create view vault_saldo as
  select crianca_id, casa_id, sum(delta_cent) as saldo_cent
  from vault_move group by crianca_id, casa_id;

-- Envelopes e despesas: mesma forma aditiva.
create table envelope (
  id       uuid primary key default gen_random_uuid(),
  casa_id  uuid not null references casa(id) on delete cascade,
  nome     text not null,
  limite_cent bigint not null check (limite_cent >= 0),
  unique (casa_id, nome)
);

create table despesa (
  id          uuid primary key default gen_random_uuid(),
  casa_id     uuid not null references casa(id) on delete cascade,
  envelope_id uuid not null references envelope(id) on delete restrict,
  pagador_id  uuid not null references membro(id) on delete restrict,
  valor_cent  bigint not null check (valor_cent > 0),
  dividir     boolean not null default true,
  em          timestamptz not null default now(),
  idem_key    text not null,
  unique (casa_id, idem_key)
);

alter table envelope enable row level security;
alter table despesa  enable row level security;

-- §5: «Orçamento, envelopes e despesas — invisíveis a perfis de criança,
-- AUSENTES DA RESPOSTA, não escondidos na interface.» Hoje isto é um filtro
-- no cliente e os dados estão no dispositivo que a criança usa.
create policy envelope_leitura on envelope for select
  using (casa_id = casa_atual() and e_adulto());
create policy despesa_leitura on despesa for select
  using (casa_id = casa_atual() and e_adulto());

-- §4: limites de envelopes — administração.
create policy envelope_escrita on envelope for all
  using (casa_id = casa_atual() and e_admin())
  with check (casa_id = casa_atual());

-- §4: «o pagador indicado tem de ser um membro adulto da casa».
create policy despesa_insercao on despesa for insert
  with check (
    casa_id = casa_atual() and e_adulto()
    and exists (select 1 from membro m
                where m.id = pagador_id and m.casa_id = casa_atual()
                  and m.papel in ('adulto','admin'))
  );

-- §4 e §6: o valor do ponto é validado no servidor (0,01–5,00 €), não só no campo.
create table config_casa (
  casa_id     uuid primary key references casa(id) on delete cascade,
  ponto_cent  int not null default 10 check (ponto_cent between 1 and 500),
  dia_semanada smallint not null default 0 check (dia_semanada between 0 and 6),
  rendimento_cent bigint not null default 0 check (rendimento_cent >= 0)
);

alter table config_casa enable row level security;
create policy config_leitura on config_casa for select
  using (casa_id = casa_atual() and e_adulto());
create policy config_escrita on config_casa for all
  using (casa_id = casa_atual() and e_admin())
  with check (casa_id = casa_atual());

-- §4: a soma dos limites não excede o rendimento registado.
create or replace function envelope_coerencia() returns trigger
  language plpgsql as $$
declare total bigint; teto bigint;
begin
  select coalesce(sum(limite_cent),0) into total from envelope
    where casa_id = new.casa_id and id <> coalesce(new.id, gen_random_uuid());
  select rendimento_cent into teto from config_casa where casa_id = new.casa_id;
  if teto > 0 and total + new.limite_cent > teto then
    raise exception 'A soma dos limites excede o rendimento registado.';
  end if;
  return new;
end $$;

create trigger envelope_coerencia_trg before insert or update on envelope
  for each row execute function envelope_coerencia();

commit;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Saúde — NÃO APLICAR AINDA
-- ─────────────────────────────────────────────────────────────────────
--
-- O CLAUDE.md põe isto sob «o que não fazer sem perguntar»: são dados de saúde
-- de menores, categoria especial no RGPD. A secção 8 de docs/seguranca.html
-- lista o que tem de estar resolvido ANTES de existir a primeira linha desta
-- tabela num servidor:
--
--   BASE LEGAL   consentimento de quem detém a responsabilidade parental,
--                registado com data e versão do texto aceite
--   SAÚDE        cifra em repouso e acesso registado
--   RETENÇÃO     prazo por tipo de dado e apagamento efetivo, incluindo as
--                cópias locais nos dispositivos
--   ALOJAMENTO   região decidida ANTES do primeiro esquema — mudar depois
--                obriga a migrar dados de menores
--
-- As políticas abaixo estão escritas e testáveis, mas ficam comentadas de
-- propósito. Descomentar sem os quatro pontos acima resolvidos é o erro que o
-- documento existe para evitar.
--
-- create table ficha_saude (
--   id         uuid primary key default gen_random_uuid(),
--   casa_id    uuid not null references casa(id) on delete cascade,
--   membro_id  uuid not null references membro(id) on delete cascade,
--   especialidade text not null,
--   medico     text,
--   dia        date not null,
--   hora       time
-- );
-- alter table ficha_saude enable row level security;
--
-- -- §5, a regra mais restritiva do sistema e a que mais tem de ser testada:
-- --   ficha de adulto  → só o próprio. Nem o companheiro, nem a administração.
-- --   ficha de criança → os adultos da casa, e a própria criança lê a sua.
-- create policy saude_leitura on ficha_saude for select
--   using (
--     casa_id = casa_atual()
--     and (
--       membro_id = (membro_atual()).id
--       or (e_adulto() and exists (select 1 from membro m
--             where m.id = membro_id and m.casa_id = casa_atual() and m.papel = 'crianca'))
--     )
--   );
--
-- -- §5: «A transição de papel tem de reavaliar a visibilidade retroativamente,
-- -- não só os registos novos.» A política acima já o faz: lê o papel atual do
-- -- membro a cada consulta, portanto uma criança que passe a adulta deixa de
-- -- ter a ficha visível aos pais sem que nada seja migrado.
