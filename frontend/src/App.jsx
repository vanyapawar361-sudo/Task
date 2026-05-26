import React, { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask, deleteTask, getStats } from './api';
import TaskForm from './components/TaskForm';
import TaskCard from './components/TaskCard';
import Dashboard from './components/Dashboard';
import { Filter, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    minImportance: 1
  });

  // Core data fetching logic
  // Synchronizes task list and dashboard statistics simultaneously
  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, statsRes] = await Promise.all([
        getTasks(filters),
        getStats()
      ]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);
      setError(null);
    } catch (err) {
      console.error('System synchronization error:', err);
      setError('Connection to the TaskFlow engine failed. Is the backend server online?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Handlers for task lifecycle management
  const handleCreateTask = async (taskData) => {
    setFormLoading(true);
    try {
      await createTask(taskData);
      // Trigger a structural refresh to update priority scores based on current time
      await fetchData();
    } catch (err) {
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleComplete = async (id) => {
    try {
      await updateTask(id, { status: 'completed' });
      await fetchData();
    } catch (err) {
      alert('Failed to update task');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTask(id);
      await fetchData();
    } catch (err) {
      alert('Failed to delete task');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name === 'minImportance' ? parseInt(value) : value
    }));
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 glass rounded-full text-xs font-semibold text-indigo-400 mb-4">
          <Sparkles size={14} /> AI Powered Priority
        </div>
        <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-400 to-rose-400 bg-clip-text text-transparent">
          TaskFlow
        </h1>
        <p className="text-slate-400 mt-2">Manage your tasks with intelligent priority scoring</p>
      </header>

      <Dashboard stats={stats} />

      <div className="main-grid">
        <aside>
          <TaskForm onSubmit={handleCreateTask} loading={formLoading} />
        </aside>

        <main>
          <div className="glass p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Filter size={16} /> Filters
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase">Status</span>
                <select 
                  name="status" 
                  value={filters.status} 
                  onChange={handleFilterChange}
                  className="!py-1.5 !text-xs !w-32"
                >
                  <option value="all">All Tasks</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 uppercase">Min Importance</span>
                <select 
                  name="minImportance" 
                  value={filters.minImportance} 
                  onChange={handleFilterChange}
                  className="!py-1.5 !text-xs !w-24"
                >
                  {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}+</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="glass p-8 text-center border-rose-500/20">
              <AlertCircle size={40} className="mx-auto text-rose-500 mb-4" />
              <h3 className="text-lg font-bold text-rose-400 mb-2">Connection Error</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">{error}</p>
              <button 
                onClick={fetchData}
                className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors"
              >
                Retry Connection
              </button>
            </div>
          )}

          {loading && !error ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 size={40} className="animate-spin mb-4 text-indigo-500" />
              <p className="text-sm font-medium">Fetching your tasks...</p>
            </div>
          ) : (
            <div className="task-list">
              <AnimatePresence mode="popLayout">
                {tasks.length > 0 ? (
                  tasks.map(task => (
                    <TaskCard 
                      key={task._id} 
                      task={task} 
                      onComplete={handleComplete} 
                      onDelete={handleDelete}
                    />
                  ))
                ) : (
                  !error && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass p-12 text-center border-dashed"
                    >
                      <div className="text-4xl mb-4">📭</div>
                      <h3 className="text-lg font-bold text-slate-400">No tasks found</h3>
                      <p className="text-slate-500 text-sm">Try adjusting your filters or create a new task.</p>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
