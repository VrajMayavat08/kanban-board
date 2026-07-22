const express = require('express');
const router = express.Router();
const { createList, deleteList } = require('../controllers/listController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createList);
router.route('/:id').delete(protect, deleteList);

module.exports = router;