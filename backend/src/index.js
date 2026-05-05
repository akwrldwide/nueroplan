require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

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

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Nuero Plan API is running' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
