import { Task, TeamMember } from "@/types/project";
import { motion } from "framer-motion";
import { BarChart3, Users, CheckCircle2, Zap } from "lucide-react";

interface StatsBarProps {
  tasks: Task[];
  members: TeamMember[];
}

export function StatsBar({ tasks, members }: StatsBarProps) {
  const stats = [
    {
      icon: BarChart3,
      label: "Total Tasks",
      value: tasks.length,
      color: "text-primary",
    },
    {
      icon: Zap,
      label: "In Progress",
      value: tasks.filter((t) => t.status === "in-progress").length,
      color: "text-warning",
    },
    {
      icon: CheckCircle2,
      label: "Completed",
      value: tasks.filter((t) => t.status === "done").length,
      color: "text-success",
    },
    {
      icon: Users,
      label: "Team Size",
      value: members.length,
      color: "text-accent",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass-card rounded-lg p-3 flex items-center gap-3"
        >
          <stat.icon className={`w-5 h-5 ${stat.color} shrink-0`} />
          <div>
            <p className="text-lg font-bold font-mono text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
