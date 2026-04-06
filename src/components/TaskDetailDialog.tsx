import { useState } from "react";
import { Task, TeamMember, PRIORITY_CONFIG, TaskStatus } from "@/types/project";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Edit2,
  Save,
  X,
  Sparkles,
  Calendar,
  User,
  Briefcase,
} from "lucide-react";

interface TaskDetailDialogProps {
  task: Task | null;
  member?: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isManager: boolean;
  isAssignee: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

const ALL_SKILLS = [
  "Python", "JavaScript", "TypeScript", "React", "HTML/CSS",
  "Node.js", "Machine Learning", "Deep Learning", "UI/UX",
  "Data Science", "DevOps", "Backend", "Frontend", "Database",
  "API Design", "Testing", "Mobile", "Cloud",
];

export function TaskDetailDialog({
  task,
  member,
  open,
  onOpenChange,
  isManager,
  isAssignee,
  onStatusChange,
  onEditTask,
  onDeleteTask,
}: TaskDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Task | null>(null);

  if (!task) return null;

  const priority = PRIORITY_CONFIG[task.priority];

  const handleEditStart = () => {
    setEditedTask({ ...task });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedTask(null);
  };

  const handleEditSave = () => {
    if (editedTask && onEditTask) {
      onEditTask(editedTask);
      setIsEditing(false);
      setEditedTask(null);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      if (onDeleteTask) {
        onDeleteTask(task.id);
        onOpenChange(false);
      }
    }
  };

  const handleStatusChange = (value: string) => {
    if (onStatusChange) {
      onStatusChange(task.id, value as TaskStatus);
    }
  };

  const toggleSkill = (skill: string) => {
    if (!editedTask) return;
    setEditedTask((prev) => {
      if (!prev) return null;
      const skills = prev.skills.includes(skill as any)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill as any];
      return { ...prev, skills };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Task Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isManager && !isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditStart}
                    className="gap-1 h-8"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    className="gap-1 h-8"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </>
              )}
              {isManager && isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditCancel}
                    className="gap-1 h-8"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleEditSave}
                    className="gap-1 h-8"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Status Badge - Always visible */}
          <div className="flex items-center gap-3 pb-3 border-b border-border/40">
            <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider ${priority.color} bg-secondary/60`}>
              {priority.label} Priority
            </div>
            <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/20 text-primary uppercase tracking-wider">
              {task.status.replace("-", " ")}
            </div>
            {task.aiAssigned && (
              <span className="flex items-center gap-1 text-xs font-mono text-primary px-2 py-1.5 rounded-lg bg-primary/10">
                <Sparkles className="w-3 h-3" />
                AI Assigned
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">TITLE</label>
            {isEditing ? (
              <Input
                value={editedTask?.title || ""}
                onChange={(e) => setEditedTask((prev) => prev ? { ...prev, title: e.target.value } : null)}
                className="bg-secondary/50 border-border"
              />
            ) : (
              <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">DESCRIPTION</label>
            {isEditing ? (
              <Textarea
                value={editedTask?.description || ""}
                onChange={(e) => setEditedTask((prev) => prev ? { ...prev, description: e.target.value } : null)}
                rows={4}
                className="bg-secondary/50 border-border resize-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {task.description || "No description provided"}
              </p>
            )}
          </div>

          {/* Summary */}
          {task.summary && (
            <div>
              <label className="text-xs text-muted-foreground font-medium mb-1 block">AI SUMMARY</label>
              <p className="text-sm text-foreground bg-primary/5 rounded-lg p-3 border border-primary/20">
                {task.summary}
              </p>
            </div>
          )}

          {/* Skills */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-2 block">REQUIRED SKILLS</label>
            {isEditing ? (
              <div className="flex flex-wrap gap-1.5">
                {ALL_SKILLS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={(editedTask?.skills || []).includes(skill as any) ? "default" : "secondary"}
                    className={`cursor-pointer text-[10px] font-mono transition-all ${
                      (editedTask?.skills || []).includes(skill as any)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/60 hover:bg-secondary"
                    }`}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {task.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-[10px] px-2 py-0.5 font-mono">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Assignee & Priority */}
          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Assignee:</span>
              {member ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold font-mono">
                    {member.avatar}
                  </div>
                  <span className="text-sm text-foreground">{member.name}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">Unassigned</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Priority:</span>
              <span className={`text-sm font-medium ${priority.color}`}>{priority.label}</span>
            </div>
          </div>

          {/* Created Date */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            Created: {task.createdAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </div>

          {/* Status Change - Only for Developer/Assignee */}
          {isAssignee && !isManager && (
            <div className="pt-3 border-t border-border/40">
              <label className="text-xs text-muted-foreground font-medium mb-2 block">UPDATE STATUS</label>
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-10 bg-secondary/60 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                As the assignee, you can update the status of this task.
              </p>
            </div>
          )}

          {/* Manager notice */}
          {isManager && (
            <div className="pt-3 border-t border-border/40">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Note:</span> Only the assigned developer can change the task status.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
