import db from '../config/db.js';

const isManager = (req) => (req.user?.role || '').toLowerCase() === 'manager';

const buildAvatar = (name) => {
  const initials = String(name || '')
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return initials || 'TM';
};

const parseSkills = (skills) => {
  if (!skills) {
    return [];
  }

  if (Array.isArray(skills)) {
    return skills.map((skill) => String(skill || '').trim()).filter(Boolean);
  }

  if (typeof skills === 'string') {
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) {
        return parsed.map((skill) => String(skill || '').trim()).filter(Boolean);
      }
    } catch {
      return skills.split(',').map((skill) => skill.trim()).filter(Boolean);
    }
  }

  return [];
};

export const getMembers = (req, res) => {
  try {
    const userId = req.user.id;
    const role = (req.user?.role || '').toLowerCase();
    const { projectId, scope = 'all' } = req.query;

    if (role !== 'manager' && role !== 'developer') {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const params = [];
    let projectFilter = '';

    if (projectId && scope === 'project') {
      projectFilter = `
        AND (
          EXISTS (
            SELECT 1
            FROM project_members pm
            WHERE pm.project_id = ? AND pm.user_id = u.id
          )
          OR EXISTS (
            SELECT 1
            FROM tasks t
            WHERE t.project_id = ? AND t.assignee_id = u.id
          )
        )
      `;
      params.push(projectId, projectId);
    }

    const membersSql = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        dp.skills,
        dp.experience_level,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.assignee_id = u.id
            AND t.status IN ('todo', 'in-progress', 'review')
        ) AS current_load,
        (
          SELECT COUNT(*)
          FROM tasks t
          WHERE t.assignee_id = u.id
            AND t.status = 'done'
        ) AS completed_tasks
      FROM users u
      LEFT JOIN developer_profiles dp ON dp.user_id = u.id
      WHERE u.role = 'developer'
      ${projectFilter}
      ORDER BY u.created_at DESC
    `;

    db.query(membersSql, params, (err, rows) => {
      if (err) {
        console.error('DB Error (getMembers):', err);
        return res.status(500).json({ message: 'Failed to fetch members.' });
      }

      const members = (rows || []).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        avatar: buildAvatar(row.name),
        skills: parseSkills(row.skills),
        experienceLevel: row.experience_level || 'mid',
        completedTasks: Number(row.completed_tasks || 0),
        currentLoad: Number(row.current_load || 0),
      }));

      if (!isManager(req)) {
        const selfMember = members.find((member) => Number(member.id) === Number(userId));
        return res.json({ success: true, members: selfMember ? [selfMember] : [] });
      }

      return res.json({ success: true, members });
    });
  } catch (error) {
    console.error('Error in getMembers:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};
