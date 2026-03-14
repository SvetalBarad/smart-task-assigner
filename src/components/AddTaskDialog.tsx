import { useState } from "react";
import { Task, TeamMember, Priority, Skill } from "@/types/project";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Zap, X } from "lucide-react";
import { findBestAssignee, summarizeTask, detectSkills } from "@/lib/taskEngine";

interface AddTaskDialogProps {
  members: TeamMember[];
  onAdd: (task: Task) => void;
}

const ALL_SKILLS: Skill[] = [
  "Python", "JavaScript", "TypeScript", "React", "HTML/CSS",
  "Node.js", "Machine Learning", "Deep Learning", "UI/UX",
  "Data Science", "DevOps", "Backend", "Frontend", "Database",
  "API Design", "Testing", "Mobile", "Cloud",
];

export function AddTaskDialog({ members, onAdd }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [assignee, setAssignee] = useState<TeamMember | null>(null);
  const [summary, setSummary] = useState("");
  const [aiProcessed, setAiProcessed] = useState(false);

  const handleAutoDetect = () => {
    // Detect skills from text
    const detected = detectSkills(title, description);
    setSelectedSkills(detected);

    // Summarize
    const sum = summarizeTask(description);
    setSummary(sum);

    // Find best assignee
    const mockTask: Task = {
      id: "", title, description, status: "todo",
      priority, skills: detected, createdAt: new Date(), aiAssigned: true,
    };
    const best = findBestAssignee(mockTask, members);
    setAssignee(best);
    setAiProcessed(true);
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const skills = selectedSkills.length > 0 ? selectedSkills : detectSkills(title, description);

    const newTask: Task = {
      id: `t-${Date.now()}`,
      title,
      description,
      summary: summary || summarizeTask(description),
      status: "todo",
      priority,
      assigneeId: assignee?.id,
      skills,
      createdAt: new Date(),
      aiAssigned: !!assignee,
    };

    onAdd(newTask);
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setSelectedSkills([]);
    setAssignee(null);
    setSummary("");
    setAiProcessed(false);
  };

  const toggleSkill = (skill: Skill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 glow-primary">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Create Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Input
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-secondary/50 border-border"
          />

          <Textarea
            placeholder="Describe the task in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="bg-secondary/50 border-border resize-none"
          />

          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger className="bg-secondary/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Low</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="critical">🔴 Critical</SelectItem>
            </SelectContent>
          </Select>

          {/* AI Auto-detect button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoDetect}
            disabled={!title.trim() && !description.trim()}
            className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Sparkles className="w-4 h-4" />
            Auto-Detect Skills & Assign
          </Button>

          {/* Skills */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-mono">SKILLS</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SKILLS.map((skill) => (
                <Badge
                  key={skill}
                  variant={selectedSkills.includes(skill) ? "default" : "secondary"}
                  className={`cursor-pointer text-[10px] font-mono transition-all ${
                    selectedSkills.includes(skill)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 hover:bg-secondary"
                  }`}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* AI results */}
          {aiProcessed && (
            <div className="glass-card rounded-lg p-3 space-y-2 border-primary/20">
              <p className="text-[10px] font-mono text-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI ANALYSIS
              </p>
              {summary && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Summary:</p>
                  <p className="text-xs text-foreground">{summary}</p>
                </div>
              )}
              {assignee && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Best match:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold font-mono">
                      {assignee.avatar}
                    </div>
                    <span className="text-xs text-foreground font-medium">{assignee.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">({assignee.experienceLevel})</span>
                  </div>
                </div>
              )}
              {!assignee && (
                <p className="text-xs text-muted-foreground italic">No suitable match found</p>
              )}
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full glow-primary" disabled={!title.trim()}>
            Create Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
