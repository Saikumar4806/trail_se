const fs = require('fs');
const path = require('path');
const ItemModel = require('../models/itemModel');

const ITEM_UPLOAD_PREFIX = '/uploads/items/';
const ITEM_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'items');

const buildUploadedImageUrl = (req, fileName) => (
  `${req.protocol}://${req.get('host')}${ITEM_UPLOAD_PREFIX}${fileName}`
);

const getManagedUploadFileName = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null;
  }

  try {
    const parsed = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
      ? new URL(imageUrl)
      : { pathname: imageUrl };

    if (!parsed.pathname || !parsed.pathname.startsWith(ITEM_UPLOAD_PREFIX)) {
      return null;
    }

    return path.basename(parsed.pathname);
  } catch (error) {
    return null;
  }
};

const removeUploadedFileByName = (fileName) => {
  if (!fileName) {
    return;
  }

  const filePath = path.join(ITEM_UPLOAD_DIR, path.basename(fileName));
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Error removing item image file:', err);
    }
  });
};

const removeManagedUploadByUrl = (imageUrl) => {
  const fileName = getManagedUploadFileName(imageUrl);
  removeUploadedFileByName(fileName);
};

const itemController = {
  createItem: async (req, res) => {
    try {
      const { name, price, unit, category, quantity, quantity_unit, image_url } = req.body;
      const uploadedImageUrl = req.file
        ? buildUploadedImageUrl(req, req.file.filename)
        : (typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null);
      
      if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Name and price are required' });
      }

      await ItemModel.create({
        name,
        price,
        unit,
        category,
        quantity,
        quantity_unit,
        image_url: uploadedImageUrl
      });
      res.status(201).json({ success: true, message: 'Item created successfully' });
    } catch (error) {
      console.error('Error creating item:', error);
      if (req.file) {
        removeUploadedFileByName(req.file.filename);
      }
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
      const { name, price, unit, category, quantity, quantity_unit, image_url, existing_image_url } = req.body;

      if (!name || !price) {
        return res.status(400).json({ success: false, message: 'Name and price are required' });
      }

      const item = await ItemModel.findById(id);
      if (!item) {
        if (req.file) {
          removeUploadedFileByName(req.file.filename);
        }
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      let nextImageUrl = item.image_url || null;

      if (req.file) {
        nextImageUrl = buildUploadedImageUrl(req, req.file.filename);
        if (item.image_url && item.image_url !== nextImageUrl) {
          removeManagedUploadByUrl(item.image_url);
        }
      } else if (typeof existing_image_url === 'string') {
        nextImageUrl = existing_image_url.trim() || null;
      } else if (typeof image_url === 'string') {
        nextImageUrl = image_url.trim() || null;
      }

      await ItemModel.update(id, {
        name,
        price,
        unit,
        category,
        quantity,
        quantity_unit,
        image_url: nextImageUrl
      });
      res.status(200).json({ success: true, message: 'Item updated successfully' });
    } catch (error) {
      console.error('Error updating item:', error);
      if (req.file) {
        removeUploadedFileByName(req.file.filename);
      }
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
      removeManagedUploadByUrl(item.image_url);
      res.status(200).json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting item:', error);
      res.status(500).json({ success: false, message: 'Server error deleting item' });
    }
  }
};

module.exports = itemController;
