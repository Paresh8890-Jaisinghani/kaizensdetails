const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Kaizenmodel = require('./kaizenmodel.js');
const path = require('path');
const PORT1 = process.env.PORT1 || 3002;
const URL2 = process.env.URL2 || "mongodb+srv://ce21btech11031:NyUkB72MBZHozIrc@cluster0.uw0xz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');



const app = express();
app.use(cors());
app.use(express.json());
// app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Setup storage engine for multer
const multer = require('multer');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'kaizen_uploads',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage });



// Connect to MongoDB
mongoose.connect(URL2, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.log("Error while connecting to database:", err.message));

// Add a new Kaizen detail
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


// Get all Kaizen entries
app.get('/kaizenfilled', async (req, res) => {
    try {
        const kaizens = await Kaizenmodel.find();
        res.json({ success: true, data: kaizens });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch Kaizen entries", error: err.message });
    }
});

// Update status of a Kaizen entry
app.put('/kaizenfilled/status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Expect status to be sent in the request body

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

// Update Kaizen details, including optional image update
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

        // Only update the 'updatedAt' field if the status is 'Implemented'
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
            updateData.updatedAt = new Date(); // Update only for the implemented Kaizen
        }

        if (benefits === 'other') {
            updateData.other = other;
        }

        if (req.file) {
            updateData.updatedImage = req.file.path;
        }

        const updatedKaizen = await Kaizenmodel.findByIdAndUpdate(id, updateData, {
            new: true,
        });

        if (!updatedKaizen) {
            return res.status(404).send({ error: 'Kaizen not found.' });
        }

        res.status(200).send(updatedKaizen);
    } catch (error) {
        console.error('Error updating Kaizen:', error);
        res.status(500).send({ error: 'Internal Server Error.' });
    }
});

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

        if (!updatedKaizen) {
            return res.status(404).json({ message: "Kaizen not found" });
        }

        res.status(200).json({
            success: true,
            message: "Impact updated successfully",
            data: updatedKaizen,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating impact",
            error: error.message,
        });
    }
});




// Get a single Kaizen entry
app.get('/kaizenfilled/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const suggestion = await Kaizenmodel.findById(id);
        if (!suggestion) {
            return res.status(404).json({ message: 'Kaizen not found' });
        }
        res.status(200).json({ data: suggestion });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Start server

app.listen(PORT1, () => console.log(`Server is running on PORT ${PORT1}`));