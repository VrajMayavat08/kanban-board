const List = require('../models/List');

const createList = async (req, res) => {
  try {
    const { title, board, position } = req.body;
    const list = await List.create({ title, board, position });
    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createList };