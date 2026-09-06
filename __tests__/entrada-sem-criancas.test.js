/**
 * O ecrã de entrada não manda fazer o que não oferece.
 *
 * ⚠ «Entrar como Criança» numa casa SEM crianças mostrava:
 *
 *     Quem está a entrar?
 *     Escolha o seu nome e introduza o PIN de 4 dígitos.
 *     [ Voltar ]
 *
 * E mais nada. A instrução seguia a lista, e a lista podia estar vazia: o ecrã
 * pedia para escolher um nome por cima de coisa nenhuma, e a única saída era o
 * «Voltar».
 *
 * Não rebenta, e por isso nenhuma das 1405 provas o via — é o ecrã a mentir com
 * toda a calma. Apanhado a percorrer os ecrãs à mão com a casa vazia, que é
 * como ela está no PRIMEIRO DIA de uma família: precisamente quando este ecrã é
 * mais visitado, e quando ninguém sabe ainda o que a app faz.
 *
 * O resto da app já sabe fazer isto — «Ainda não há nada nas fichas desta casa.
 * Use Marcar Consulta para a primeira.» Diz o que falta, e quem o resolve.
 */
const fs = require('fs');
const path = require('path');

const ecra = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'Login.jsx'), 'utf8');
const semComentarios = ecra.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// O passo das crianças, do `step === 'criancas'` até ao passo seguinte.
const bloco = semComentarios.slice(
  semComentarios.indexOf("step === 'criancas'"),
  semComentarios.indexOf('caretRight'));

describe('⚠ entrar como criança, numa casa sem crianças', () => {
  it('o passo das crianças existe, senão isto não prova nada', () => {
    expect(bloco.length).toBeGreaterThan(200);
    expect(bloco).toMatch(/criancas\.map/);
  });

  it('⚠ o título muda quando não há ninguém para escolher', () => {
    expect(bloco).toMatch(/criancas\.length \? 'Quem está a entrar\?'/);
    expect(bloco).toMatch(/Ainda não há crianças nesta casa/);
  });

  it('⚠ e a instrução também — nada de «escolha o seu nome» sobre uma lista vazia', () => {
    expect(bloco).toMatch(/criancas\.length[\s\S]{0,120}Escolha o seu nome/);
    // O que se diz em vez disso aponta quem resolve, como no resto da app.
    expect(bloco).toMatch(/Gestão da Casa/);
  });

  it('e continua a haver saída', () => {
    expect(semComentarios).toMatch(/accessibilityLabel="Voltar"/);
  });
});

describe('e o que o ecrã de entrada promete', () => {
  it('nomeia a casa, e não «a Nossa Casa» genérica', () => {
    // O subtítulo lê o nome da casa: quem entra vê a SUA família, não um
    // rótulo de produto.
    expect(semComentarios).toMatch(/nomeDaCasa/);
  });

  it('⚠ diz o que a Google recebe, ANTES de se carregar no botão', () => {
    // Não é decoração: é o consentimento a ser dado com a informação à frente,
    // e não depois de a janela abrir.
    expect(semComentarios).toMatch(/recebe o seu nome e endereço de e-mail/);
    expect(semComentarios).toMatch(/Nenhum dado bancário/);
  });

  it('e uma criança sem PIN vê porquê, em vez de um botão morto', () => {
    expect(semComentarios).toMatch(/Ainda sem PIN — pedir a um adulto/);
  });
});
