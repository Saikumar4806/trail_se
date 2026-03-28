const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

// Define routes for /api/items
router.post('/', itemController.createItem);
router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);
router.put('/:id', itemController.updateItem);
router.delete('/:id', itemController.deleteItem);

module.exports = router;
