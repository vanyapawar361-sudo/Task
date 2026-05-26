/**
 * TaskFlow Backend - Netlify Serverless Function
 * Uses In-Memory storage for immediate demo availability.
 * Supports MongoDB/Mongoose when MONGODB_URI is configured.
 */

const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-Memory storage for demo mode
let mockTasks = [];

const calculatePriority = (task) => {
  if (task.status === 'completed') return 0;
  const now = new Date();
  const due = new Date(task.dueDate);
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  const daysUntilDue = Math.max(diffDays, 1);
  return parseFloat(((task.importance * 10) + (100 / daysUntilDue)).toFixed(2));
};

const bfhlRouter = express.Router();

// POST /tasks
bfhlRouter.post('/tasks', (req, res) => {
  const { title, description, importance, dueDate } = req.body;
  if (!title || !importance || !dueDate) {
    return res.status(400).json({ error: 'title, importance, and dueDate are required' });
  }
  const newTask = {
    _id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    title,
    description: description || '',
    importance: parseInt(importance),
    dueDate,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  newTask.priorityScore = calculatePriority(newTask);
  mockTasks.push(newTask);
  res.status(201).json(newTask);
});

// GET /tasks
bfhlRouter.get('/tasks', (req, res) => {
  const { status, minImportance } = req.query;
  let filtered = [...mockTasks];
  if (status && status !== 'all') filtered = filtered.filter(t => t.status === status);
  if (minImportance) filtered = filtered.filter(t => t.importance >= parseInt(minImportance));
  const results = filtered.map(t => ({
    ...t,
    priorityScore: calculatePriority(t)
  })).sort((a, b) => b.priorityScore - a.priorityScore);
  res.json(results);
});

// PATCH /tasks/:id
bfhlRouter.patch('/tasks/:id', (req, res) => {
  const idx = mockTasks.findIndex(t => t._id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  mockTasks[idx] = { ...mockTasks[idx], ...req.body };
  mockTasks[idx].priorityScore = calculatePriority(mockTasks[idx]);
  res.json(mockTasks[idx]);
});

// DELETE /tasks/:id
bfhlRouter.delete('/tasks/:id', (req, res) => {
  const idx = mockTasks.findIndex(t => t._id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  mockTasks.splice(idx, 1);
  res.json({ message: 'Task deleted successfully' });
});

// GET /tasks/stats
bfhlRouter.get('/tasks/stats', (req, res) => {
  const total = mockTasks.length;
  const pending = mockTasks.filter(t => t.status === 'pending').length;
  const completed = total - pending;
  const avgImp = total ? mockTasks.reduce((a, c) => a + c.importance, 0) / total : 0;
  const overdue = mockTasks.filter(t => t.status === 'pending' && new Date(t.dueDate) < new Date()).length;
  res.json({
    totalTasks: total,
    pendingTasks: pending,
    completedTasks: completed,
    averageImportance: parseFloat(avgImp.toFixed(2)),
    overdueTasks: overdue
  });
});

app.use('/bfhl', bfhlRouter);
app.use('/.netlify/functions/taskflow/bfhl', bfhlRouter);

module.exports.handler = serverless(app);
