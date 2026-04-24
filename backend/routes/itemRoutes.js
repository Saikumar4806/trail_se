const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const uploadItemImage = require('../middleware/upload');

const handleImageUpload = (req, res, next) => {
	uploadItemImage.single('image')(req, res, (err) => {
		if (!err) {
			return next();
		}

		return res.status(400).json({
			success: false,
			message: err.message || 'Invalid image upload.'
		});
	});
};

// Define routes for /api/items
router.post('/', handleImageUpload, itemController.createItem);
router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);
router.put('/:id', handleImageUpload, itemController.updateItem);
router.delete('/:id', itemController.deleteItem);

module.exports = router;
