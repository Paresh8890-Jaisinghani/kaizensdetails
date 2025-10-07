require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Kaizenmodel = require('./kaizenmodel.js');
const path = require('path');
const NodeCache = require('node-cache'); // Added node-cache
const PORT1 = process.env.PORT1 || 3002;
const URL2 = process.env.URL2

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const app = express();
app.use(cors());
app.use(express.json());

const multer = require('multer');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'kaizen_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage });

// Initialize cache
const kaizenCache = new NodeCache({ stdTTL: 0, checkperiod: 0 });

// Connect to MongoDB
mongoose.connect(URL2, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log("Error while connecting to database:", err.message));

// POST: Add a new Kaizen detail
app.post('/kaizendetail', upload.single('image'), async (req, res) => {
    try {
        const newKaizenData = {
            ...req.body,
            username: req.body.username,
            company: req.body.company,
            createdAt: new Date(),
            image: req.file ? req.file.path : '',
        };

        const newKaizen = await Kaizenmodel.create(newKaizenData);

        // Update cache if it exists
        const cachedKaizens = kaizenCache.get("allKaizens");
        if (cachedKaizens) {
            kaizenCache.set("allKaizens", [...cachedKaizens, newKaizen]);
        }

        res.status(201).json({
            success: true,
            message: "Kaizen detail added successfully",
            data: newKaizen,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to add Kaizen detail",
            error: error.message,
        });
    }
});

// GET: All Kaizen entries
app.get('/kaizenfilled', async (req, res) => {
    try {
        let kaizens = kaizenCache.get("allKaizens");
        if (!kaizens) {
            kaizens = await Kaizenmodel.find();
            kaizenCache.set("allKaizens", kaizens);
        }
        res.json({ success: true, data: kaizens });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch Kaizen entries", error: err.message });
    }
});

// PUT: Update status of a Kaizen entry
app.put('/kaizenfilled/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        const updatedKaizen = await Kaizenmodel.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedKaizen) {
            return res.status(404).json({ message: "Kaizen not found" });
        }

        // Update cache if it exists
        const cachedKaizens = kaizenCache.get("allKaizens");
        if (cachedKaizens) {
            const index = cachedKaizens.findIndex(k => k._id.toString() === id);
            if (index !== -1) {
                cachedKaizens[index] = updatedKaizen;
                kaizenCache.set("allKaizens", cachedKaizens);
            }
        }

        res.status(200).json({
            success: true,
            message: "Status updated successfully",
            data: updatedKaizen,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating status",
            error: error.message,
        });
    }
});

// PUT: Update Kaizen details (original logic intact)
app.put('/kaizenfilled/:id', upload.single('updatedImage'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            teamMembers,
            implementationCost,
            annualSavings,
            implementedAction,
            impact,
            benefits,
            status,
            other,
        } = req.body;

        const updateData = {
            teamMembers,
            implementationCost,
            annualSavings,
            implementedAction,
            impact,
            benefits,
            status
        };

        if (status === "Implemented") {
            updateData.updatedAt = new Date();
        }

        if (benefits === 'other') {
            updateData.other = other;
        }

        if (req.file) {
            updateData.updatedImage = req.file.path;
        }

        const updatedKaizen = await Kaizenmodel.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedKaizen) {
            return res.status(404).send({ error: 'Kaizen not found.' });
        }

        // Update cache if it exists
        const cachedKaizens = kaizenCache.get("allKaizens");
        if (cachedKaizens) {
            const index = cachedKaizens.findIndex(k => k._id.toString() === id);
            if (index !== -1) {
                cachedKaizens[index] = updatedKaizen;
                kaizenCache.set("allKaizens", cachedKaizens);
            }
        }

        res.status(200).send(updatedKaizen);
    } catch (error) {
        console.error('Error updating Kaizen:', error);
        res.status(500).send({ error: 'Internal Server Error.' });
    }
});

// Other PUT routes remain unchanged, just add cache update logic similar to above
app.put('/kaizenfilled/impact/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { impact } = req.body;

        if (!impact) {
            return res.status(400).json({ message: "Impact field is required" });
        }

        const updatedKaizen = await Kaizenmodel.findByIdAndUpdate(
            id,
            { impact },
            { new: true }
        );

        if (!updatedKaizen) return res.status(404).json({ message: "Kaizen not found" });

        // Update cache
        const cachedKaizens = kaizenCache.get("allKaizens");
        if (cachedKaizens) {
            const index = cachedKaizens.findIndex(k => k._id.toString() === id);
            if (index !== -1) {
                cachedKaizens[index] = updatedKaizen;
                kaizenCache.set("allKaizens", cachedKaizens);
            }
        }

        res.status(200).json({ success: true, message: "Impact updated successfully", data: updatedKaizen });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating impact", error: error.message });
    }
});

app.put('/kaizenfilled/benefitscore/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { benefitscore } = req.body;

        if (!benefitscore) {
            return res.status(400).json({ message: "benefitscore field is required" });
        }

        const updatedKaizen = await Kaizenmodel.findByIdAndUpdate(
            id,
            { benefitscore },
            { new: true }
        );

        if (!updatedKaizen) return res.status(404).json({ message: "Kaizen not found" });

        // Update cache
        const cachedKaizens = kaizenCache.get("allKaizens");
        if (cachedKaizens) {
            const index = cachedKaizens.findIndex(k => k._id.toString() === id);
            if (index !== -1) {
                cachedKaizens[index] = updatedKaizen;
                kaizenCache.set("allKaizens", cachedKaizens);
            }
        }

        res.status(200).json({ success: true, message: "benefitscore updated successfully", data: updatedKaizen });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating benefitscore", error: error.message });
    }
});

// GET single Kaizen remains unchanged
app.get('/kaizenfilled/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const suggestion = await Kaizenmodel.findById(id);
        if (!suggestion) return res.status(404).json({ message: 'Kaizen not found' });
        res.status(200).json({ data: suggestion });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Start server
app.listen(PORT1, () => console.log(`Server is running on PORT ${PORT1}`));
