/**
 * TaskFlow Intelligent Backend
 * ----------------------------
 * This server handles task management with a dynamic priority calculation.
 * The priority score is computed on-the-fly to ensure it always reflects
 * the current time relative to the due date.
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 5000;

// Standard middleware for API security and parsing
app.use(cors());
app.use(express.json());

// Establish connection to MongoDB instance
// Note: Ensure MONGODB_URI is set in your .env file
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB infrastructure'))
  .catch(err => console.error('CRITICAL: MongoDB connection failed ->', err));

// Routes
const bfhlRouter = express.Router();

/**
 * Generates the MongoDB Aggregation expression for the priority score.
 * Formula: (importance * 10) + (100 / max(daysUntilDue, 1))
 * 
 * We use $floor to count full days and $max to prevent division by zero.
 */
const getPriorityScoreAggregation = () => {
  const now = new Date();
  return {
    $cond: {
      if: { $eq: ["$status", "completed"] },
      then: 0, // Completed tasks naturally lose priority
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
                        1000 * 60 * 60 * 24 // Convert ms difference to days
                      ]
                    }
                  },
                  1 // Minimum 1 day to handle same-day or overdue logic safely
                ]
              }
            ]
          }
        ]
      }
    }
  };
};

// 1. POST /bfhl/tasks - Create a new task
bfhlRouter.post('/tasks', async (req, res) => {
  try {
    const { title, description, importance, dueDate } = req.body;
    
    // Basic validation for dates
    if (new Date(dueDate) <= new Date()) {
      return res.status(400).json({ error: 'Due date must be in the future' });
    }

    const task = new Task({
      title,
      description,
      importance,
      dueDate
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. GET /bfhl/tasks - List all tasks sorted by priorityScore DESC
bfhlRouter.get('/tasks', async (req, res) => {
  try {
    const { status, minImportance } = req.query;
    
    const pipeline = [];

    // Match filters
    const match = {};
    if (status) match.status = status;
    if (minImportance) match.importance = { $gte: parseInt(minImportance) };
    
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    // Add priorityScore field
    pipeline.push({
      $addFields: {
        priorityScore: { $round: [getPriorityScoreAggregation(), 2] }
      }
    });

    // Sort by priorityScore DESC
    pipeline.push({ $sort: { priorityScore: -1 } });

    const tasks = await Task.aggregate(pipeline);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. PATCH /bfhl/tasks/:id - Update a task
bfhlRouter.patch('/tasks/:id', async (req, res) => {
  try {
    const updates = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      task[key] = updates[key];
    });

    await task.save();
    res.json(task);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. DELETE /bfhl/tasks/:id - Delete a task
bfhlRouter.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. GET /bfhl/tasks/stats (Bonus)
bfhlRouter.get('/tasks/stats', async (req, res) => {
  try {
    const now = new Date();
    const stats = await Task.aggregate([
      {
        $facet: {
          basicStats: [
            {
              $group: {
                _id: null,
                totalTasks: { $sum: 1 },
                pendingTasks: {
                  $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
                },
                completedTasks: {
                  $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                },
                averageImportance: { $avg: "$importance" }
              }
            }
          ],
          overdueTasks: [
            {
              $match: {
                status: "pending",
                dueDate: { $lt: now }
              }
            },
            { $count: "count" }
          ],
          importanceGroups: [
            {
              $group: {
                _id: "$importance",
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]
        }
      },
      {
        $project: {
          totalTasks: { $ifNull: [{ $arrayElemAt: ["$basicStats.totalTasks", 0] }, 0] },
          pendingTasks: { $ifNull: [{ $arrayElemAt: ["$basicStats.pendingTasks", 0] }, 0] },
          completedTasks: { $ifNull: [{ $arrayElemAt: ["$basicStats.completedTasks", 0] }, 0] },
          averageImportance: { $round: [{ $ifNull: [{ $arrayElemAt: ["$basicStats.averageImportance", 0] }, 0] }, 2] },
          overdueTasks: { $ifNull: [{ $arrayElemAt: ["$overdueTasks.count", 0] }, 0] },
          tasksByImportance: {
            $arrayToObject: {
              $map: {
                input: "$importanceGroups",
                as: "ig",
                in: {
                  k: { $toString: "$$ig._id" },
                  v: "$$ig.count"
                }
              }
            }
          }
        }
      }
    ]);

    res.json(stats[0] || {
      totalTasks: 0,
      pendingTasks: 0,
      completedTasks: 0,
      averageImportance: 0,
      overdueTasks: 0,
      tasksByImportance: {}
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const serverless = require('serverless-http');

app.use('/bfhl', bfhlRouter);

// Local development entry point
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Netlify Functions entry point
module.exports.handler = serverless(app);
