require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mindsentinel-secret-123';

app.use(cors());
app.use(express.json());

// Serve the beautiful glassmorphism frontend statically
app.use(express.static(path.join(__dirname, '../frontend')));

// MongoDB Database Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mindsentinel";

mongoose.connect(MONGODB_URI)
  .then(() => console.log(`Connected to MongoDB Database: ${MONGODB_URI.split('@').pop()}`)) // safely log URI
  .catch((err) => console.error('Database connection error:', err));

// --- MODELS ---

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

const RecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sleep: Number,
  quality: Number,
  energy: Number,
  work: Number,
  stress: Number,
  mood: Number,
  clarity: Number,
  eating: String,
  score: Number,
  riskLevel: String,
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Record = mongoose.model('Record', RecordSchema);

// --- AUTH ENDPOINTS ---

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        res.json({ success: true, message: "User registered successfully" });
    } catch (err) {
        res.status(400).json({ success: false, error: "Email already exists" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: "Invalid password" });

    const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: { name: user.name, email: user.email } });
});

app.post('/api/auth/change-password', async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, error: "Incorrect old password" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password updated" });
});

// Core Burnout API logic
app.post('/api/burnout', async (req, res) => {
    const { userId, sleep, quality, energy, work, mood, stress, clarity, eating } = req.body;
    
    // Normalize and provide defaults
    const s = parseFloat(sleep) || 7;
    const q = parseFloat(quality) || 8;
    const e = parseFloat(energy) || 8;
    const m = parseFloat(mood) || 8;
    const c = parseFloat(clarity) || 7;
    const w = parseFloat(work) || 8;
    const str = parseFloat(stress) || (10 - e);

    // Advanced scoring algorithm (0-100, where 100 is high burnout/risk)
    // Positive factors (reduce score)
    let sleepFactor = (s / 12) * 20 + (q / 10) * 15;
    let mentalFactor = (m / 10) * 15 + (c / 10) * 15 + (e / 10) * 15;
    
    // Negative factors (increase score)
    let workPenalty = Math.max(0, (w - 8) * 10);
    let dietPenalty = (eating === 'Skipping Meals' ? 15 : (eating === 'Irregular' ? 8 : 0));

    // Base score calculation
    let healthIndex = sleepFactor + mentalFactor; // Max healthIndex is 80
    let burnoutScore = 100 - healthIndex + workPenalty + dietPenalty;

    // Constrain score
    let score = Math.min(100, Math.max(0, Math.round(burnoutScore)));

    let riskLevel = "low";
    let resultMsg = "";

    if (score > 70) {
        resultMsg = "High Burnout Risk! Critical fatigue detected.";
        riskLevel = "high";
    } else if (score > 40) {
        resultMsg = "Medium Risk. Balance is shifting. Caution recommended.";
        riskLevel = "medium";
    } else {
        resultMsg = "Low Risk. Your cognitive state is optimized.";
        riskLevel = "low";
    }

    try {
        const newRecord = new Record({ 
            userId,
            sleep: s, 
            quality: q, 
            energy: e,
            work: w, 
            stress: str, 
            mood: m, 
            clarity: c,
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

// API endpoint to retrieve recent dashboard metrics
app.get('/api/records', async (req, res) => {
    const { userId } = req.query;
    try {
        const query = userId ? { userId } : {};
        const records = await Record.find(query).sort({date: -1}).limit(10);
        res.json({ success: true, records });
    } catch(err) {
        res.status(500).json({ success: false, error: "Database error" });
    }
});

app.listen(PORT, () => {
    console.log(`Burnout & Focus Guardian API live on http://localhost:${PORT}`);
});
