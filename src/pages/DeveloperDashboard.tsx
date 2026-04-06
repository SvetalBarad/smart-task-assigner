import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles,
  LogOut,
  UserCog,
  Bell,
  CheckCircle,
  Clock,
  TrendingUp,
  FolderOpen,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Task, TaskStatus } from "@/types/project";
import { ProfileSettings } from "@/components/ProfileSettings";

interface ApiTask {
  id: number;
  title: string;
  description: string;
  summary?: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "critical";
  assignee_id?: number | null;
  skills?: string[] | string | null;
  ai_assigned?: boolean | number;
  progress_percent?: number;
  project_id: number;
  created_at?: string;
  project_name?: string;
}

interface ApiProject {
  id: number;
  name: string;
}

interface ApiNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectsRes, tasksRes, notificationsRes] = await Promise.all([
        apiFetch<{ success?: boolean; projects?: ApiProject[] }>("/projects"),
        apiFetch<{ success?: boolean; tasks?: ApiTask[] }>("/tasks/my"),
        apiFetch<{ success?: boolean; notifications?: ApiNotification[] }>("/notifications"),
      ]);

      setProjects(projectsRes.projects || []);

      const mappedTasks = (tasksRes.tasks || []).map((task: ApiTask) => ({
        id: String(task.id),
        title: task.title,
        description: task.description,
        summary: task.summary ?? "",
        status: task.status,
        priority: task.priority,
        assigneeId: task.assignee_id ? String(task.assignee_id) : undefined,
        skills: parseSkills(task.skills),
        createdAt: new Date(task.created_at ?? Date.now()),
        aiAssigned: Boolean(task.ai_assigned),
        projectId: String(task.project_id),
        progressPercent: task.progress_percent ?? 0,
        projectName: (task as any).project_name,
      }));

      setTasks(mappedTasks);
      setNotifications(notificationsRes.notifications || []);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseSkills = (skills: ApiTask["skills"]): string[] => {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === "string") {
      try {
        const parsed = JSON.parse(skills);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleBackToProjects = () => {
    navigate("/projects");
  };

  const updateStatus = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingStatus(taskId);
    try {
      const response = await apiFetch(`/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.success) {
        // Update local state to reflect the change
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const markNotificationRead = async (notificationId: number) => {
    try {
      await apiFetch(`/notifications/${notificationId}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToProjects}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all"
              title="Back to projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Developer Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">Track and manage your assigned tasks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={() => setShowProfile(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-3 py-1.5 glass-card rounded-lg hover:border-primary/30 transition-colors"
              >
                <UserCog className="w-3.5 h-3.5" />
                {user.name}
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all glass-card"
              >
                <Bell className="w-3.5 h-3.5" />
                Alerts
                {unreadNotifications.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card p-3 shadow-xl z-20">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Task Notifications
                  </p>
                  <div className="space-y-2 max-h-72 overflow-auto pr-1">
                    {notifications.length === 0 && (
                      <p className="text-xs text-muted-foreground">No notifications yet.</p>
                    )}
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-2 ${item.is_read ? "border-border/60" : "border-primary/40 bg-primary/5"}`}
                      >
                        <p className="text-xs font-medium text-foreground">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">{item.message}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                          {!item.is_read && (
                            <button
                              type="button"
                              onClick={() => markNotificationRead(item.id)}
                              className="text-[10px] text-primary hover:underline"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all glass-card"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={FolderOpen} label="Total Tasks" value={stats.total} />
          <StatCard icon={Clock} label="To Do" value={stats.todo} color="text-muted-foreground" />
          <StatCard icon={TrendingUp} label="In Progress" value={stats.inProgress} color="text-primary" />
          <StatCard icon={CheckCircle} label="Done" value={stats.done} color="text-success" />
        </div>

        {/* Tasks List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            My Assigned Tasks
          </h2>

          {tasks.length === 0 ? (
            <div className="text-center py-16 glass-card rounded-xl">
              <CheckCircle className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-muted-foreground">No tasks assigned yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Your manager will assign tasks to you
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdateStatus={(status) => updateStatus(task.id, status)}
                  isUpdating={updatingStatus === task.id}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Profile Settings Modal */}
        {showProfile && <ProfileSettings onClose={() => setShowProfile(false)} />}
      </div>
    </div>
  );
};

function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: any;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-xl p-4 text-center"
    >
      <Icon className={`w-5 h-5 mx-auto mb-2 ${color || "text-foreground"}`} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </motion.div>
  );
}

interface TaskCardProps {
  task: Task & { projectName?: string };
  onUpdateStatus: (status: TaskStatus) => void;
  isUpdating: boolean;
}

const statusOptions: { value: TaskStatus; label: string; icon: string }[] = [
  { value: "todo", label: "To Do", icon: "○" },
  { value: "in-progress", label: "In Progress", icon: "◐" },
  { value: "review", label: "Review", icon: "◑" },
  { value: "done", label: "Done", icon: "●" },
];

const statusColors: Record<TaskStatus, string> = {
  "todo": "bg-slate-500",
  "in-progress": "bg-blue-500",
  "review": "bg-yellow-500",
  "done": "bg-green-500",
};

const priorityColors: Record<string, string> = {
  low: "text-slate-400",
  medium: "text-yellow-500",
  high: "text-red-500",
  critical: "text-red-600 font-bold",
};

function TaskCard({ task, onUpdateStatus, isUpdating }: TaskCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-4 border border-border/40"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header: Priority, AI badge, Status Dropdown */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              {task.aiAssigned && (
                <span className="flex items-center gap-0.5 text-[10px] font-mono text-primary">
                  <Sparkles className="w-3 h-3" />
                  AI
                </span>
              )}

              {/* Status Dropdown */}
              <select
                value={task.status}
                onChange={(e) => onUpdateStatus(e.target.value as TaskStatus)}
                disabled={isUpdating}
                className={`text-xs px-2 py-1 rounded-md font-medium text-white cursor-pointer disabled:opacity-50 ${statusColors[task.status]}`}
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="text-foreground">
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title & Description */}
            <h3 className="text-base font-semibold text-foreground truncate mb-1">{task.title}</h3>
            {task.summary && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.summary}</p>
            )}

            {/* Project Name */}
            {task.projectName && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-2">
                <FolderOpen className="w-3 h-3" />
                {task.projectName}
              </p>
            )}

            {/* Skills */}
            {task.skills && task.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {task.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] px-2 py-0.5 rounded bg-secondary/60 text-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Footer: View Details button */}
            <button
              onClick={() => setShowDetails(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
            >
              📋 View Full Details
            </button>
          </div>
        </div>
      </motion.div>

      {/* Task Details Modal */}
      {showDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="w-full max-w-lg glass-card rounded-2xl p-6 border border-border/40 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Dropdown */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => {
                    onUpdateStatus(e.target.value as TaskStatus);
                    setShowDetails(false);
                  }}
                  disabled={isUpdating}
                  className="w-full text-sm px-3 py-2 rounded-lg bg-card border border-border focus:border-primary outline-none"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isUpdating ? "Saving..." : "Select to change task status"}
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Priority</label>
                <span className={`text-sm font-semibold ${priorityColors[task.priority]}`}>
                  {task.priority.toUpperCase()}
                </span>
              </div>

              {/* AI Assigned */}
              {task.aiAssigned && (
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm">AI Assigned Task</span>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Description</label>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {task.description || "No description provided"}
                </p>
              </div>

              {/* Summary */}
              {task.summary && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Summary</label>
                  <p className="text-sm text-foreground">{task.summary}</p>
                </div>
              )}

              {/* Project */}
              {task.projectName && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Project</label>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    {task.projectName}
                  </div>
                </div>
              )}

              {/* Skills */}
              {task.skills && task.skills.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Required Skills</label>
                  <div className="flex flex-wrap gap-1.5">
                    {task.skills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs px-2 py-1 rounded bg-secondary/60 text-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="text-xs text-muted-foreground pt-2 border-t border-border/40">
                Created: {new Date(task.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DeveloperDashboard;
