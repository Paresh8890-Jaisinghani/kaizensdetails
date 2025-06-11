const mongoose = require('mongoose');

const kaizenSchema = new mongoose.Schema({
    Plant: String,
    Kaizen_Department: String,
    Kaizen_For_Cell: String,
    Kaizen_Source: String,
    Result_Area: String,
    Kaizen_Title: String,
    Present_Problem: String,
    Kaizen_Suggestion: String,
    image: { type: String }, // original image
    updatedImage: { type: String }, // new image after implementation
    username: String,
    company : String,
    status: String,
    annualSavings: String,
    benefits: { type: [String], default: [] }, // Changed from String to Array of Strings
    impact: String,
    implementationCost: String,
    implementedAction: String,
    teamMembers: String,
    createdAt: { type: Date, default: Date.now }, 
    updatedAt: { type: Date, default: Date.now }
});

const Kaizen = mongoose.model('Kaizen', kaizenSchema);

module.exports = Kaizen;