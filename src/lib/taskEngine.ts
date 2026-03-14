import { TeamMember, Task, Skill } from "@/types/project";

// Skill-based matching: scores each member for a task
export function findBestAssignee(task: Task, members: TeamMember[]): TeamMember | null {
  if (members.length === 0) return null;

  const scored = members.map((member) => {
    // Skill overlap score (0-1)
    const matchingSkills = task.skills.filter((s) => member.skills.includes(s));
    const skillScore = task.skills.length > 0 ? matchingSkills.length / task.skills.length : 0;

    // Experience bonus
    const expBonus = member.experienceLevel === "senior" ? 0.2 : member.experienceLevel === "mid" ? 0.1 : 0;

    // Workload penalty (fewer current tasks = better)
    const loadPenalty = member.currentLoad * 0.08;

    // Productivity bonus (more completed tasks = proven track record)
    const productivityBonus = Math.min(member.completedTasks * 0.005, 0.15);

    const totalScore = skillScore + expBonus - loadPenalty + productivityBonus;

    return { member, score: totalScore, matchingSkills };
  });

  scored.sort((a, b) => b.score - a.score);
  
  // Only assign if there's at least some skill match
  if (scored[0].score > 0) {
    return scored[0].member;
  }
  
  return null;
}

// Simple rule-based task summarizer (used when AI is unavailable)
export function summarizeTask(description: string): string {
  if (description.length <= 60) return description;
  
  // Take first sentence or truncate
  const firstSentence = description.split(/[.!?]/)[0];
  if (firstSentence.length <= 80) return firstSentence;
  
  return description.substring(0, 77) + "...";
}

// Detect skills from task title and description
export function detectSkills(title: string, description: string): Skill[] {
  const text = `${title} ${description}`.toLowerCase();
  const skillMap: Record<string, Skill> = {
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "react": "React",
    "html": "HTML/CSS",
    "css": "HTML/CSS",
    "node": "Node.js",
    "machine learning": "Machine Learning",
    "ml": "Machine Learning",
    "deep learning": "Deep Learning",
    "cnn": "Deep Learning",
    "transformer": "Deep Learning",
    "neural": "Deep Learning",
    "ui": "UI/UX",
    "ux": "UI/UX",
    "design": "UI/UX",
    "frontend": "Frontend",
    "front-end": "Frontend",
    "login": "Frontend",
    "dashboard": "Frontend",
    "data": "Data Science",
    "analytics": "Data Science",
    "devops": "DevOps",
    "ci/cd": "DevOps",
    "deploy": "DevOps",
    "docker": "DevOps",
    "backend": "Backend",
    "back-end": "Backend",
    "server": "Backend",
    "api": "API Design",
    "rest": "API Design",
    "endpoint": "API Design",
    "test": "Testing",
    "database": "Database",
    "sql": "Database",
    "mongo": "Database",
    "mobile": "Mobile",
    "ios": "Mobile",
    "android": "Mobile",
    "cloud": "Cloud",
    "aws": "Cloud",
    "gcp": "Cloud",
  };

  const detected = new Set<Skill>();
  for (const [keyword, skill] of Object.entries(skillMap)) {
    if (text.includes(keyword)) {
      detected.add(skill);
    }
  }

  return Array.from(detected);
}
