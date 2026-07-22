const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getBoards, createBoard, getBoardById, addMember } = require('../controllers/boardController');

router.route('/').get(protect, getBoards).post(protect, createBoard);
router.route('/:id').get(protect, getBoardById);
router.route('/:id/members').post(protect, addMember);

module.exports = router;