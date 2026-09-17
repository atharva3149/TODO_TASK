import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskApi } from '../lib/api';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';

const filters = [
  { value: '', label: 'All work' },
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export default function TaskPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 0, total: 0 });
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await taskApi.list({ status, page });
      setTasks(response.items);
      setPagination(response.pagination);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  }, [page, status]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  function chooseStatus(nextStatus) {
    setStatus(nextStatus);
    setPage(1);
  }

  async function saveTask(form) {
    setIsSaving(true);
    setError('');
    try {
      if (editingTask) await taskApi.update(editingTask.id, form);
      else await taskApi.create(form);
      setEditingTask(null);
      setIsFormOpen(false);
      await loadTasks();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(task, nextStatus) {
    try {
      await taskApi.update(task.id, {
        title: task.title,
        description: task.description,
        status: nextStatus,
        priority: task.priority,
        due_date: task.due_date,
      });
      await loadTasks();
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await taskApi.remove(task.id);
      if (tasks.length === 1 && page > 1) setPage((current) => current - 1);
      else await loadTasks();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const completedCount = tasks.filter((task) => task.status === 'done').length;

  return (
    <>
      <section className="hero-row">
        <div>
          <span className="eyebrow">{user.role === 'admin' ? 'Operations view' : 'Your workspace'}</span>
          <h1>Make progress visible.</h1>
          <p className="hero-copy">A clear place for the work that matters today.</p>
        </div>
        <button className="button button-primary" type="button" onClick={() => { setEditingTask(null); setIsFormOpen(true); }}>+ Add task</button>
      </section>

      <section className="overview-strip">
        <div><span className="overview-number">{pagination.total}</span><span>Total tasks</span></div>
        <div><span className="overview-number">{completedCount}</span><span>Done this page</span></div>
        <div className="overview-note">{user.role === 'admin' ? "You are seeing every owner's work." : 'Only your tasks are shown here.'}</div>
      </section>

      <div className="content-toolbar">
        <div className="filter-tabs" role="tablist" aria-label="Filter tasks">
          {filters.map((filter) => <button key={filter.value} className={status === filter.value ? 'active' : ''} type="button" onClick={() => chooseStatus(filter.value)}>{filter.label}</button>)}
        </div>
        <span className="result-count">{pagination.total} {pagination.total === 1 ? 'task' : 'tasks'}</span>
      </div>

      {error && <div className="page-error">{error}</div>}
      {isLoading ? <div className="empty-state">Loading your work<span className="loading-dots">...</span></div> : tasks.length === 0 ? <div className="empty-state"><strong>No tasks in this view.</strong><span>Start with one small, concrete next step.</span></div> : <div className="task-grid">{tasks.map((task) => <TaskCard key={task.id} task={task} isAdmin={user.role === 'admin'} onEdit={(selected) => { setEditingTask(selected); setIsFormOpen(true); }} onDelete={deleteTask} onStatusChange={updateStatus} />)}</div>}

      {pagination.total_pages > 1 && <div className="pagination"><button className="button button-quiet" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pagination.total_pages}</span><button className="button button-quiet" disabled={page >= pagination.total_pages} onClick={() => setPage((current) => current + 1)}>Next</button></div>}

      {isFormOpen && <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true"><TaskForm task={editingTask} onSubmit={saveTask} onCancel={() => { setIsFormOpen(false); setEditingTask(null); }} isSaving={isSaving} /></div></div>}
    </>
  );
}
