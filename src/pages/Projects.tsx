import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, FolderOpen, Trash2, Edit2, Sparkles, LogOut, UserCog } from "lucide-react";
import { Project, PROJECT_COLORS } from "@/types/project";
import { useAuth } from "@/context/AuthContext";
import { ProfileSettings } from "@/components/ProfileSettings";

interface ProjectsProps {
  projects: Project[];
  onCreateProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
}

const Projects = ({ projects, onCreateProject, onDeleteProject }: ProjectsProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const canManage = (user?.role || '').toLowerCase() === 'manager';
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "", color: PROJECT_COLORS[0] });

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    const project: Project = {
      id: crypto.randomUUID(),
      name: newProject.name,
      description: newProject.description,
      createdAt: new Date(),
      color: newProject.color,
    };

    onCreateProject(project);
    setNewProject({ name: "", description: "", color: PROJECT_COLORS[0] });
    setShowCreateDialog(false);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project? All tasks in this project will be deleted.")) {
      onDeleteProject(projectId);
    }
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
              <p className="text-xs text-muted-foreground">Manage your projects</p>
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

            {canManage && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
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

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No projects yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Create your first project to start organizing tasks and collaborating with your team.
                </p>
                {canManage && (
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Create Project
                  </button>
                )}
              </motion.div>
            </div>
          ) : (
            projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => handleProjectClick(project.id)}
                className="group relative p-6 rounded-2xl glass-card border border-border/40 hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${project.color} rounded-t-2xl`} />

                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center`}>
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  {canManage && (
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {project.description || "No description"}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      {canManage && showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-2xl glass-card border border-border/40"
          >
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="Enter project name"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                  placeholder="Brief description of the project"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewProject({ ...newProject, color })}
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} transition-transform ${
                        newProject.color === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 px-4 py-2 rounded-lg glass-card text-foreground font-medium hover:bg-card/60 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProject.name.trim()}
                  className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Project
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showProfile && <ProfileSettings onClose={() => setShowProfile(false)} />}
    </div>
  );
};

export default Projects;
