import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import Landing from "./pages/Landing.tsx";
import Projects from "./pages/Projects.tsx";
import ProjectView from "./pages/ProjectView.tsx";
import DeveloperDashboard from "./pages/DeveloperDashboard";
import { ChatbotWidget } from "./components/ChatbotWidget";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useEffect, useState } from "react";
import { Task, TaskStatus, TeamMember, Project } from "./types/project";
import { PROJECT_COLORS } from "./types/project";
import { apiFetch } from "./lib/api";

const queryClient = new QueryClient();

interface ApiProject {
  id: number;
  name: string;
  description: string | null;
  color?: string | null;
  created_at?: string;
}

interface ApiTask {
  id: number;
  title: string;
  description: string;
  summary?: string | null;
  status: TaskStatus;
  priority: Task["priority"];
  assignee_id?: string | null;
  skills?: string[] | string | null;
  ai_assigned?: boolean | number;
  progress_percent?: number;
  project_id: number | string;
  created_at?: string;
}

function mapApiProject(project: ApiProject): Project {
  return {
    id: String(project.id),
    name: project.name,
    description: project.description ?? "",
    createdAt: new Date(project.created_at ?? Date.now()),
    color: project.color || PROJECT_COLORS[0],
  };
}

function parseSkills(skills: ApiTask["skills"]): Task["skills"] {
  if (Array.isArray(skills)) {
    return skills as Task["skills"];
  }

  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);
      return Array.isArray(parsed) ? (parsed as Task["skills"]) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function mapApiTask(task: ApiTask): Task {
  return {
    id: String(task.id),
    title: task.title,
    description: task.description,
    summary: task.summary ?? "",
    status: task.status,
    priority: task.priority,
    assigneeId: task.assignee_id || undefined,
    skills: parseSkills(task.skills),
    createdAt: new Date(task.created_at ?? Date.now()),
    aiAssigned: Boolean(task.ai_assigned),
    projectId: String(task.project_id),
    progressPercent: task.progress_percent ?? 0,
  };
}

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!isAuthenticated) {
        setProjects([]);
        setTasks([]);
        return;
      }

      try {
        const projectsResponse = await apiFetch<{ success?: boolean; projects?: ApiProject[] }>("/projects");
        const normalizedProjects = (projectsResponse.projects ?? []).map(mapApiProject);

        if (cancelled) return;
        setProjects(normalizedProjects);

        const taskResponses = await Promise.all(
          normalizedProjects.map((project) =>
            apiFetch<{ success?: boolean; tasks?: ApiTask[] }>(`/projects/${project.id}/tasks`)
          )
        );

        if (cancelled) return;
        const allTasks = taskResponses.flatMap((response) => response.tasks ?? []).map(mapApiTask);
        setTasks(allTasks);
      } catch (error) {
        console.error("Failed to load persistent project/task data:", error);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleCreateProject = (project: Project) => {
    void (async () => {
      try {
        const response = await apiFetch<{ success?: boolean; project?: ApiProject }>("/projects", {
          method: "POST",
          body: JSON.stringify({
            name: project.name,
            description: project.description,
            color: project.color,
          }),
        });

        if (response.project) {
          setProjects((prev) => [mapApiProject(response.project as ApiProject), ...prev]);
        }
      } catch (error) {
        console.error("Failed to create project:", error);
      }
    })();
  };

  const handleDeleteProject = (projectId: string) => {
    void (async () => {
      try {
        await apiFetch(`/projects/${projectId}`, { method: "DELETE" });
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        setTasks((prev) => prev.filter((t) => t.projectId !== projectId));
      } catch (error) {
        console.error("Failed to delete project:", error);
      }
    })();
  };

  const handleAddTask = (task: Task) => {
    void (async () => {
      try {
        const response = await apiFetch<{ success?: boolean; task?: ApiTask }>(`/projects/${task.projectId}/tasks`, {
          method: "POST",
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            summary: task.summary,
            assigneeId: task.assigneeId,
            status: task.status,
            priority: task.priority,
            skills: task.skills,
            aiAssigned: task.aiAssigned,
            progressPercent: task.progressPercent ?? 0,
          }),
        });

        if (response.task) {
          setTasks((prev) => [mapApiTask(response.task), ...prev]);
        }
      } catch (error) {
        console.error("Failed to create task:", error);
      }
    })();
  };

  const handleAddMember = (member: TeamMember) => {
    void member;
  };

  const handleEditTask = (updatedTask: Task) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)));
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    // Optimistically update local state
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));

    // Persist to database
    apiFetch(`/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).catch((error) => {
      console.error("Failed to update task status:", error);
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: t.status } : t)));
    });
  };

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects
                  projects={projects}
                  onCreateProject={handleCreateProject}
                  onDeleteProject={handleDeleteProject}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <ProjectView
                  projects={projects}
                  tasks={tasks}
                  onAddTask={handleAddTask}
                  onAddMember={handleAddMember}
                  onStatusChange={handleStatusChange}
                  onDeleteProject={handleDeleteProject}
                  onEditTask={handleEditTask}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DeveloperDashboard />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatbotWidget />
      </BrowserRouter>
    </TooltipProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
