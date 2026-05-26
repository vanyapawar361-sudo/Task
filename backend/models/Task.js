const mongoose = require('mongoose');

/**
 * Task Schema Definition
 * ----------------------
 * Defines the structure for tasks in TaskFlow.
 * Includes virtuals for 'priorityScore' which is calculated at runtime.
 */
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a descriptive title'],
    trim: true,
    minlength: [3, 'Title is too short (min 3 chars)'],
    maxlength: [100, 'Title is too long (max 100 chars)']
  },
  description: {
    type: String,
    maxlength: [500, 'Detailed description must be under 500 characters']
  },
  importance: {
    type: Number,
    required: [true, 'Scale of importance (1-5) is required'],
    min: [1, 'Scale starts at 1'],
    max: [5, 'Scale ends at 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Importance must be a whole number'
    }
  },
  dueDate: {
    type: Date,
    required: [true, 'A deadline is mandatory'],
    validate: {
      validator: function(value) {
        // Validation logic for ensuring future dates on creation
        if (this.isNew) {
          return value > new Date();
        }
        return true;
      },
      message: 'Deadlines must be set in the future'
    }
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
  toObject: { virtuals: true },
  timestamps: false // We handle createdAt manually, but could use timestamps: true
});

/**
 * Virtual: priorityScore
 * ----------------------
 * Dynamic field returned in API responses.
 * Not persisted in the database to ensure accuracy against the current time.
 */
taskSchema.virtual('priorityScore').get(function() {
  if (this.status === 'completed') {
    return 0;
  }

  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const daysUntilDue = Math.max(diffDays, 1);
  const score = (this.importance * 10) + (100 / daysUntilDue);
  
  return parseFloat(score.toFixed(2));
});

module.exports = mongoose.model('Task', taskSchema);
