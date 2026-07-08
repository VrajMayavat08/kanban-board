const express = require('express');
const router = express.Router();
const { getBoards, createBoard, getBoardById } = require('../controllers/boardController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getBoards).post(protect, createBoard);
router.route('/:id').get(protect, getBoardById);

module.exports = router;