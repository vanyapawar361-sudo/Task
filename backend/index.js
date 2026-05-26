/**
 * TaskFlow Intelligent Backend (MongoDB with In-Memory Fallback)
 * -----------------------------------------------------------
 * This version uses MongoDB/Mongoose by default.
 * If MONGODB_URI is missing, it gracefully falls back to an In-Memory 
 * data store to allow immediate testing and demonstration.
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// DATABASE STRATEGY: MongoDB with In-Memory Mock Fallback
// ---------------------------------------------------------
let useMock = false;
let mockTasks = []; // Persistence for the session if MongoDB is absent

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Successfully connected to MongoDB Cluster'))
    .catch(err => {
      console.error('MongoDB connection failed. Switching to Emergency In-Memory Mode.');
      useMock = true;
    });
} else {
  console.log('No MONGODB_URI detected. Running in In-Memory Demo Mode.');
  useMock = true;
}

// Model fallback schema behavior
const calculatePriority = (task) => {
  if (task.status === 'completed') return 0;
  const now = new Date();
  const due = new Date(task.dueDate || task.due_date);
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  const daysUntilDue = Math.max(diffDays, 1);
  return parseFloat(((task.importance * 10) + (100 / daysUntilDue)).toFixed(2));
};

// ---------------------------------------------------------
// API ROUTES
// ---------------------------------------------------------
const bfhlRouter = express.Router();

// 1. POST /tasks
bfhlRouter.post('/tasks', async (req, res) => {
  if (useMock) {
    const newTask = { 
      ...req.body, 
      _id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      status: 'pending'
    };
    mockTasks.push(newTask);
    return res.status(201).json(newTask);
  }
  
  try {
    const Task = require('./models/Task');
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. GET /tasks
bfhlRouter.get('/tasks', async (req, res) => {
  const { status, minImportance } = req.query;
  
  if (useMock) {
    let filtered = [...mockTasks];
    if (status && status !== 'all') filtered = filtered.filter(t => t.status === status);
    if (minImportance) filtered = filtered.filter(t => t.importance >= parseInt(minImportance));
    
    const results = filtered.map(t => ({
      ...t,
      priorityScore: calculatePriority(t)
    })).sort((a, b) => b.priorityScore - a.priorityScore);
    
    return res.json(results);
  }

  try {
    const Task = require('./models/Task');
    const tasks = await Task.find(status && status !== 'all' ? { status } : {});
    const results = tasks.map(t => {
      const taskObj = t.toObject({ virtuals: true });
      return { ...taskObj, _id: taskObj._id.toString() };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PATCH /tasks/:id
bfhlRouter.patch('/tasks/:id', async (req, res) => {
  if (useMock) {
    const index = mockTasks.findIndex(t => t._id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    mockTasks[index] = { ...mockTasks[index], ...req.body };
    return res.json(mockTasks[index]);
  }

  try {
    const Task = require('./models/Task');
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. DELETE /tasks/:id
bfhlRouter.delete('/tasks/:id', async (req, res) => {
  if (useMock) {
    mockTasks = mockTasks.filter(t => t._id !== req.params.id);
    return res.json({ message: 'Deleted' });
  }

  try {
    const Task = require('./models/Task');
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /tasks/stats
bfhlRouter.get('/tasks/stats', async (req, res) => {
  const data = useMock ? mockTasks : await require('./models/Task').find();
  
  const total = data.length;
  const pending = data.filter(t => t.status === 'pending').length;
  const completed = total - pending;
  const avgImp = total ? (data.reduce((acc, curr) => acc + curr.importance, 0) / total) : 0;
  const overdue = data.filter(t => t.status === 'pending' && new Date(t.dueDate || t.due_date) < new Date()).length;

  res.json({
    totalTasks: total,
    pendingTasks: pending,
    completedTasks: completed,
    averageImportance: parseFloat(avgImp.toFixed(2)),
    overdueTasks: overdue
  });
});

app.use('/bfhl', bfhlRouter);

// Local entry
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Backend server active on port ${PORT}`));
}

// Netlify entry
const serverless = require('serverless-http');
module.exports.handler = serverless(app);
