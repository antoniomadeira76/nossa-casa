-- ============================================================================
-- Nossa Casa — esquema PostgreSQL / Supabase
-- ============================================================================
-- Três princípios governam este esquema. Quebrar qualquer um deles reintroduz
-- uma classe inteira de erros:
--
--   1. TODA a tabela tem casa_id. Sem exceção. É a raiz de todas as políticas.
--   2. Saldos são SOMAS de movimentos, nunca colunas escritas. Ver as VIEWs.
--   3. A visibilidade é imposta AQUI, não no cliente. Ver as POLICYs.
--
-- Ordem de execução: extensões → tipos → tabelas → índices → vistas →
-- funções → RLS. Não reordenar: há dependências.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Tipos ───────────────────────────────────────────────────────────────────

create type papel_membro   as enum ('admin', 'adulto', 'crianca');
create type aspeto_ui      as enum ('claro', 'escuro', 'sistema');
create type origem_evento  as enum ('manual', 'google_calendar');
create type recorrencia    as enum ('diaria', 'dias_semana', 'uma_vez');
create type estado_artigo  as enum ('por_comprar', 'confirmado', 'sem_stock');
create type tipo_cofre     as enum ('semanada', 'bonus', 'retirada');
create type tipo_anexo     as enum ('exame', 'receita', 'fatura', 'foto', 'recibo');


-- ═══ A CASA E QUEM A HABITA ══════════════════════════════════════════════════

create table casas (
  id                 uuid primary key default gen_random_uuid(),
  nome               text        not null,
  moeda              char(3)     not null default 'EUR',
  rendimento_mensal  numeric(10,2) not null default 0 check (rendimento_mensal >= 0),
  valor_ponto        numeric(5,2)  not null default 0.10 check (valor_ponto > 0 and valor_ponto <= 5),
  dia_pagamento      smallint    not null default 0 check (dia_pagamento between 0 and 6),
  divide_meias       boolean     not null default true,
  criada_em          timestamptz not null default now()
);

comment on column casas.dia_pagamento is '0 = segunda … 6 = domingo. Qualquer dia, não uma lista fixa.';
comment on column casas.valor_ponto is 'Valor livre entre 0,01 e 5,00 — não uma escolha entre opções.';

create table membros (
  id              uuid primary key default gen_random_uuid(),
  casa_id         uuid not null references casas(id) on delete cascade,
  conta_id        uuid unique references auth.users(id) on delete set null,
  nome            text not null,
  papel           papel_membro not null,
  cor             text not null,
  pin_hash        text,
  pin_tentativas  smallint not null default 0 check (pin_tentativas >= 0),
  criado_em       timestamptz not null default now(),

  -- Crianças não têm conta; adultos e admins têm.
  constraint conta_conforme_papel check (
    (papel = 'crianca' and conta_id is null) or (papel <> 'crianca')
  ),
  -- Uma criança sem PIN definido não pode entrar. Nunca há PIN de fábrica.
  constraint pin_so_em_criancas check (papel = 'crianca' or pin_hash is null)
);

comment on column membros.pin_hash is
  'Resumo criptográfico do PIN, nunca o PIN. Verificado em verificar_pin(), nunca no cliente.';
comment on column membros.cor is
  'Da paleta de estado (#722ED1, #08979C, #1890FF, #011B58). NUNCA a cor de ação.';

create table preferencias (
  membro_id         uuid primary key references membros(id) on delete cascade,
  esquema_cor       smallint not null default 0 check (esquema_cor between 0 and 5),
  aspeto            aspeto_ui not null default 'claro',
  resumo_ativo      boolean not null default true,
  resumo_hora       time not null default '20:00',
  aviso_prazo_dias  smallint not null default 1 check (aviso_prazo_dias between 0 and 7)
);

comment on table preferencias is
  'Por membro. A Rita pode ter violeta e o Tomás cião ao mesmo tempo.';


