/**
 * TaskFlow Intelligent Backend (Supabase Version)
 * ---------------------------------------------
 * This version uses Supabase (PostgreSQL) for maximum reliability
 * and zero-configuration setup for the user.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase Configuration
const supabaseUrl = 'https://crsujmshdirlltzjssxx.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyc3VqbXNoZGlybGx0empzc3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjUyNzcsImV4cCI6MjA5NTM0MTI3N30.FwupLOg2nN36hYFWNWOc4ESQEjNswxO0Mh5f7boN3Lc';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// Helper for priority score calculation
const calculatePriority = (task) => {
  if (task.status === 'completed') return 0;
  const now = new Date();
  const due = new Date(task.due_date);
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  const daysUntilDue = Math.max(diffDays, 1);
  return parseFloat(((task.importance * 10) + (100 / daysUntilDue)).toFixed(2));
};

const bfhlRouter = express.Router();

// 1. POST /tasks - Create task
bfhlRouter.post('/tasks', async (req, res) => {
  const { title, description, importance, dueDate } = req.body;
  const { data, error } = await supabase
    .from('tasks')
    .insert([{ title, description, importance, due_date: dueDate }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ ...data[0], _id: data[0].id, dueDate: data[0].due_date });
});

// 2. GET /tasks - List tasks with priority sorting
bfhlRouter.get('/tasks', async (req, res) => {
  const { status, minImportance } = req.query;
  let query = supabase.from('tasks').select('*');
  
  if (status && status !== 'all') query = query.eq('status', status);
  if (minImportance) query = query.gte('importance', parseInt(minImportance));

  const { data, error } = await supabase.from('tasks').select('*');
  if (error) return res.status(500).json({ error: error.message });

  // Map and sort in memory for the priority score logic
  const tasksWithScores = data.map(t => ({
    ...t,
    _id: t.id,
    dueDate: t.due_date,
    priorityScore: calculatePriority(t)
  })).sort((a, b) => b.priorityScore - a.priorityScore);

  res.json(tasksWithScores);
});

// 3. PATCH /tasks/:id - Update status
bfhlRouter.patch('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Map camelCase to snake_case if necessary
  if (updates.dueDate) {
    updates.due_date = updates.dueDate;
    delete updates.dueDate;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ...data[0], _id: data[0].id, dueDate: data[0].due_date });
});

// 4. DELETE /tasks/:id
bfhlRouter.delete('/tasks/:id', async (req, res) => {
  const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted' });
});

// 5. GET /tasks/stats
bfhlRouter.get('/tasks/stats', async (req, res) => {
  const { data, error } = await supabase.from('tasks').select('*');
  if (error) return res.status(500).json({ error: error.message });

  const total = data.length;
  const pending = data.filter(t => t.status === 'pending').length;
  const completed = total - pending;
  const avgImp = total ? (data.reduce((acc, curr) => acc + curr.importance, 0) / total) : 0;
  const overdue = data.filter(t => t.status === 'pending' && new Date(t.due_date) < new Date()).length;

  res.json({
    totalTasks: total,
    pendingTasks: pending,
    completedTasks: completed,
    averageImportance: parseFloat(avgImp.toFixed(2)),
    overdueTasks: overdue
  });
});

app.use('/bfhl', bfhlRouter);

const serverless = require('serverless-http');
module.exports.handler = serverless(app);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
