"use client";

import { useState } from "react";
import { CheckCircle, Circle, PlayCircle, Calendar, Tag } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done" | "cancelled";
  due_date: string | null;
  tags: string[];
  created_at: string;
}

interface Props {
  initialTasks: Task[];
}

export function TaskList({ initialTasks }: Props) {
  const { t } = useLocale();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const cycleStatus = async (task: Task) => {
    // todo → in_progress → done
    const next: Record<string, string> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };
    const nextStatus = next[task.status] ?? "todo";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: nextStatus as Task["status"] } : t,
      ),
    );

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)),
      );
    }
  };

  const doing = tasks.filter((t) => t.status === "in_progress");
  const todo = tasks.filter((t) => t.status === "todo");
  const done = tasks.filter((t) => t.status === "done");
  const cancelled = tasks.filter((t) => t.status === "cancelled");

  const TaskRow = ({ task }: { task: Task }) => {
    const isDone = task.status === "done";
    return (
      <div className="flex items-start gap-3 bg-wiki-surface border border-wiki-border rounded-lg px-4 py-3 group">
        <button
          onClick={() => cycleStatus(task)}
          className="mt-0.5 shrink-0 text-wiki-muted hover:text-wiki-accent transition-colors"
        >
          {task.status === "done" ? (
            <CheckCircle className="w-4 h-4 text-wiki-ok" />
          ) : task.status === "in_progress" ? (
            <PlayCircle className="w-4 h-4 text-wiki-accent" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDone ? "line-through text-wiki-muted" : "text-wiki-text"}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-wiki-muted mt-0.5 truncate">{task.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-1.5">
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-wiki-muted">
                <Calendar className="w-3 h-3" />
                {task.due_date}
              </span>
            )}
            {task.tags.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-wiki-muted">
                <Tag className="w-3 h-3" />
                {task.tags.join(", ")}
              </span>
            )}
          </div>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${
          task.status === "done"
            ? "border-wiki-ok/30 text-wiki-ok bg-wiki-ok/10"
            : task.status === "in_progress"
            ? "border-wiki-accent/30 text-wiki-accent bg-wiki-accent/10"
            : "border-wiki-border text-wiki-muted"
        }`}>
          {t(`tasks.${task.status === "in_progress" ? "inProgress" : task.status}`)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {doing.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-wiki-accent uppercase tracking-wider px-1">{t("tasks.inProgress")}</p>
          {doing.map((task) => <TaskRow key={task.id} task={task} />)}
        </div>
      )}

      {todo.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-wiki-muted uppercase tracking-wider px-1">{t("tasks.todo")}</p>
          {todo.map((task) => <TaskRow key={task.id} task={task} />)}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-wiki-muted uppercase tracking-wider px-1">{t("tasks.done")}</p>
          {done.map((task) => <TaskRow key={task.id} task={task} />)}
        </div>
      )}
    </div>
  );
}
