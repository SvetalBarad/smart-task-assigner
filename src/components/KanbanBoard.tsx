import { Task, TeamMember, TaskStatus, STATUS_CONFIG } from "@/types/project";
import { TaskCard } from "./TaskCard";
import { AnimatePresence } from "framer-motion";

interface KanbanBoardProps {
  tasks: Task[];
  members: TeamMember[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

const COLUMNS: TaskStatus[] = ["todo", "in-progress", "review", "done"];

export function KanbanBoard({ tasks, members, onStatusChange }: KanbanBoardProps) {
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {COLUMNS.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        const config = STATUS_CONFIG[status];

        return (
          <div key={status} className="flex flex-col min-h-0">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-sm opacity-60">{config.emoji}</span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {config.label}
              </h3>
              <span className="ml-auto text-xs font-mono text-muted-foreground/50">
                {columnTasks.length}
              </span>
            </div>

            {/* Column body */}
            <div className="flex-1 space-y-2.5 overflow-y-auto pb-4 pr-1">
              <AnimatePresence mode="popLayout">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    member={task.assigneeId ? memberMap[task.assigneeId] : undefined}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </AnimatePresence>
              {columnTasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/40 p-6 text-center">
                  <p className="text-xs text-muted-foreground/40">No tasks</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
