export type Skill = 
  | "Python" | "JavaScript" | "TypeScript" | "React" | "HTML/CSS"
  | "Node.js" | "Machine Learning" | "Deep Learning" | "UI/UX"
  | "Data Science" | "DevOps" | "Backend" | "Frontend" | "Database"
  | "API Design" | "Testing" | "Mobile" | "Cloud";

export type Priority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  skills: Skill[];
  experienceLevel: "junior" | "mid" | "senior";
  completedTasks: number;
  currentLoad: number; // number of active tasks
}

export interface Task {
  id: string;
  title: string;
  description: string;
  summary?: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: string;
  skills: Skill[];
  createdAt: Date;
  aiAssigned: boolean;
  projectId: string;
  progressPercent: number;
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-warning" },
  high: { label: "High", color: "text-destructive" },
  critical: { label: "Critical", color: "text-destructive" },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; emoji: string }> = {
  "todo": { label: "To Do", emoji: "○" },
  "in-progress": { label: "In Progress", emoji: "◐" },
  "review": { label: "Review", emoji: "◑" },
  "done": { label: "Done", emoji: "●" },
};

export const SKILLS_LIST: Skill[] = [
  "Python", "JavaScript", "TypeScript", "React", "HTML/CSS",
  "Node.js", "Machine Learning", "Deep Learning", "UI/UX",
  "Data Science", "DevOps", "Backend", "Frontend", "Database",
  "API Design", "Testing", "Mobile", "Cloud",
];

export const PROJECT_COLORS = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-blue-500",
  "from-teal-500 to-green-500",
] as const;

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  color: typeof PROJECT_COLORS[number];
}
