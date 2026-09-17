import { useEffect, useState } from 'react';

const emptyTask = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
};

export default function TaskForm({ task, onSubmit, onCancel, isSaving }) {
  const [form, setForm] = useState(task ? { ...task, due_date: task.due_date || '' } : emptyTask);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(task ? { ...task, due_date: task.due_date || '' } : emptyTask);
    setError('');
  }, [task]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError('Give this task a short, clear title.');
      return;
    }
    setError('');
    await onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
    });
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <div>
          <span className="eyebrow">{task ? 'Refine the plan' : 'New work item'}</span>
          <h2>{task ? 'Edit task' : 'Add a task'}</h2>
        </div>
        <button className="close-button" type="button" onClick={onCancel} aria-label="Close form">x</button>
      </div>
      {error && <div className="form-error">{error}</div>}
      <label>
        Task title
        <input name="title" value={form.title} onChange={updateField} maxLength={200} placeholder="e.g. Prepare release notes" autoFocus />
      </label>
      <label>
        Description <span className="label-muted">Optional</span>
        <textarea name="description" value={form.description} onChange={updateField} rows="4" placeholder="What does done look like?" />
      </label>
      <div className="form-grid">
        <label>
          Status
          <select name="status" value={form.status} onChange={updateField}>
            <option value="todo">To do</option>
            <option value="in-progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label>
          Priority
          <select name="priority" value={form.priority} onChange={updateField}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <label>
        Due date <span className="label-muted">Optional</span>
        <input name="due_date" type="date" value={form.due_date} onChange={updateField} />
      </label>
      <div className="form-actions">
        <button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button>
        <button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : task ? 'Save changes' : 'Create task'}</button>
      </div>
    </form>
  );
}
