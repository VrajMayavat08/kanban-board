const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const User = require('../models/User');


// Get all boards for logged-in user (owned or member of)
const getBoards = async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
    }).sort({ createdAt: -1 });
    res.json(boards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a board
const createBoard = async (req, res) => {
  try {
    const { title } = req.body;
    const board = await Board.create({
      title,
      owner: req.user._id,
      members: [req.user._id],
    });
    res.status(201).json(board);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single board with all its lists and cards
const getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id).populate('members', 'name email');
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const isMember =
      board.owner.toString() === req.user._id.toString() ||
      board.members.some((m) => m._id.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'You do not have access to this board' });
    }

    const lists = await List.find({ board: board._id }).sort({ position: 1 });
    const cards = await Card.find({ board: board._id }).sort({ position: 1 });

    res.json({ board, lists, cards });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a member to a board
const addMember = async (req, res) => {
  try {
    const { email } = req.body;
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    // Only the owner can add members
    if (board.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the board owner can add members' });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: 'No user with that email' });

    if (board.members.some((m) => m.toString() === userToAdd._id.toString())) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    board.members.push(userToAdd._id);
    await board.save();

    res.json({ message: `${userToAdd.name} added to board`, member: { _id: userToAdd._id, name: userToAdd.name, email: userToAdd.email } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getBoards, createBoard, getBoardById };
module.exports = { getBoards, createBoard, getBoardById, addMember };