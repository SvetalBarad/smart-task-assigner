import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/project.js';
import taskRoutes from './routes/task.js';
import memberRoutes from './routes/member.js';
import notificationRoutes from './routes/notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Allow the Vite dev server (port 8080) and direct browser access
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
}));
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});
