const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

describe('Testes de Integração', () => {
  beforeEach(async () => {
    await db.cliente.destroy({ where: {} });
    await db.consulta.destroy({ where: {} });
    await db.produto.destroy({ where: {} });
  });

  afterAll(async () => db.sequelize.close());

  const clienteJoao = {
    Nome: 'João Silva',
    CPF: '000.000.000-00',
  };

  const clienteJose = {
    Nome: 'Jose Silva',
    CPF: '111.000.000-00',
  };

  const clientePaulo = {
    Nome: 'Paulo Silva',
    CPF: '222.000.000-00',
  };

  const resultadoEsperado = {
    montante: 106.9,
    juros: 0.025,
    parcelas: 3,
    primeiraPrestacao: 35.64,
    prestacoes: [35.64, 35.63, 35.63],
  };

  const payloadRequest = {
    nome: clienteJoao.Nome,
    CPF: clienteJoao.CPF,
    valor: 101.75,
    parcelas: 3,
  };

  const payloadProduto = {
    codigo: '1234',
    descricao: 'Produto XYZ',
    preco: 200,
  };

  test('responder http 200 na raiz - Versão 01', () => request(app).get('/')
    .then((res) => expect(res.status).toBe(200)));

  test('responder http 200 na raiz - Versão 02', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  // O teste abaixo está errando, porém passando com sucesso, pois não suporta
  // o comportamento assíncrono da chamada HTTP realizada. O mesmo deveria
  // falhar, uma vez que a aplicação retorna HTTP 200,
  // ao passo que o teste está aguardando um HTTP 400.
  //
  // test('responder http 200 na raiz - Versão COM ERRO', () => {
  //   request(app).get('/')
  //     .then((res) => expect(res.status).toBe(400));
  // });

  test('CENÁRIO 01', async () => {
    const res = await request(app)
      .post('/consulta-credito')
      .send(payloadRequest);

    // Resultado é obtido com sucesso
    expect(res.body.erro).toBeUndefined();
    expect(res.body.montante).toBe(106.9);
    expect(res.status).toBe(201);
    expect(res.body).toMatchSnapshot(resultadoEsperado);
    expect(res.body).toMatchObject(resultadoEsperado);

    // Cliente foi armazenado
    const cliente = await db.cliente.findOne({ where: { CPF: clienteJoao.CPF } });
    expect(cliente.CPF).toBe(clienteJoao.CPF);

    const consulta = await db.consulta.findOne({ where: { ClienteCPF: clienteJoao.CPF } });
    expect(consulta.Valor).toBe(101.75);
  });

  test('CENÁRIO 02', async () => {
    await db.cliente.create(clienteJoao);
    await db.consulta.create({
      Valor: 1,
      NumPrestacoes: 2,
      Juros: 0.5,
      Prestacoes: '1, 1',
      ClienteCPF: clienteJoao.CPF,
      Montante: 2,
      createdAt: '2016-06-22 19:10:25-07',
    });

    const res = await request(app)
      .post('/consulta-credito')
      .send(payloadRequest);
    expect(res.body).toMatchSnapshot(resultadoEsperado);
    expect(res.status).toBe(201);

    const count = await db.consulta.count({ where: { ClienteCPF: clienteJoao.CPF } });
    expect(count).toBe(2);
  });

  test('CENÁRIO 03', async () => {
    const res1 = await request(app)
      .post('/consulta-credito')
      .send(payloadRequest);

    expect(res1.body).toMatchSnapshot(resultadoEsperado);

    const res2 = await request(app)
      .post('/consulta-credito')
      .send(payloadRequest);

    // Resultado é obtido
    expect(res2.body.erro).toBeDefined();
    expect(res2.status).toBe(405);
  });

  test('CENÁRIO 04', async () => {
    const res = await request(app)
      .post('/consulta-credito')
      .send({});

    // Resultado é obtido
    expect(res.body.erro).toBeDefined();
    expect(res.status).toBe(400);
  });

  test('Retornar uma lista com todos os clientes persistidos na base de dados', async () => {
    await db.cliente.create(clienteJoao);
    await db.cliente.create(clienteJose);
    await db.cliente.create(clientePaulo);

    const res = await request(app).get('/cliente');
    const clientes = JSON.parse(res.text);

    expect(clientes).toEqual(expect.arrayContaining([
      expect.objectContaining(clienteJoao),
      expect.objectContaining(clienteJose),
      expect.objectContaining(clientePaulo),
    ]));
    expect(clientes).toMatchSnapshot(expect.arrayContaining([
      expect.objectContaining(clienteJoao),
      expect.objectContaining(clienteJose),
      expect.objectContaining(clientePaulo),
    ]));
    expect(clientes).toMatchObject(expect.arrayContaining([
      expect.objectContaining(clienteJoao),
      expect.objectContaining(clienteJose),
      expect.objectContaining(clientePaulo),
    ]));
  });

  test('Cadastro de novo produto retorna HTTP 201', async () => {
    const res = await request(app)
      .post('/produto')
      .send(payloadProduto);

    expect(res.status).toBe(201);
  });

  test('Atualização de produto existente retorna HTTP 200', async () => {
    await db.produto.create({
      Codigo: payloadProduto.codigo,
      Descricao: 'Produto antigo',
      Preco: 50,
    });

    const res = await request(app)
      .post('/produto')
      .send(payloadProduto);

    expect(res.status).toBe(200);

    const produtoAtual = await db.produto.findOne({ where: { Codigo: payloadProduto.codigo } });
    expect(produtoAtual.Descricao).toBe(payloadProduto.descricao);
    expect(produtoAtual.Preco).toBe(payloadProduto.preco);
  });

  test('Requisição com payload inválido retorna HTTP 400 e mensagem de erro', async () => {
    const payloadInvalido = {
      descricao: 'Descrição inválida',
      preco: 50,
    };

    const res = await request(app)
      .post('/produto')
      .send(payloadInvalido);

    expect(res.status).toBe(400);

    expect(res.body.erro).toBeDefined();
  });

  test('Atualização de dados de descrição e preço retorna HTTP 200', async () => {
    await db.produto.create({
      Codigo: '1234',
      Descricao: 'Produto antigo',
      Preco: 50,
    });

    const payload = {
      codigo: '1234',
      descricao: 'Nova descrição',
      preco: 100,
    };

    const res = await request(app)
      .put('/produto')
      .send(payload);

    expect(res.status).toBe(200);

    const produtoAtualizado = await db.produto.findOne({ where: { Codigo: payload.codigo } });
    expect(produtoAtualizado.Descricao).toBe(payload.descricao);
    expect(produtoAtualizado.Preco).toBe(payload.preco);
  });

  test('Payload inválido retorna HTTP 400 e mensagem de erro', async () => {
    const payloadInvalido = {
      descricao: 'Nova descrição inválida',
      preco: 100,
    };

    const res = await request(app)
      .put('/produto')
      .send(payloadInvalido);

    expect(res.status).toBe(400);
    expect(res.body.erro).toBeDefined();
  });

  test('Produto não encontrado retorna HTTP 405 e mensagem de erro', async () => {
    const payload = {
      codigo: '9876',
      descricao: 'Nova descrição',
      preco: 100,
    };

    const res = await request(app)
      .put('/produto')
      .send(payload);

    expect(res.status).toBe(405);
    expect(res.body.erro).toBeDefined();
  });

  test('Retorna uma lista de produtos com status HTTP 200', async () => {
    await db.produto.bulkCreate([
      { Codigo: '001', Descricao: 'Produto 1', Preco: 10 },
      { Codigo: '002', Descricao: 'Produto 2', Preco: 20 },
      { Codigo: '003', Descricao: 'Produto 3', Preco: 30 },
    ]);

    const res = await request(app).get('/produto');

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(3);
    expect(res.body[0]).toHaveProperty('Codigo', '001');
    expect(res.body[1]).toHaveProperty('Codigo', '002');
    expect(res.body[2]).toHaveProperty('Codigo', '003');
  });

  test('Excluir um produto existente retorna HTTP 200 com dados do produto excluído', async () => {
    const produtoInserido = await db.produto.create({
      Codigo: '001',
      Descricao: 'Produto de teste',
      Preco: 10,
    });

    const res = await request(app).delete(`/produto/${produtoInserido.Codigo}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('Codigo', produtoInserido.Codigo);
    expect(res.body).toHaveProperty('Descricao', produtoInserido.Descricao);
    expect(res.body).toHaveProperty('Preco', produtoInserido.Preco);

    const produtoExcluido = await db.produto.findOne({ where: { Codigo: produtoInserido.Codigo } });
    expect(produtoExcluido).toBeNull();
  });

  test('Tentar excluir um produto inexistente retorna HTTP 405 com mensagem de erro', async () => {
    const res = await request(app).delete('/produto/999');

    expect(res.status).toBe(405);

    expect(res.body).toEqual({ erro: 'Produto não encontrado' });
  });
});
