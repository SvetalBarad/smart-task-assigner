import { useState } from "react";
import { Task, TaskStatus } from "@/types/project";
import { initialMembers, initialTasks } from "@/data/mockData";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TeamPanel } from "@/components/TeamPanel";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { StatsBar } from "@/components/StatsBar";
import { motion } from "framer-motion";
import { Sparkles, LayoutGrid, Users } from "lucide-react";

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [members] = useState(initialMembers);
  const [view, setView] = useState<"board" | "team">("board");

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
  };

  const handleAddTask = (task: Task) => {
    setTasks((prev) => [task, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center glow-primary">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                TaskFlow <span className="text-gradient-primary">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground">Smart project management with auto-assignment</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center glass-card rounded-lg p-0.5">
              <button
                onClick={() => setView("board")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === "board"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Board
              </button>
              <button
                onClick={() => setView("team")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === "team"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Team
              </button>
            </div>

            <AddTaskDialog members={members} projectId="mock" onAdd={handleAddTask} />
          </div>
        </motion.div>

        {/* Stats */}
        <StatsBar tasks={tasks} members={members} />

        {/* Content */}
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {view === "board" ? (
            <KanbanBoard
              tasks={tasks}
              members={members}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="max-w-2xl">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Team Members
              </h2>
              <TeamPanel members={members} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