-- ═══ AGENDA E TAREFAS ════════════════════════════════════════════════════════

create table eventos (
  id              uuid primary key default gen_random_uuid(),
  casa_id         uuid not null references casas(id) on delete cascade,
  dia             date not null,
  hora            time not null,
  titulo          text not null,
  responsavel_id  uuid not null references membros(id) on delete cascade,
  autor_id        uuid not null references membros(id) on delete cascade,
  partilhado      boolean not null default true,
  origem          origem_evento not null default 'manual',
  origem_ref      text,
  criado_em       timestamptz not null default now(),

  -- Não importar o mesmo evento do Calendar duas vezes.
  unique nulls not distinct (casa_id, origem, origem_ref)
);

comment on column eventos.partilhado is
  'Falso = só o autor o vê. Imposto na POLICY de select, nunca na interface.';
comment on column eventos.dia is
  'Data real com ano. Nunca um número de dia — isso já causou eventos no mês errado.';

create table tarefas (
  id                uuid primary key default gen_random_uuid(),
  casa_id           uuid not null references casas(id) on delete cascade,
  titulo            text not null,
  atribuido_a       uuid not null references membros(id) on delete cascade,
  recorrencia       recorrencia not null default 'uma_vez',
  pontos            smallint not null default 0 check (pontos between 0 and 20),
  urgencia          smallint not null default 1 check (urgencia between 0 and 2),
  ordem             integer not null default 0,
  prazo             timestamptz,
  alterna_criancas  boolean not null default false,
  partilhada        boolean not null default true,
  criada_em         timestamptz not null default now(),
  removida_em       timestamptz
);

comment on column tarefas.urgencia is
  '0 urgente · 1 normal · 2 sem pressa. MANDA na ordem da lista: urgentes primeiro.';
comment on column tarefas.ordem is
  'Dentro do grupo de urgência. Renumerar 1..n ao mover — não deixar buracos.';
comment on column tarefas.removida_em is
  'Apagar é marcar. O histórico de quem fez o quê tem de sobreviver à remoção.';

create table tarefas_feitas (
  id               uuid primary key default gen_random_uuid(),
  casa_id          uuid not null references casas(id) on delete cascade,
  tarefa_id        uuid not null references tarefas(id) on delete cascade,
  data             date not null,
  marcada_por      uuid not null references membros(id) on delete cascade,
  marcada_em       timestamptz not null default now(),
  confirmada_por   uuid references membros(id) on delete set null,
  confirmada_em    timestamptz,

  -- Uma tarefa diária tem UMA linha por dia. É isto que faz a recorrência
  -- funcionar e o que impede pontos a dobrar.
  unique (tarefa_id, data),
  constraint confirmacao_coerente check (
    (confirmada_por is null) = (confirmada_em is null)
  )
);

comment on table tarefas_feitas is
  'ADITIVA. Uma linha por (tarefa, dia). Os pontos só contam quando confirmada_em não é nulo.';


-- ═══ COMPRAS ═════════════════════════════════════════════════════════════════

create table lojas (
  id                uuid primary key default gen_random_uuid(),
  casa_id           uuid not null references casas(id) on delete cascade,
  nome              text not null,
  ordem_corredores  smallint[] not null default '{0,1,2,3}'
);

comment on column lojas.ordem_corredores is
  'A sequência real das secções nesta loja. É o que faz o modo de compras poupar passos.';

create table listas_compras (
  id             uuid primary key default gen_random_uuid(),
  casa_id        uuid not null references casas(id) on delete cascade,
  loja_id        uuid references lojas(id) on delete set null,
  comprador_id   uuid references membros(id) on delete set null,
  planeada_para  timestamptz,
  criada_em      timestamptz not null default now(),
  fechada_em     timestamptz,
  despesa_id     uuid   -- FK acrescentada abaixo: despesas ainda não existe
);

-- Uma só lista ativa por casa.
create unique index lista_ativa_unica
  on listas_compras (casa_id) where fechada_em is null;

