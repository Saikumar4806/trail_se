const ItemModel = require('../models/itemModel');

const itemController = {
  createItem: async (req, res) => {
    try {
      const { name, price, category, quantity, image_url } = req.body;
      
      if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Name and price are required' });
      }

      await ItemModel.create({ name, price, category, quantity, image_url });
      res.status(201).json({ success: true, message: 'Item created successfully' });
    } catch (error) {
      console.error('Error creating item:', error);
      res.status(500).json({ success: false, message: 'Server error creating item' });
    }
  },

  getAllItems: async (req, res) => {
    try {
      const items = await ItemModel.findAll();
      res.status(200).json({ success: true, data: items });
    } catch (error) {
      console.error('Error fetching items:', error);
      res.status(500).json({ success: false, message: 'Server error fetching items' });
    }
  },

  getItemById: async (req, res) => {
    try {
      const item = await ItemModel.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }
      res.status(200).json({ success: true, data: item });
    } catch (error) {
      console.error('Error fetching item:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  updateItem: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, category, quantity, image_url } = req.body;

      if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Name and price are required' });
      }

      const item = await ItemModel.findById(id);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      await ItemModel.update(id, { name, price, category, quantity, image_url });
      res.status(200).json({ success: true, message: 'Item updated successfully' });
    } catch (error) {
      console.error('Error updating item:', error);
      res.status(500).json({ success: false, message: 'Server error updating item' });
    }
  },

  deleteItem: async (req, res) => {
    try {
      const { id } = req.params;
      const item = await ItemModel.findById(id);
      
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      await ItemModel.delete(id);
      res.status(200).json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).json({ success: false, message: 'Server error deleting item' });
    }
  }
};

module.exports = itemController;
