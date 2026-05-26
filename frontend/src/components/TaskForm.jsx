import React, { useState } from 'react';
import { PlusCircle, Loader2 } from 'lucide-react';

const TaskForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    importance: 3,
    dueDate: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'importance' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (formData.title.length < 3 || formData.title.length > 100) {
      setError('Title must be between 3 and 100 characters');
      return;
    }

    if (!formData.dueDate) {
      setError('Due date is required');
      return;
    }

    if (new Date(formData.dueDate) <= new Date()) {
      setError('Due date must be in the future');
      return;
    }

    try {
      await onSubmit(formData);
      setFormData({
        title: '',
        description: '',
        importance: 3,
        dueDate: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create task');
    }
  };

  return (
    <div className="glass p-6 sticky top-8">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <PlusCircle size={20} className="text-indigo-400" /> Create New Task
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="What needs to be done?"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Description (Optional)</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Add some details..."
            rows="3"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Importance (1-5)</label>
            <select name="importance" value={formData.importance} onChange={handleChange}>
              {[1, 2, 3, 4, 5].map(num => (
                <option key={num} value={num}>{num} {num === 5 ? 'Critical' : num === 1 ? 'Low' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg animate-fade-in">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 rounded-lg font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-transform"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
          {loading ? 'Creating...' : 'Create Task'}
        </button>
      </form>
    </div>
  );
};

export default TaskForm;