create table artigos (
  id           uuid primary key default gen_random_uuid(),
  casa_id      uuid not null references casas(id) on delete cascade,
  lista_id     uuid not null references listas_compras(id) on delete cascade,
  rotulo       text not null,
  seccao       smallint not null default 0,
  pedido_por   uuid not null references membros(id) on delete cascade,
  estado       estado_artigo not null default 'por_comprar',
  estimativa   numeric(8,2) not null default 0,
  preco_real   numeric(8,2),
  habitual     boolean not null default false,
  ordem        integer not null default 0
);

comment on column artigos.estado is
  'O estado vive NA LINHA do artigo. Se fosse uma lista de ids confirmados, dois telefones na mesma loja anulavam-se.';


-- ═══ DINHEIRO ════════════════════════════════════════════════════════════════

create table meses (
  id          uuid primary key default gen_random_uuid(),
  casa_id     uuid not null references casas(id) on delete cascade,
  mes         date not null,
  rendimento  numeric(10,2) not null,
  limites     jsonb not null,
  aberto_em   timestamptz not null default now(),
  fechado_em  timestamptz,

  unique (casa_id, mes),
  constraint mes_e_dia_um check (extract(day from mes) = 1)
);

comment on column meses.limites is
  'Cópia dos limites por envelope à data da abertura. Parece redundante — é o que permite ao fecho do mês olhar para trás sem reconstruir história.';

create table envelopes (
  id            uuid primary key default gen_random_uuid(),
  casa_id       uuid not null references casas(id) on delete cascade,
  nome          text not null,
  limite_base   numeric(10,2) not null default 0 check (limite_base >= 0),
  cor           text not null default '#1890FF',
  ordem         integer not null default 0
);

comment on column envelopes.limite_base is
  'O limite EFETIVO é limite_base + transferências. Nunca escrever aqui ao mover dinheiro — usar transferencias.';

create table transferencias (
  id             uuid primary key default gen_random_uuid(),
  casa_id        uuid not null references casas(id) on delete cascade,
  de_envelope    uuid not null references envelopes(id) on delete cascade,
  para_envelope  uuid not null references envelopes(id) on delete cascade,
  valor          numeric(10,2) not null check (valor > 0),
  mes            date not null,
  por            uuid not null references membros(id) on delete cascade,
  criada_em      timestamptz not null default now(),

  constraint envelopes_distintos check (de_envelope <> para_envelope)
);

comment on table transferencias is
  'ADITIVA. Valor sempre positivo — o sinal vem da direção. Duas transferências simultâneas somam-se, o que é correto.';

create table despesas (
  id            uuid primary key default gen_random_uuid(),
  casa_id       uuid not null references casas(id) on delete cascade,
  envelope_id   uuid not null references envelopes(id) on delete cascade,
  valor         numeric(10,2) not null,
  descricao     text not null,
  data          date not null default current_date,
  pagador_id    uuid not null references membros(id) on delete cascade,
  divide_meias  boolean not null default true,
  recibo_ref    text,
  anula_id      uuid references despesas(id) on delete set null,
  criada_em     timestamptz not null default now()
);

comment on column despesas.anula_id is
  'Corrigir uma despesa é ANULÁ-LA e criar outra, nunca editar o valor. O extrato tem de contar a verdade, não a última versão dela.';

alter table listas_compras
  add constraint listas_despesa_fk
  foreign key (despesa_id) references despesas(id) on delete set null;

create table acertos (
  id           uuid primary key default gen_random_uuid(),
  casa_id      uuid not null references casas(id) on delete cascade,
  de_membro    uuid not null references membros(id) on delete cascade,
  para_membro  uuid not null references membros(id) on delete cascade,
  valor        numeric(10,2) not null check (valor > 0),
  data         timestamptz not null default now(),

  constraint membros_distintos check (de_membro <> para_membro)
);

