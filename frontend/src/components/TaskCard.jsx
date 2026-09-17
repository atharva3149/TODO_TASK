const STATUS_LABELS = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
};

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, isAdmin }) {
  return (
    <article className={`task-card task-${task.status}`}>
      <div className="task-card-topline">
        <span className={`status-dot status-${task.status}`} aria-hidden="true" />
        <span className="eyebrow">{STATUS_LABELS[task.status]}</span>
        <span className={`priority priority-${task.priority}`}>{task.priority}</span>
      </div>
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <div className="task-meta">
        {task.due_date ? <span>Due {task.due_date}</span> : <span>No due date</span>}
        {isAdmin && task.owner_email && <span className="owner">{task.owner_email}</span>}
      </div>
      <div className="task-actions">
        <select
          aria-label={`Change status for ${task.title}`}
          value={task.status}
          onChange={(event) => onStatusChange(task, event.target.value)}
        >
          <option value="todo">To do</option>
          <option value="in-progress">In progress</option>
          <option value="done">Done</option>
        </select>
        <button className="text-button" type="button" onClick={() => onEdit(task)}>Edit</button>
        <button className="text-button danger" type="button" onClick={() => onDelete(task)}>Delete</button>
      </div>
    </article>
  );
}
