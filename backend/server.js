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
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://user:pass@cluster0.exuvz.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Database'))
  .catch((err) => console.error('Database connection error:', err));

const RecordSchema = new mongoose.Schema({
  sleep: Number,
  work: Number,
  stress: Number,
  score: Number,
  riskLevel: String,
  date: { type: Date, default: Date.now }
});

const Record = mongoose.model('Record', RecordSchema);

// Core Burnout API logic
app.post('/api/burnout', async (req, res) => {
    const { sleep, work, mood, stress } = req.body;
    
    // Support either mood or stress field to be backward compatible with previous frontend logic
    const sleepHours = parseFloat(sleep) || 7;
    const workHours = parseFloat(work) || 5;
    const moodScore = parseInt(mood);
    const stressScore = parseFloat(stress) || (moodScore ? (5 - moodScore + 3) : 4);

    let resultMsg = "";
    let riskLevel = "low"; 
    let score = 20;

    // Smart scoring algorithm
    let sleepPenalty = Math.max(0, (8 - sleepHours) * 10);
    let workPenalty = Math.max(0, (workHours - 5) * 6);
    let stressPenalty = (stressScore - 3) * 4;

    score = Math.min(100, Math.max(0, sleepPenalty + workPenalty + stressPenalty));
    score = Math.round(score);

    if (score > 75) {
        resultMsg = "High Burnout Risk! Your metrics suggest critical fatigue. Take rest immediately.";
        riskLevel = "high";
    } else if (score > 40) {
        resultMsg = "Medium Risk. Focus might drift. Schedule short stretching breaks.";
        riskLevel = "medium";
    } else {
        resultMsg = "Low Risk. Your balance is great, you are in a flow state!";
        riskLevel = "low";
    }

    try {
        const newRecord = new Record({ sleep: sleepHours, work: workHours, stress: stressScore, score, riskLevel });
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
