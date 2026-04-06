import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check } from "lucide-react";
import { TeamMember, Skill, SKILLS_LIST } from "@/types/project";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface AddMemberDialogProps {
  onAdd: (member: TeamMember) => void;
}

export function AddMemberDialog({ onAdd }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"junior" | "mid" | "senior">("mid");
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);

  const toggleSkill = (skill: Skill) => {
    setSelectedSkills(prev => 
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (selectedSkills.length === 0) {
      toast.error("Please select at least one skill");
      return;
    }

    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      name: name.trim(),
      avatar: initials || "U",
      skills: selectedSkills,
      experienceLevel,
      completedTasks: 0,
      currentLoad: 0,
    };

    onAdd(newMember);
    setOpen(false);
    toast.success("Team member added successfully");
    
    // reset form
    setName("");
    setExperienceLevel("mid");
    setSelectedSkills([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Johnson" />
          </div>
          
          <div className="space-y-2">
            <Label>Experience Level</Label>
            <div className="flex gap-2">
              {(["junior", "mid", "senior"] as const).map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant={experienceLevel === level ? "default" : "outline"}
                  onClick={() => setExperienceLevel(level)}
                  className="flex-1 capitalize"
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills ({selectedSkills.length} selected)</Label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 border border-border/50 rounded-md bg-muted/20">
              {SKILLS_LIST.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <Badge
                    key={skill}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-colors ${isSelected ? "opacity-100 font-semibold" : "opacity-70 hover:opacity-100"}`}
                    onClick={() => toggleSkill(skill)}
                  >
                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                    {skill}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit">Add Member</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