comment on table acertos is
  'ADITIVA. Pagamento parcial é permitido: o resto continua em dívida. Ver v_acerto_saldo.';

create table cofre_movimentos (
  id               uuid primary key default gen_random_uuid(),
  casa_id          uuid not null references casas(id) on delete cascade,
  membro_id        uuid not null references membros(id) on delete cascade,
  tipo             tipo_cofre not null,
  valor            numeric(8,2) not null,
  motivo           text not null default '',
  autorizado_por   uuid references membros(id) on delete set null,
  data             timestamptz not null default now(),

  -- Retiradas são negativas e precisam de autorização de um adulto.
  constraint sinal_conforme_tipo check (
    (tipo = 'retirada' and valor < 0 and autorizado_por is not null)
    or (tipo <> 'retirada' and valor > 0)
  )
);

comment on table cofre_movimentos is
  'ADITIVA, sem exceção. O saldo do cofre NUNCA é uma coluna — é a soma desta tabela.';

create table metas (
  id         uuid primary key default gen_random_uuid(),
  casa_id    uuid not null references casas(id) on delete cascade,
  nome       text not null,
  objetivo   numeric(10,2) not null check (objetivo > 0),
  prazo      date,
  acumulado  numeric(10,2) not null default 0 check (acumulado >= 0)
);

comment on column metas.acumulado is
  'Só cresce por abertura de mês — não é editável à mão.';


-- ═══ EQUIPAMENTOS E SAÚDE ════════════════════════════════════════════════════

create table categorias_equip (
  id       uuid primary key default gen_random_uuid(),
  casa_id  uuid not null references casas(id) on delete cascade,
  nome     text not null,
  unique (casa_id, nome)
);

create table equipamentos (
  id            uuid primary key default gen_random_uuid(),
  casa_id       uuid not null references casas(id) on delete cascade,
  nome          text not null,
  categoria_id  uuid references categorias_equip(id) on delete set null,
  comprado_em   date not null,
  preco         numeric(10,2) not null default 0,
  onde          text not null default '',
  garantia_fim  date,
  criado_em     timestamptz not null default now()
);

comment on column equipamentos.garantia_fim is
  'Os três estados (em garantia / a expirar / fora) CALCULAM-SE disto. Nunca guardar o estado.';

create table manutencoes (
  id               uuid primary key default gen_random_uuid(),
  casa_id          uuid not null references casas(id) on delete cascade,
  equipamento_id   uuid not null references equipamentos(id) on delete cascade,
  tipo             text not null,
  evento_id        uuid references eventos(id) on delete set null,
  feita_em         timestamptz,
  criada_em        timestamptz not null default now()
);

comment on column manutencoes.evento_id is
  'Uma manutenção agendada é as duas coisas: linha aqui e evento na Agenda.';

create table especialidades (
  id       uuid primary key default gen_random_uuid(),
  casa_id  uuid not null references casas(id) on delete cascade,
  nome     text not null,
  unique (casa_id, nome)
);

create table episodios_saude (
  id                uuid primary key default gen_random_uuid(),
  casa_id           uuid not null references casas(id) on delete cascade,
  membro_id         uuid not null references membros(id) on delete cascade,
  especialidade_id  uuid references especialidades(id) on delete set null,
  profissional      text not null default '',
  dia               date not null,
  hora              time,
  evento_id         uuid references eventos(id) on delete set null,
  notas             text[] not null default '{}',
  criado_em         timestamptz not null default now()
);

comment on table episodios_saude is
  'DADOS DE SAÚDE, incluindo de menores — categoria especial no RGPD. A política de leitura é a mais restritiva do sistema.';

