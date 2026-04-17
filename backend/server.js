require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve the beautiful glassmorphism frontend statically
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Database Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindsentinel";

mongoose.connect(MONGODB_URI)
  .then(() => console.log(`Connected to MongoDB Database: ${MONGODB_URI.split('@').pop()}`)) // safely log URI
  .catch((err) => console.error('Database connection error:', err));

const RecordSchema = new mongoose.Schema({
  sleep: Number,
  work: Number,
  stress: Number,
  mood: Number,
  clarity: Number,
  eating: String,
  score: Number,
  riskLevel: String,
  date: { type: Date, default: Date.now }
});

const Record = mongoose.model('Record', RecordSchema);

// Core Burnout API logic
app.post('/api/burnout', async (req, res) => {
    const { sleep, work, mood, stress, clarity, eating } = req.body;
    
    const sleepHours = parseFloat(sleep) || 7;
    const workHours = parseFloat(work) || 8;
    const moodScore = parseFloat(mood) || 8;
    const clarityScore = parseFloat(clarity) || 7;
    const stressScore = parseFloat(stress) || (10 - moodScore);

    let score = 0;

    // Advanced scoring algorithm
    let sleepPenalty = Math.max(0, (8 - sleepHours) * 12);
    let workPenalty = Math.max(0, (workHours - 8) * 8);
    let mentalPenalty = (10 - moodScore) * 5 + (10 - clarityScore) * 5;
    let dietPenalty = (eating === 'Skipping Meals' ? 15 : (eating === 'Irregular' ? 8 : 0));

    score = Math.min(100, Math.max(0, sleepPenalty + workPenalty + mentalPenalty + dietPenalty));
    score = Math.round(score);

    let riskLevel = "low";
    let resultMsg = "";

    if (score > 75) {
        resultMsg = "High Burnout Risk! Your metrics suggest critical fatigue.";
        riskLevel = "high";
    } else if (score > 40) {
        resultMsg = "Medium Risk. Focus might drift. Balance is key.";
        riskLevel = "medium";
    } else {
        resultMsg = "Low Risk. Your balance is great!";
        riskLevel = "low";
    }

    try {
        const newRecord = new Record({ 
            sleep: sleepHours, 
            work: workHours, 
            stress: stressScore, 
            mood: moodScore, 
            clarity: clarityScore,
            eating,
            score, 
            riskLevel 
        });
        await newRecord.save();
        res.json({ success: true, result: resultMsg, riskLevel, score });
    } catch (error) {
        console.error("Error saving record:", error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// API endpoint to retrieve latest dashboard metrics
app.get('/api/records', async (req, res) => {
    try {
        const records = await Record.find().sort({date: -1}).limit(1);
        if (records.length > 0) {
            res.json({ success: true, record: records[0] });
        } else {
            res.json({ success: true, record: null });
        }
    } catch(err) {
        res.status(500).json({ success: false, error: "Database error" });
    }
});

app.listen(PORT, () => {
    console.log(`Burnout & Focus Guardian API live on http://localhost:${PORT}`);
});
