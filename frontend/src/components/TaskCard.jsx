import React from 'react';
import { formatDistanceToNow, isPast } from 'date-fns';
import { CheckCircle, Trash2, Calendar, Star, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const TaskCard = ({ task, onComplete, onDelete }) => {
  const isHighPriority = task.priorityScore >= 50;
  const isOverdue = task.status === 'pending' && isPast(new Date(task.dueDate));

  const renderImportance = (level) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={14}
        className={i < level ? 'text-warning fill-current' : 'text-slate-600'}
        style={{ color: i < level ? 'var(--warning)' : '#475569' }}
      />
    ));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass p-5 mb-4 border-l-4 transition-all hover:translate-x-1 ${
        isHighPriority ? 'border-l-rose-500' : 'border-l-indigo-500'
      }`}
      style={{ borderLeftColor: isHighPriority ? 'var(--high-priority)' : 'var(--primary)' }}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            {task.title}
            {isHighPriority && (
              <span className="badge badge-priority flex items-center gap-1">
                <AlertCircle size={10} /> High Priority
              </span>
            )}
          </h3>
          <p className="text-slate-400 text-sm line-clamp-2">{task.description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-indigo-400" style={{ color: 'var(--primary)' }}>
            {task.priorityScore.toFixed(0)}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Score</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          {renderImportance(task.importance)}
        </div>
        
        <div className={`flex items-center gap-1 ${isOverdue ? 'text-rose-400' : ''}`}>
          <Calendar size={14} />
          {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
        </div>

        <div className={`badge ${task.status === 'completed' ? 'badge-completed' : 'badge-pending'}`}>
          {task.status}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 border-t border-white/5 pt-4">
        {task.status === 'pending' && (
          <button
            onClick={() => onComplete(task._id)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs rounded-lg transition-colors"
          >
            <CheckCircle size={14} /> Mark Done
          </button>
        )}
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to delete this task?')) {
              onDelete(task._id);
            }
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs rounded-lg transition-colors"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </motion.div>
  );
};

export default TaskCard;
