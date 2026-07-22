const List = require('../models/List');
const Card = require('../models/Card');

const createList = async (req, res) => {
  try {
    const { title, board, position } = req.body;
    const list = await List.create({ title, board, position });
    res.status(201).json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteList = async (req, res) => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) return res.status(404).json({ message: 'List not found' });

    // Delete all cards in this list first
    await Card.deleteMany({ list: list._id });
    await List.findByIdAndDelete(req.params.id);

    res.json({ message: 'List deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createList, deleteList };