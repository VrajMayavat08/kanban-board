const express = require('express');
const router = express.Router();
const { createCard, updateCard } = require('../controllers/cardController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createCard);
router.route('/:id').put(protect, updateCard);

module.exports = router;