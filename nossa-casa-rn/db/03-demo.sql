-- ============================================================================
-- Dados de demonstração — a família Bengui
-- ============================================================================
-- Os mesmos dados do protótipo, para o desenvolvimento poder comparar ecrã a ecrã
-- com docs/referencia/. Correr numa base vazia.

do $$
declare
  v_casa uuid; v_rita uuid; v_tomas uuid; v_leo uuid; v_mia uuid;
  v_merc uuid; v_criancas uuid; v_casa_env uuid; v_lazer uuid;
  v_loja uuid; v_lista uuid;
begin
  insert into casas (nome, rendimento_mensal, valor_ponto, dia_pagamento, divide_meias)
  values ('Família Bengui', 3200, 0.10, 0, true) returning id into v_casa;

  insert into membros (casa_id, nome, papel, cor) values
    (v_casa, 'Rita',   'admin',   '#722ED1') returning id into v_rita;
  insert into membros (casa_id, nome, papel, cor) values
    (v_casa, 'Tomás',  'adulto',  '#08979C') returning id into v_tomas;
  insert into membros (casa_id, nome, papel, cor) values
    (v_casa, 'Léo',    'crianca', '#1890FF') returning id into v_leo;
  insert into membros (casa_id, nome, papel, cor) values
    (v_casa, 'Mia',    'crianca', '#011B58') returning id into v_mia;

  insert into preferencias (membro_id) values (v_rita), (v_tomas), (v_leo), (v_mia);

  insert into envelopes (casa_id, nome, limite_base, cor, ordem) values
    (v_casa, 'Mercearia',          550, '#1890FF', 0) returning id into v_merc;
  insert into envelopes (casa_id, nome, limite_base, cor, ordem) values
    (v_casa, 'Crianças & escola',  340, '#FAAD14', 1) returning id into v_criancas;
  insert into envelopes (casa_id, nome, limite_base, cor, ordem) values
    (v_casa, 'Casa & contas',      700, '#1890FF', 2) returning id into v_casa_env;
  insert into envelopes (casa_id, nome, limite_base, cor, ordem) values
    (v_casa, 'Sair & lazer',       180, '#FF4D4F', 3) returning id into v_lazer;

  insert into meses (casa_id, mes, rendimento, limites)
  values (v_casa, date_trunc('month', current_date)::date, 3200,
          jsonb_build_object('Mercearia', 550, 'Crianças & escola', 340,
                             'Casa & contas', 700, 'Sair & lazer', 180));

  insert into lojas (casa_id, nome, ordem_corredores) values
    (v_casa, 'Continente de Belém', '{0,1,2,3}') returning id into v_loja;
  insert into lojas (casa_id, nome, ordem_corredores) values
    (v_casa, 'Pingo Doce do Restelo', '{1,0,2,3}');

  insert into listas_compras (casa_id, loja_id, comprador_id, planeada_para)
  values (v_casa, v_loja, v_tomas, now() + interval '3 days') returning id into v_lista;

  insert into artigos (casa_id, lista_id, rotulo, seccao, pedido_por, estimativa, habitual) values
    (v_casa, v_lista, 'Maçã reineta · 1,5 kg',      0, v_rita,  3.40, false),
    (v_casa, v_lista, 'Cenoura · 1 kg',             0, v_rita,  1.20, true),
    (v_casa, v_lista, 'Banana · 1 kg',              0, v_tomas, 1.85, true),
    (v_casa, v_lista, 'Leite meio-gordo · 6 un.',   1, v_rita,  5.10, true),
    (v_casa, v_lista, 'Iogurtes das crianças',      1, v_mia,   4.60, false),
    (v_casa, v_lista, 'Queijo flamengo fatiado',    1, v_tomas, 3.20, true),
    (v_casa, v_lista, 'Manteiga sem sal',           1, v_rita,  2.45, true),
    (v_casa, v_lista, 'Arroz agulha · 1 kg',        2, v_tomas, 1.80, true),
    (v_casa, v_lista, 'Massa espirais',             2, v_rita,  1.15, true),
    (v_casa, v_lista, 'Café moído',                 2, v_tomas, 4.30, true),
    (v_casa, v_lista, 'Papel de cozinha',           3, v_rita,  3.10, true),
    (v_casa, v_lista, 'Detergente da louça',        3, v_tomas, 2.65, true),
    (v_casa, v_lista, 'Sacos do lixo',              3, v_rita,  1.95, false);

  insert into tarefas (casa_id, titulo, atribuido_a, recorrencia, pontos, urgencia, ordem) values
    (v_casa, 'Pôr o lixo na rua',            v_leo,   'diaria',      3, 0, 1),
    (v_casa, 'Levantar a mesa do jantar',    v_mia,   'diaria',      2, 1, 1),
    (v_casa, 'Arrumar a mochila da escola',  v_leo,   'dias_semana', 2, 1, 2),
    (v_casa, 'Máquina de roupa + estender',  v_tomas, 'uma_vez',     0, 1, 3),
    (v_casa, 'Regar as plantas da varanda',  v_mia,   'uma_vez',     2, 2, 1),
    (v_casa, 'Vitamina D das crianças',      v_rita,  'diaria',      0, 2, 2);

  insert into eventos (casa_id, dia, hora, titulo, responsavel_id, autor_id, partilhado) values
    (v_casa, current_date,                 '08:40', 'Levar o Léo à escola',   v_tomas, v_tomas, true),
    (v_casa, current_date,                 '15:30', 'Ballet da Mia',          v_rita,  v_rita,  true),
    (v_casa, current_date,                 '18:00', 'Consulta do dentista',   v_tomas, v_tomas, false),
    (v_casa, current_date + 1,             '09:00', 'Reunião de pais',        v_rita,  v_rita,  true),
    (v_casa, current_date + 1,             '17:00', 'Natação do Léo',         v_leo,   v_rita,  true),
    (v_casa, current_date + 3,             '10:30', 'Compras da semana',      v_tomas, v_tomas, true),
    (v_casa, current_date + 3,             '16:00', 'Anos da Clara — festa',  v_mia,   v_rita,  true);

  insert into cofre_movimentos (casa_id, membro_id, tipo, valor, motivo, data) values
    (v_casa, v_leo, 'semanada', 1.60, 'Semanada da semana passada', now() - interval '7 days'),
    (v_casa, v_leo, 'bonus',    5.00, 'Boletim escolar',            now() - interval '14 days'),
    (v_casa, v_leo, 'semanada', 5.80, 'Semanadas anteriores',       now() - interval '30 days'),
    (v_casa, v_mia, 'semanada', 1.30, 'Semanada da semana passada', now() - interval '7 days'),
    (v_casa, v_mia, 'bonus',    5.00, 'Boletim escolar',            now() - interval '14 days'),
    (v_casa, v_mia, 'semanada', 2.60, 'Semanadas anteriores',       now() - interval '30 days');

  insert into despesas (casa_id, envelope_id, valor, descricao, data, pagador_id, divide_meias) values
    (v_casa, v_merc,     412.00, 'Compras do mês até agora', current_date - 5,  v_tomas, true),
    (v_casa, v_criancas, 318.00, 'Escola e atividades',      current_date - 12, v_rita,  true),
    (v_casa, v_casa_env, 486.00, 'Renda e contas',           current_date - 20, v_rita,  true),
    (v_casa, v_lazer,    171.00, 'Restaurantes e cinema',    current_date - 8,  v_tomas, true);

  insert into metas (casa_id, nome, objetivo, prazo, acumulado) values
    (v_casa, 'Férias no Algarve', 3000, '2027-07-01', 1920),
    (v_casa, 'Carro novo',       12000, '2028-01-01', 2640);

  insert into categorias_equip (casa_id, nome) values
    (v_casa, 'Eletrodomésticos'), (v_casa, 'Aquecimento'),
    (v_casa, 'Informática'),      (v_casa, 'Outros');

  insert into equipamentos (casa_id, nome, categoria_id, comprado_em, preco, onde, garantia_fim)
  select v_casa, x.nome, c.id, x.comprado, x.preco, x.onde, x.garantia
    from (values
      ('Máquina de lavar roupa Bosch', 'Eletrodomésticos', '2025-03-12'::date, 549.00,  'Worten · Colombo',        '2027-03-12'::date),
      ('Frigorífico Samsung RB34',     'Eletrodomésticos', '2023-10-04'::date, 899.00,  'El Corte Inglés',         '2026-10-04'::date),
      ('Caldeira Vulcano 24 kW',       'Aquecimento',      '2021-11-18'::date, 1250.00, 'Instalador Aquatérmica',  '2023-11-18'::date),
      ('Portátil Dell da Rita',        'Informática',      '2026-01-20'::date, 1099.00, 'Dell Online',             '2028-01-20'::date)
    ) as x(nome, cat, comprado, preco, onde, garantia)
    join categorias_equip c on c.casa_id = v_casa and c.nome = x.cat;

  insert into especialidades (casa_id, nome) values
    (v_casa, 'Medicina geral'), (v_casa, 'Pediatria'), (v_casa, 'Dentista'),
    (v_casa, 'Oftalmologia'),   (v_casa, 'Dermatologia');

  raise notice 'Casa % criada com 4 membros, 13 artigos, 6 tarefas, 7 eventos.', v_casa;
end $$;