create table anexos (
  id              uuid primary key default gen_random_uuid(),
  casa_id         uuid not null references casas(id) on delete cascade,
  episodio_id     uuid references episodios_saude(id) on delete cascade,
  equipamento_id  uuid references equipamentos(id) on delete cascade,
  despesa_id      uuid references despesas(id) on delete cascade,
  tipo            tipo_anexo not null,
  ficheiro_ref    text not null,
  criado_em       timestamptz not null default now(),

  -- Exatamente UM elo. Exames pertencem ao episódio que os originou,
  -- faturas ao equipamento, recibos à despesa. Nunca soltos.
  constraint um_so_elo check (
    (episodio_id is not null)::int
    + (equipamento_id is not null)::int
    + (despesa_id is not null)::int = 1
  )
);

comment on column anexos.ficheiro_ref is
  'Caminho no Storage. O ficheiro NUNCA entra na tabela.';


-- ─── Índices ─────────────────────────────────────────────────────────────────
-- Cada um serve uma consulta que a app faz em cada abertura.

create index eventos_casa_dia     on eventos (casa_id, dia);
create index eventos_autor        on eventos (autor_id) where partilhado = false;
create index tarefas_casa_ativas  on tarefas (casa_id, urgencia, ordem) where removida_em is null;
create index feitas_tarefa_data   on tarefas_feitas (tarefa_id, data desc);
create index feitas_por_confirmar on tarefas_feitas (casa_id) where confirmada_em is null;
create index artigos_lista        on artigos (lista_id, seccao, ordem);
create index despesas_env_mes     on despesas (envelope_id, data);
create index transf_mes           on transferencias (casa_id, mes);
create index cofre_membro         on cofre_movimentos (membro_id, data desc);
create index equip_garantia       on equipamentos (casa_id, garantia_fim);
create index episodios_membro     on episodios_saude (membro_id, dia desc);
create index anexos_episodio      on anexos (episodio_id);


-- ─── Vistas: os saldos ───────────────────────────────────────────────────────
-- Nenhuma destas colunas existe numa tabela. Custa mais uma junção e poupa a
-- única categoria de erro que perde dinheiro.

create view v_cofre_saldo as
select m.id as membro_id, m.casa_id,
       coalesce(sum(cm.valor), 0)::numeric(10,2) as saldo
  from membros m
  left join cofre_movimentos cm on cm.membro_id = m.id
 where m.papel = 'crianca'
 group by m.id, m.casa_id;

create view v_envelope_limite as
select e.id as envelope_id, e.casa_id, e.nome,
       (e.limite_base
        + coalesce((select sum(t.valor) from transferencias t
                     where t.para_envelope = e.id
                       and t.mes = date_trunc('month', current_date)::date), 0)
        - coalesce((select sum(t.valor) from transferencias t
                     where t.de_envelope = e.id
                       and t.mes = date_trunc('month', current_date)::date), 0)
       )::numeric(10,2) as limite
  from envelopes e;

create view v_envelope_gasto as
select e.id as envelope_id, e.casa_id,
       coalesce(sum(d.valor), 0)::numeric(10,2) as gasto
  from envelopes e
  left join despesas d
    on d.envelope_id = e.id
   and d.data >= date_trunc('month', current_date)::date
   and d.anula_id is null
   and not exists (select 1 from despesas x where x.anula_id = d.id)
 group by e.id, e.casa_id;

-- Positivo = este membro tem a receber. Negativo = deve.
create view v_acerto_saldo as
with metades as (
  select casa_id, pagador_id as membro_id, sum(valor / 2) as v
    from despesas
   where divide_meias and anula_id is null
   group by casa_id, pagador_id
), pagos as (
  select casa_id, de_membro as membro_id, sum(valor) as v from acertos group by casa_id, de_membro
), recebidos as (
  select casa_id, para_membro as membro_id, sum(valor) as v from acertos group by casa_id, para_membro
)
select m.id as membro_id, m.casa_id,
       (coalesce(mt.v, 0) + coalesce(pg.v, 0) - coalesce(rc.v, 0))::numeric(10,2) as saldo
  from membros m
  left join metades   mt on mt.membro_id = m.id
  left join pagos     pg on pg.membro_id = m.id
  left join recebidos rc on rc.membro_id = m.id
 where m.papel in ('admin', 'adulto');

