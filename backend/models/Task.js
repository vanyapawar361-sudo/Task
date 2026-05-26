const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be between 3 and 100 characters'],
    maxlength: [100, 'Title must be between 3 and 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  importance: {
    type: Number,
    required: [true, 'Importance is required'],
    min: [1, 'Importance must be between 1 and 5'],
    max: [5, 'Importance must be between 1 and 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Importance must be an integer'
    }
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    validate: {
      validator: function(value) {
        // Only enforce future date on creation
        if (this.isNew) {
          return value > new Date();
        }
        return true;
      },
      message: 'Due date must be in the future'
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
  toObject: { virtuals: true }
});

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
