import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Task, TaskStatus, TeamMember, Project } from "@/types/project";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TeamPanel } from "@/components/TeamPanel";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { StatsBar } from "@/components/StatsBar";
import { ProfileSettings } from "@/components/ProfileSettings";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { motion } from "framer-motion";
import { Sparkles, LayoutGrid, Users, LogOut, UserCog, ArrowLeft, FolderOpen, Bell, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

interface ProjectViewProps {
  projects: Project[];
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onAddMember: (member: TeamMember) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDeleteProject: (projectId: string) => void;
  onEditTask: (task: Task) => void;
}

interface ApiMember {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
  skills?: string[] | string;
  experienceLevel?: "junior" | "mid" | "senior";
  completedTasks?: number;
  currentLoad?: number;
}

interface ApiProjectMember {
  id: number;
  email: string;
}

interface ApiNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

function parseMemberSkills(skills: ApiMember["skills"]): string[] {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return skills.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function mapApiMember(member: ApiMember): TeamMember {
  const initials = member.name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return {
    id: String(member.id),
    name: member.name,
    email: member.email,
    avatar: member.avatar || initials || "TM",
    skills: parseMemberSkills(member.skills) as TeamMember["skills"],
    experienceLevel: member.experienceLevel || "mid",
    completedTasks: Number(member.completedTasks || 0),
    currentLoad: Number(member.currentLoad || 0),
  };
}

const ProjectView = ({ projects, tasks, onAddTask, onAddMember, onStatusChange, onDeleteProject }: ProjectViewProps) => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const canManage = (user?.role || '').toLowerCase() === 'manager';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [view, setView] = useState<"board" | "team">("board");
  const [showProfile, setShowProfile] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const project = projects.find((p) => p.id === projectId);

  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.is_read),
    [notifications]
  );

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const loadMembers = async () => {
      try {
        const memberPath = canManage
          ? "/members"
          : `/members?projectId=${projectId}&scope=project`;
        const response = await apiFetch<{ members?: ApiMember[] }>(memberPath);
        if (!cancelled) {
          setMembers((response.members || []).map(mapApiMember));
        }
      } catch (error) {
        console.error("Failed to load members:", error);
      }
    };

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [projectId, tasks, canManage]);

  useEffect(() => {
    if (!canManage || !projectId) {
      setProjectMemberIds([]);
      return;
    }

    let cancelled = false;

    const loadProjectMembers = async () => {
      try {
        const response = await apiFetch<{ members?: ApiProjectMember[] }>(`/projects/${projectId}/members`);
        if (!cancelled) {
          setProjectMemberIds((response.members || []).map((member) => String(member.id)));
        }
      } catch (error) {
        console.error("Failed to load project members:", error);
      }
    };

    void loadProjectMembers();

    return () => {
      cancelled = true;
    };
  }, [canManage, projectId, tasks]);

  useEffect(() => {
    if ((user?.role || "").toLowerCase() !== "developer") {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const response = await apiFetch<{ notifications?: ApiNotification[] }>("/notifications");
        if (!cancelled) {
          setNotifications(response.notifications || []);
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    void loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [user?.role, tasks]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleAddTask = (task: Task) => {
    onAddTask(task);
  };

  const handleAddMember = (member: TeamMember) => {
    onAddMember(member);
  };

  const handleRemoveFromProject = async (memberId: string) => {
    if (!projectId) return;

    setRemovingMemberId(memberId);
    try {
      await apiFetch(`/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
      setProjectMemberIds((prev) => prev.filter((id) => id !== memberId));
    } catch (error) {
      console.error("Failed to remove member from project:", error);
    } finally {
      setRemovingMemberId(null);
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

  const handleBackToProjects = () => {
    navigate("/projects");
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleTaskStatusChange = (taskId: string, status: TaskStatus) => {
    onStatusChange(taskId, status);
    setSelectedTask((prev) => prev ? { ...prev, status } : null);
  };

  const handleEditTask = async (updatedTask: Task) => {
    try {
      await apiFetch(`/tasks/${updatedTask.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: updatedTask.title,
          description: updatedTask.description,
          skills: updatedTask.skills,
          priority: updatedTask.priority,
        }),
      });
      // Update local state via parent handler
      onEditTask(updatedTask);
      setShowTaskDetail(false);
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Project not found</h2>
          <button
            onClick={handleBackToProjects}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

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
            <button
              onClick={handleBackToProjects}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all"
              title="Back to projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${project.color} flex items-center justify-center`}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {project.name}
              </h1>
              <p className="text-xs text-muted-foreground">{project.description || "Project"}</p>
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

            {canManage && <AddTaskDialog members={members} projectId={projectId!} onAdd={handleAddTask} />}

            {!canManage && (
              <>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all glass-card"
                  title="Go to My Dashboard"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  My Dashboard
                </button>

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
                        Assigned Task Notifications
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
              </>
            )}

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
        <StatsBar tasks={projectTasks} members={members} />

        {/* Content */}
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {view === "board" ? (
            <KanbanBoard
              tasks={projectTasks}
              members={members}
              onTaskClick={handleTaskClick}
            />
          ) : (
            <div className="max-w-2xl">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Team Members
              </h2>
              {canManage ? (
                <div className="space-y-2">
                  {members.map((member) => {
                    const isInProject = projectMemberIds.includes(member.id);
                    return (
                      <div key={member.id} className="glass-card rounded-lg p-3 border border-border/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                              <span className="text-[10px] font-mono text-muted-foreground capitalize bg-secondary/60 px-1.5 py-0.5 rounded">
                                {member.experienceLevel}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${isInProject ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                {isInProject ? "In Project" : "Not In Project"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {member.email || "No email available"}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.skills.map((skill) => (
                                <span key={skill} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/60 text-foreground">
                                  {skill}
                                </span>
                              ))}
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">
                              Active: {member.currentLoad} | Completed: {member.completedTasks}
                            </div>
                          </div>

                          {isInProject && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFromProject(member.id)}
                              disabled={removingMemberId === member.id}
                              className="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                            >
                              {removingMemberId === member.id ? "Removing..." : "Remove"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <TeamPanel members={members} />
              )}
            </div>
          )}
        </motion.div>

        {/* Profile Settings Modal */}
        {showProfile && <ProfileSettings onClose={() => setShowProfile(false)} />}

        {/* Task Detail Dialog */}
        {selectedTask && (
          <TaskDetailDialog
            task={selectedTask}
            member={selectedTask.assigneeId ? members.find((m) => m.id === selectedTask.assigneeId) : undefined}
            open={showTaskDetail}
            onOpenChange={setShowTaskDetail}
            isManager={canManage}
            isAssignee={!canManage && selectedTask.assigneeId === String(user?.id)}
            onStatusChange={handleTaskStatusChange}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectView;
