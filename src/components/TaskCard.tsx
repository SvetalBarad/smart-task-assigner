import { Task, TeamMember, PRIORITY_CONFIG, STATUS_CONFIG, TaskStatus } from "@/types/project";
import { motion } from "framer-motion";
import { Sparkles, GripVertical, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TaskCardProps {
  task: Task;
  member?: TeamMember;
  onClick: (task: Task) => void;
}

export function TaskCard({ task, member, onClick }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority];
  const statusConfig = STATUS_CONFIG[task.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => onClick(task)}
      className="glass-card rounded-lg p-3.5 group cursor-pointer hover:border-primary/30 transition-all duration-200 hover:shadow-lg"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground/30 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          {/* Priority & AI badge */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${priority.color}`}>
              {priority.label}
            </span>
            {task.aiAssigned && (
              <span className="flex items-center gap-0.5 text-[10px] font-mono text-primary">
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-foreground leading-snug mb-1">
            {task.title}
          </h4>

          {/* Summary */}
          {task.summary && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-2.5 line-clamp-2">
              {task.summary}
            </p>
          )}

          {/* Skills */}
          <div className="flex flex-wrap gap-1 mb-2.5">
            {task.skills.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono bg-secondary/60">
                {skill}
              </Badge>
            ))}
            {task.skills.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono bg-secondary/60">
                +{task.skills.length - 3}
              </Badge>
            )}
          </div>

          {/* Status Badge & Assignee */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`text-[10px] px-2 py-1 rounded font-medium ${
              task.status === 'done' ? 'bg-green-500/20 text-green-500' :
              task.status === 'review' ? 'bg-yellow-500/20 text-yellow-500' :
              task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-500' :
              'bg-muted text-muted-foreground'
            }`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Assignee */}
          <div className="flex items-center justify-between">
            {member ? (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold font-mono">
                  {member.avatar}
                </div>
                <span className="text-[11px] text-muted-foreground">{member.name}</span>
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground/50 italic">Unassigned</span>
            )}
            <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
