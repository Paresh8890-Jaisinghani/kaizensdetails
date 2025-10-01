const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Kaizenmodel = require('./kaizenmodel.js');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');
const multer = require('multer');
const NodeCache = require('node-cache');

const PORT1 = process.env.PORT1 || 3002;
const URL2 = process.env.URL2;

const app = express();
app.use(cors());
app.use(express.json());

// Setup cache (no expiry – we will manually manage updates)
const kaizenCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

// Multer storage for cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'kaizen_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});
const upload = multer({ storage });

// Connect DB
mongoose.connect(URL2, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log("Error while connecting:", err.message));


// ------------------ ROUTES ------------------ //

// Add new Kaizen (POST)
app.post('/kaizendetail', upload.single('image'), async (req, res) => {
    try {
        const newKaizenData = {
            ...req.body,
            createdAt: new Date(),
            image: req.file ? req.file.path : '',
        };

        const newKaizen = await Kaizenmodel.create(newKaizenData);

        // Save in cache
        kaizenCache.set(newKaizen._id.toString(), newKaizen.toObject());
        // Also update "all" cache if it exists
        let allKaizens = kaizenCache.get("all");
        if (allKaizens) {
            allKaizens.push(newKaizen.toObject());
            kaizenCache.set("all", allKaizens);
        }

        res.status(201).json({
            success: true,
            message: "Kaizen detail added successfully",
            data: newKaizen,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to add Kaizen detail", error: error.message });
    }
});


// Get all Kaizen entries (GET)
app.get('/kaizenfilled', async (req, res) => {
    try {
        let kaizens = kaizenCache.get("all");

        if (!kaizens) {
            kaizens = await Kaizenmodel.find().lean();
            kaizenCache.set("all", kaizens);
        }

        res.json({ success: true, data: kaizens });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch Kaizen entries", error: err.message });
    }
});


// Get single Kaizen (GET by ID)
app.get('/kaizenfilled/:id', async (req, res) => {
    try {
        const { id } = req.params;

        let kaizen = kaizenCache.get(id);

        if (!kaizen) {
            kaizen = await Kaizenmodel.findById(id).lean();
            if (!kaizen) {
                return res.status(404).json({ message: 'Kaizen not found' });
            }
            kaizenCache.set(id, kaizen);
        }

        res.status(200).json({ data: kaizen });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


// Update Kaizen (PUT by ID)
app.put('/kaizenfilled/:id', upload.single('updatedImage'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (req.file) {
            updateData.updatedImage = req.file.path;
        }

        if (updateData.status === "Implemented") {
            updateData.updatedAt = new Date();
        }

        const updatedKaizen = await Kaizenmodel.findByIdAndUpdate(id, updateData, { new: true }).lean();

        if (!updatedKaizen) {
            return res.status(404).send({ error: 'Kaizen not found.' });
        }

        // Update in cache
        kaizenCache.set(id, updatedKaizen);

        // Also update in "all" cache if exists
        let allKaizens = kaizenCache.get("all");
        if (allKaizens) {
            allKaizens = allKaizens.map(k => k._id.toString() === id ? updatedKaizen : k);
            kaizenCache.set("all", allKaizens);
        }

        res.status(200).send(updatedKaizen);
    } catch (error) {
        console.error('Error updating Kaizen:', error);
        res.status(500).send({ error: 'Internal Server Error.' });
    }
});


// Example for updating only status
app.put('/kaizenfilled/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedKaizen = await Kaizenmodel.findByIdAndUpdate(id, { status }, { new: true }).lean();

        if (!updatedKaizen) {
            return res.status(404).json({ message: "Kaizen not found" });
        }

        // Update cache
        kaizenCache.set(id, updatedKaizen);

        let allKaizens = kaizenCache.get("all");
        if (allKaizens) {
            allKaizens = allKaizens.map(k => k._id.toString() === id ? updatedKaizen : k);
            kaizenCache.set("all", allKaizens);
        }

        res.status(200).json({ success: true, data: updatedKaizen });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating status", error: error.message });
    }
});


// ------------------ START ------------------ //
app.listen(PORT1, () => console.log(`🚀 Server running on PORT ${PORT1}`));
