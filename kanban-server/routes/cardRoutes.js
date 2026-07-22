const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createCard, updateCard, deleteCard } = require('../controllers/cardController');

router.route('/').post(protect, createCard);
router.route('/:id').put(protect, updateCard).delete(protect, deleteCard);

module.exports = router;