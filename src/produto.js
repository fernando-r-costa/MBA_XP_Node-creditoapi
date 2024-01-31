const db = require('./db');

const consultar = async (codigo, descricao, preco, update = false) => {
  let produto = await db.produto.findOne({
    where: { Codigo: codigo },
  });

  if (produto == null) {
    if (!update) {
      produto = await db.produto.create({
        Codigo: codigo,
        Descricao: descricao,
        Preco: preco,
      });
      return { ...produto.toJSON(), criado: true };
    }
    return null;
  }

  await db.produto.update(
    {
      Descricao: descricao,
      Preco: preco,
    },
    {
      where: { Codigo: codigo },
    },
  );

  return { ...produto.toJSON(), criado: false };
};

const listar = async () => db.produto.findAll();

const deletar = async (codigo) => {
  const produto = await db.produto.findOne({
    where: { Codigo: codigo },
  });

  if (produto == null) {
    return null;
  }

  await db.produto.destroy({ where: { Codigo: codigo } });
  return { ...produto.toJSON() };
};

module.exports = { consultar, listar, deletar };
