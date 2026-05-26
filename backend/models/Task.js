const mongoose = require('mongoose');

/**
 * Task Schema Definition
 * ----------------------
 */
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a descriptive title'],
    trim: true,
    minlength: [3, 'Title is too short'],
    maxlength: [100, 'Title is too long']
  },
  description: {
    type: String,
    maxlength: [500, 'Description must be under 500 chars']
  },
  importance: {
    type: Number,
    required: [true, 'Importance (1-5) is required'],
    min: [1, 'Scale starts at 1'],
    max: [5, 'Scale ends at 5']
  },
  dueDate: {
    type: Date,
    required: [true, 'A deadline is mandatory']
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Priority Score Virtual logic
taskSchema.virtual('priorityScore').get(function() {
  if (this.status === 'completed') return 0;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  const daysUntilDue = Math.max(diffDays, 1);
  return parseFloat(((this.importance * 10) + (100 / daysUntilDue)).toFixed(2));
});

module.exports = mongoose.model('Task', taskSchema);
