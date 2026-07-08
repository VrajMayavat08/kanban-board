const express = require('express');
const router = express.Router();
const { createList } = require('../controllers/listController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createList);

module.exports = router;