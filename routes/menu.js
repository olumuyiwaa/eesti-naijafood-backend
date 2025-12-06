// routes/menu.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { body, validationResult } = require('express-validator');

const MenuItem = require('../models/MenuItem');
const Counter = require('../models/Counter');

// Cloudinary config (make sure process.env vars are set)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// multer memory storage (we'll upload buffer to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// helper to get next numeric id
async function getNextSequence(name) {
    const res = await Counter.findOneAndUpdate(
        { name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return res.seq;
}

// --- GET full menu grouped ---
router.get('/', async (req, res) => {
    try {
        const items = await MenuItem.find().sort({ createdAt: 1 }).lean() || [];

        const menu = {
            starters: items.filter(i => i.category === 'starters'),
            mains: items.filter(i => i.category === 'mains'),
            sides: items.filter(i => i.category === 'sides'),
            desserts: items.filter(i => i.category === 'desserts'),
            nonAlcoholic: items.filter(i => i.category === 'nonAlcoholic'),
            alcoholic: items.filter(i => i.category === 'alcoholic'),
        };

        res.json({ success: true, menu });
    } catch (error) {
        console.error('Menu error:', error);
        res.status(500).json({ success: false, menu: {}, message: 'Failed to fetch menu' });
    }
});

// Optional: flattened list
router.get('/flat', async (req, res) => {
    try {
        const items = await MenuItem.find().sort({ createdAt: 1 }).lean();
        res.json({ success: true, items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// GET by numeric id
router.get('/item/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const item = await MenuItem.findOne({ id }).lean();
        if (!item) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, item });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// GET by category
router.get('/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const valid = ['starters','mains','sides','desserts','nonAlcoholic','alcoholic'];
        if (!valid.includes(category)) return res.status(400).json({ success: false, message: 'Invalid category' });
        const items = await MenuItem.find({ category }).lean();
        res.json({ success: true, category, items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// Create menu item (supports image upload)
router.post(
    '/',
    upload.single('image'),
    [
        body('name').notEmpty(),
        body('price').isNumeric(),
        body('category').isIn(['starters','mains','sides','desserts','nonAlcoholic','alcoholic'])
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

            const { name, description, price, category, isVegetarian, isSpicy, isAvailable } = req.body;

            // upload image if present
            let imageUrl = '';
            if (req.file) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'afroflavours/menu' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    stream.end(req.file.buffer);
                });

                imageUrl = uploadResult.secure_url;
            } else if (req.body.image) {
                imageUrl = req.body.image; // allow direct URL in body
            }

            const nextId = await getNextSequence('menuItems');

            const item = new MenuItem({
                id: nextId,
                name,
                description,
                price: Number(price),
                image: imageUrl,
                category,
                isVegetarian: !!(isVegetarian === 'true' || isVegetarian === true),
                isSpicy: !!(isSpicy === 'true' || isSpicy === true),
                isAvailable: isAvailable === undefined ? true : !!(isAvailable === 'true' || isAvailable === true),
            });

            await item.save();
            res.status(201).json({ success: true, item });
        } catch (err) {
            console.error('Create menu item error:', err);
            res.status(500).json({ success: false, message: 'Failed to create item' });
        }
    }
);

// Update menu item (supports image upload)
router.put(
    '/:id',
    upload.single('image'),
    async (req, res) => {
        try {
            const id = Number(req.params.id);
            const item = await MenuItem.findOne({ id });
            if (!item) return res.status(404).json({ success: false, message: 'Not found' });

            const {
                name, description, price, category, isVegetarian, isSpicy, isAvailable, isDishOfWeek
            } = req.body;

            // if new image file uploaded, replace
            if (req.file) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'afroflavours/menu' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    stream.end(req.file.buffer);
                });
                item.image = uploadResult.secure_url;
            } else if (req.body.image !== undefined) {
                item.image = req.body.image; // allow update via URL
            }

            if (name !== undefined) item.name = name;
            if (description !== undefined) item.description = description;
            if (price !== undefined) item.price = Number(price);
            if (category !== undefined) item.category = category;
            if (isVegetarian !== undefined) item.isVegetarian = !!(isVegetarian === 'true' || isVegetarian === true);
            if (isSpicy !== undefined) item.isSpicy = !!(isSpicy === 'true' || isSpicy === true);
            if (isAvailable !== undefined) item.isAvailable = !!(isAvailable === 'true' || isAvailable === true);

            // If the request sets isDishOfWeek true, ensure uniqueness (handled in route below if needed)
            if (isDishOfWeek !== undefined) item.isDishOfWeek = !!(isDishOfWeek === 'true' || isDishOfWeek === true);

            await item.save();
            res.json({ success: true, item });
        } catch (err) {
            console.error('Update error:', err);
            res.status(500).json({ success: false, message: 'Failed to update' });
        }
    }
);

// Delete menu item
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const removed = await MenuItem.findOneAndDelete({ id });
        if (!removed) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
});

// Toggle dish-of-week (sets selected item true and others false)
router.patch('/:id/dish-of-week', async (req, res) => {
    try {
        const id = Number(req.params.id);
        // set all to false first
        await MenuItem.updateMany({ isDishOfWeek: true }, { $set: { isDishOfWeek: false } });
        // set selected to true
        const updated = await MenuItem.findOneAndUpdate({ id }, { $set: { isDishOfWeek: true } }, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, item: updated });
    } catch (err) {
        console.error('Dish of week error:', err);
        res.status(500).json({ success: false, message: 'Failed to set dish of week' });
    }
});

module.exports = router;