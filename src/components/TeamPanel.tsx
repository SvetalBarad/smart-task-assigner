import { TeamMember } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface TeamPanelProps {
  members: TeamMember[];
}

export function TeamPanel({ members }: TeamPanelProps) {
  return (
    <div className="space-y-2">
      {members.map((member, i) => (
        <motion.div
          key={member.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card rounded-lg p-3 flex items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold font-mono shrink-0">
            {member.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground truncate">{member.name}</h4>
              <span className="text-[10px] font-mono text-muted-foreground capitalize bg-secondary/60 px-1.5 py-0.5 rounded">
                {member.experienceLevel}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {member.skills.slice(0, 3).map((skill) => (
                <Badge key={skill} variant="secondary" className="text-[9px] px-1 py-0 h-3.5 font-mono">
                  {skill}
                </Badge>
              ))}
              {member.skills.length > 3 && (
                <span className="text-[9px] text-muted-foreground">+{member.skills.length - 3}</span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-mono text-primary font-semibold">{member.currentLoad}</p>
            <p className="text-[9px] text-muted-foreground">active</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
