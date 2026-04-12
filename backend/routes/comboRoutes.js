const express = require('express');
const router = express.Router();
const comboController = require('../controllers/comboController');

router.post('/combo-items', comboController.createComboItems);

module.exports = router;