create view v_pontos_por_pagar as
select m.id as membro_id, m.casa_id,
       coalesce(sum(t.pontos), 0)::int as pontos
  from membros m
  left join tarefas_feitas tf on tf.marcada_por = m.id and tf.confirmada_em is not null
  left join tarefas t on t.id = tf.tarefa_id
  left join cofre_movimentos cm
    on cm.membro_id = m.id and cm.tipo = 'semanada' and cm.data > tf.confirmada_em
 where m.papel = 'crianca' and cm.id is null
 group by m.id, m.casa_id;


-- ─── Funções auxiliares para as políticas ────────────────────────────────────

create or replace function meu_membro_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from membros where conta_id = auth.uid() limit 1;
$$;

create or replace function minha_casa_id() returns uuid
language sql stable security definer set search_path = public as $$
  select casa_id from membros where conta_id = auth.uid() limit 1;
$$;

create or replace function sou_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where conta_id = auth.uid() and papel = 'admin');
$$;

create or replace function sou_adulto() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros where conta_id = auth.uid() and papel in ('admin', 'adulto'));
$$;

-- Verificação do PIN. NUNCA comparar o PIN no cliente.
create or replace function verificar_pin(p_membro uuid, p_pin text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_hash text; v_tent smallint; v_casa uuid;
begin
  select pin_hash, pin_tentativas, casa_id into v_hash, v_tent, v_casa
    from membros where id = p_membro and papel = 'crianca';

  if v_hash is null then return false; end if;                -- sem PIN definido
  if v_casa <> minha_casa_id() then return false; end if;      -- outra casa
  if v_tent >= 5 then return false; end if;                    -- bloqueado

  if crypt(p_pin, v_hash) = v_hash then
    update membros set pin_tentativas = 0 where id = p_membro;
    return true;
  end if;

  update membros set pin_tentativas = pin_tentativas + 1 where id = p_membro;
  return false;
end $$;

create or replace function definir_pin(p_membro uuid, p_pin text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not sou_adulto() then raise exception 'Só um adulto pode definir o PIN.'; end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'O PIN tem de ter 4 dígitos.'; end if;
  update membros
     set pin_hash = crypt(p_pin, gen_salt('bf')), pin_tentativas = 0
   where id = p_membro and casa_id = minha_casa_id() and papel = 'crianca';
end $$;

-- A casa não pode ficar sem administração.
create or replace function guardar_ultimo_admin() returns trigger
language plpgsql as $$
begin
  if old.papel = 'admin' and new.papel <> 'admin' then
    if (select count(*) from membros
         where casa_id = old.casa_id and papel = 'admin' and id <> old.id) = 0 then
      raise exception 'A casa não pode ficar sem administração.';
    end if;
  end if;
  -- Adulto nunca volta a criança.
  if old.papel in ('admin', 'adulto') and new.papel = 'crianca' then
    raise exception 'Um adulto não pode passar a criança.';
  end if;
  return new;
end $$;

create trigger membros_guardar_admin before update on membros
  for each row execute function guardar_ultimo_admin();


-- ─── RLS: a visibilidade vive aqui ───────────────────────────────────────────
-- O cliente NÃO filtra nada. Recebe apenas o que lhe compete.

alter table casas             enable row level security;
alter table membros           enable row level security;
alter table preferencias      enable row level security;
alter table eventos           enable row level security;
alter table tarefas           enable row level security;
alter table tarefas_feitas    enable row level security;
alter table lojas             enable row level security;
alter table listas_compras    enable row level security;
alter table artigos           enable row level security;
alter table meses             enable row level security;
alter table envelopes         enable row level security;
alter table transferencias    enable row level security;
alter table despesas          enable row level security;
alter table acertos           enable row level security;
alter table cofre_movimentos  enable row level security;
alter table metas             enable row level security;
alter table categorias_equip  enable row level security;
alter table equipamentos      enable row level security;
alter table manutencoes       enable row level security;
alter table especialidades    enable row level security;
alter table episodios_saude   enable row level security;
alter table anexos            enable row level security;

-- A casa
create policy casa_ler on casas for select
  using (id = minha_casa_id());
create policy casa_alterar on casas for update
  using (id = minha_casa_id() and sou_admin());

-- Membros: todos veem quem vive na casa; só a administração altera papéis.
create policy membros_ler on membros for select
  using (casa_id = minha_casa_id());
create policy membros_criar on membros for insert
  with check (casa_id = minha_casa_id() and sou_admin());
create policy membros_alterar on membros for update
  using (casa_id = minha_casa_id() and (sou_admin() or id = meu_membro_id()));

-- Preferências: só as próprias.
create policy prefs_tudo on preferencias for all
  using (membro_id = meu_membro_id())
  with check (membro_id = meu_membro_id());

-- Eventos: PARTILHADOS a todos, PRIVADOS só ao autor.
-- É esta linha que impede o evento privado de chegar ao outro telefone.
create policy eventos_ler on eventos for select
  using (casa_id = minha_casa_id() and (partilhado or autor_id = meu_membro_id()));
create policy eventos_criar on eventos for insert
  with check (casa_id = minha_casa_id() and sou_adulto() and autor_id = meu_membro_id());
create policy eventos_alterar on eventos for update
  using (casa_id = minha_casa_id() and sou_adulto()
         and (partilhado or autor_id = meu_membro_id()));
create policy eventos_apagar on eventos for delete
  using (casa_id = minha_casa_id() and sou_adulto()
         and (partilhado or autor_id = meu_membro_id()));

-- Tarefas: a criança vê as suas e as partilhadas; adultos definem.
create policy tarefas_ler on tarefas for select
  using (casa_id = minha_casa_id()
         and (partilhada or atribuido_a = meu_membro_id() or sou_adulto()));
create policy tarefas_escrever on tarefas for all
  using (casa_id = minha_casa_id() and sou_adulto())
  with check (casa_id = minha_casa_id() and sou_adulto());

-- Conclusões: qualquer membro marca as suas; só adultos confirmam.
create policy feitas_ler on tarefas_feitas for select
  using (casa_id = minha_casa_id());
create policy feitas_marcar on tarefas_feitas for insert
  with check (casa_id = minha_casa_id() and marcada_por = meu_membro_id()
              and confirmada_em is null);
create policy feitas_confirmar on tarefas_feitas for update
  using (casa_id = minha_casa_id() and sou_adulto());
create policy feitas_desmarcar on tarefas_feitas for delete
  using (casa_id = minha_casa_id()
         and (sou_adulto() or (marcada_por = meu_membro_id() and confirmada_em is null)));

-- Compras: todos os adultos escrevem. As crianças não veem.
create policy lojas_ler on lojas for select using (casa_id = minha_casa_id());
create policy lojas_escrever on lojas for all
  using (casa_id = minha_casa_id() and sou_admin())
  with check (casa_id = minha_casa_id() and sou_admin());

create policy listas_tudo on listas_compras for all
  using (casa_id = minha_casa_id() and sou_adulto())
  with check (casa_id = minha_casa_id() and sou_adulto());
create policy artigos_tudo on artigos for all
  using (casa_id = minha_casa_id() and sou_adulto())
  with check (casa_id = minha_casa_id() and sou_adulto());

-- Dinheiro: NADA disto é visível às crianças. É a decisão de produto.
create policy meses_tudo on meses for all
  using (casa_id = minha_casa_id() and sou_admin())
  with check (casa_id = minha_casa_id() and sou_admin());

create policy envelopes_ler on envelopes for select
  using (casa_id = minha_casa_id() and sou_adulto());
create policy envelopes_escrever on envelopes for all
  using (casa_id = minha_casa_id() and sou_admin())
  with check (casa_id = minha_casa_id() and sou_admin());

create policy transf_tudo on transferencias for all
  using (casa_id = minha_casa_id() and sou_admin())
  with check (casa_id = minha_casa_id() and sou_admin());

create policy despesas_tudo on despesas for all
  using (casa_id = minha_casa_id() and sou_adulto())
  with check (casa_id = minha_casa_id() and sou_adulto());

create policy acertos_tudo on acertos for all
  using (casa_id = minha_casa_id() and sou_adulto())
  with check (casa_id = minha_casa_id() and sou_adulto());

create policy metas_ler on metas for select
  using (casa_id = minha_casa_id() and sou_adulto());
create policy metas_escrever on metas for all
  using (casa_id = minha_casa_id() and sou_admin())
  with check (casa_id = minha_casa_id() and sou_admin());

-- Cofres: a criança vê o SEU. Só adultos escrevem.
create policy cofre_ler on cofre_movimentos for select
  using (casa_id = minha_casa_id() and (sou_adulto() or membro_id = meu_membro_id()));
create policy cofre_escrever on cofre_movimentos for all
  using (casa_id = minha_casa_id() and sou_adulto())
  with check (casa_id = minha_casa_id() and sou_adulto());

-- Equipamentos
create policy cats_ler on categorias_equip for select using (casa_id = minha_casa_id());
create policy cats_escrever on categorias_equip for all
  using (casa_id = minha_casa_id() and sou_admin())
  with check (casa_id = minha_casa_id() and sou_admin());

create policy equip_ler on equipamentos for select
  using (casa_id = minha_casa_id() and sou_adulto());
create policy equip_escrever on equipamentos for all
  using (casa_id = minha_casa_id() and sou_adulto())
  with check (casa_id = minha_casa_id() and sou_adulto());

create policy manut_tudo on manutencoes for all
  using (casa_id = minha_casa_id() and sou_adulto())
  with check (casa_id = minha_casa_id() and sou_adulto());

-- Saúde: a política MAIS RESTRITIVA do sistema.
-- Um adulto vê a SUA ficha e as das CRIANÇAS. Nunca a do outro adulto.
create policy esp_ler on especialidades for select using (casa_id = minha_casa_id());
create policy esp_escrever on especialidades for all
  using (casa_id = minha_casa_id() and sou_admin())
  with check (casa_id = minha_casa_id() and sou_admin());

create policy saude_ler on episodios_saude for select
  using (casa_id = minha_casa_id() and (
    membro_id = meu_membro_id()
    or (sou_adulto() and exists (
         select 1 from membros m where m.id = episodios_saude.membro_id and m.papel = 'crianca'))
  ));
create policy saude_escrever on episodios_saude for all
  using (casa_id = minha_casa_id() and (
    membro_id = meu_membro_id()
    or (sou_adulto() and exists (
         select 1 from membros m where m.id = episodios_saude.membro_id and m.papel = 'crianca'))
  ))
  with check (casa_id = minha_casa_id() and (
    membro_id = meu_membro_id()
    or (sou_adulto() and exists (
         select 1 from membros m where m.id = episodios_saude.membro_id and m.papel = 'crianca'))
  ));

-- Anexos: herdam a visibilidade do que referenciam.
create policy anexos_ler on anexos for select
  using (casa_id = minha_casa_id() and (
    (episodio_id is not null and exists (select 1 from episodios_saude e where e.id = episodio_id))
    or (equipamento_id is not null and sou_adulto())
    or (despesa_id is not null and sou_adulto())
  ));
create policy anexos_escrever on anexos for all
  using (casa_id = minha_casa_id() and sou_adulto())
  with check (casa_id = minha_casa_id() and sou_adulto());


-- ─── Tempo real ──────────────────────────────────────────────────────────────
-- Só as compras precisam. O resto sincroniza ao abrir e periodicamente.

alter publication supabase_realtime add table artigos;
alter publication supabase_realtime add table listas_compras;
