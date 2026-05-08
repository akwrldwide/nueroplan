require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Environment variable validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error(`ERROR: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Basic logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const courseRoutes = require('./routes/courseRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const planRoutes = require('./routes/planRoutes');
const quizRoutes = require('./routes/quizRoutes');
const progressRoutes = require('./routes/progressRoutes');
const topicRoutes = require('./routes/topicRoutes');
const mistakeRoutes = require('./routes/mistakeRoutes');
const aiRoutes = require('./routes/aiRoutes');
const academicRoutes = require('./routes/academicRoutes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/mistakes', mistakeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/academic', academicRoutes);

app.get("/", (req, res) => {
  res.send("Nueroplan API is running 🚀");
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Service is healthy' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Nuero Plan API is running' });
});

// Basic error handling middleware
app.use((err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
