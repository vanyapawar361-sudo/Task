/**
 * TaskFlow Intelligent Backend (MongoDB Version)
 * ---------------------------------------------
 * This server implements the core task management logic with
 * dynamic priority scoring using Express and Mongoose.
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB infrastructure'))
  .catch(err => console.error('CRITICAL: MongoDB connection failed ->', err));

// Routes
const bfhlRouter = express.Router();

// Helper to get priority score logic for MongoDB aggregation
const getPriorityScoreAggregation = () => {
  const now = new Date();
  return {
    $cond: {
      if: { $eq: ["$status", "completed"] },
      then: 0,
      else: {
        $add: [
          { $multiply: ["$importance", 10] },
          {
            $divide: [
              100,
              {
                $max: [
                  {
                    $floor: {
                      $divide: [
                        { $subtract: ["$dueDate", now] },
                        1000 * 60 * 60 * 24
                      ]
                    }
                  },
                  1
                ]
              }
            ]
          }
        ]
      }
    }
  };
};

/**
 * RESTful API Endpoints
 * ---------------------
 */

// 1. POST /tasks - Create task
bfhlRouter.post('/tasks', async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. GET /tasks - List tasks with dynamic priority sorting
bfhlRouter.get('/tasks', async (req, res) => {
  const { status, minImportance } = req.query;
  const filters = {};
  if (status && status !== 'all') filters.status = status;
  if (minImportance) filters.importance = { $gte: parseInt(minImportance) };

  try {
    const tasks = await Task.aggregate([
      { $match: filters },
      { $addFields: { priorityScore: getPriorityScoreAggregation() } },
      { $sort: { priorityScore: -1 } }
    ]);
    res.json(tasks.map(t => ({ ...t, _id: t._id.toString() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PATCH /tasks/:id - Update status
bfhlRouter.patch('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. DELETE /tasks/:id
bfhlRouter.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /tasks/stats - Aggregated insights
bfhlRouter.get('/tasks/stats', async (req, res) => {
  try {
    const stats = await Task.aggregate([
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                pendingTasks: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                completedTasks: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                averageImportance: { $avg: "$importance" },
                overdueTasks: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ["$status", "pending"] }, { $lt: ["$dueDate", new Date()] }] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]
        }
      },
      { $unwind: "$totals" },
      { $replaceRoot: { newRoot: "$totals" } }
    ]);

    const result = stats[0] || {
      totalTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      averageImportance: 0,
      overdueTasks: 0
    };
    
    if (result.averageImportance) {
      result.averageImportance = parseFloat(result.averageImportance.toFixed(2));
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/bfhl', bfhlRouter);

// Local entry
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Backend server active on port ${PORT}`));
}

// Netlify entry
const serverless = require('serverless-http');
module.exports.handler = serverless(app);
