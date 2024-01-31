const express = require('express');

const app = express();

const { check, validationResult } = require('express-validator');

const consultaCliente = require('./consulta-cliente');
const consultaProduto = require('./produto');

app.use(express.json());

app.get('/', async (req, res) => {
  res.status(200).send('Bootcamp desenvolvedor back end - Tópicos especiais!');
});

app.get('/cliente', async (req, res) => {
  try {
    const clientes = await consultaCliente.listar();
    return res.status(201).json(clientes);
  } catch (erro) {
    return res.status(405).json({ erro: erro.message });
  }
});

app.post(
  '/consulta-credito',

  check('nome', 'Nome deve ser informado').notEmpty(),
  check('CPF', 'CPF deve ser informado').notEmpty(),
  check('valor', 'O valor deve ser um número').notEmpty().isFloat(),
  check('parcelas', 'O número de parcelas deve ser um número inteiro').notEmpty().isInt(),

  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erro: erros.array() });
    }

    try {
      const valores = await consultaCliente.consultar(
        req.body.nome,
        req.body.CPF,
        req.body.valor,
        req.body.parcelas,
      );
      return res.status(201).json(valores);
    } catch (erro) {
      return res.status(405).json({ erro: erro.message });
    }
  },
);

app.post(
  '/produto',

  check('codigo', 'Código deve ser informado').notEmpty(),
  check('descricao', 'Descrição deve ser informado').notEmpty(),
  check('preco', 'O preço deve ser um número').notEmpty().isFloat(),

  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erro: erros.array() });
    }

    try {
      const produto = await consultaProduto.consultar(
        req.body.codigo,
        req.body.descricao,
        req.body.preco,
      );
      if (produto.criado) {
        return res.status(201).json(produto);
      }
      return res.status(200).json(produto);
    } catch (erro) {
      return res.status(405).json({ erro: erro.message });
    }
  },
);

app.put(
  '/produto',

  check('codigo', 'Código deve ser informado').notEmpty(),
  check('descricao', 'Descrição deve ser informado').notEmpty(),
  check('preco', 'O preço deve ser um número').notEmpty().isFloat(),

  async (req, res) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erro: erros.array() });
    }

    try {
      const produto = await consultaProduto.consultar(
        req.body.codigo,
        req.body.descricao,
        req.body.preco,
        true,
      );

      if (produto === null) {
        return res.status(405).json({ erro: 'Produto não encontrado' });
      }
      return res.status(200).json({ mensagem: 'Produto atualizado com sucesso' });
    } catch (erro) {
      return res.status(500).json({ erro: erro.message });
    }
  },
);

app.get('/produto', async (req, res) => {
  try {
    const produtos = await consultaProduto.listar();

    return res.status(200).json(produtos);
  } catch (erro) {
    return res.status(500).json({ erro: erro.message });
  }
});

app.delete('/produto/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;

    const produto = await consultaProduto.deletar(codigo);
    if (!produto) {
      return res.status(405).json({ erro: 'Produto não encontrado' });
    }

    return res.status(200).json(produto);
  } catch (erro) {
    return res.status(500).json({ erro: erro.message });
  }
});

module.exports = app;
