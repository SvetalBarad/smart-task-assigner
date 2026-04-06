import db from '../config/db.js';

const isManager = (req) => (req.user?.role || '').toLowerCase() === 'manager';

const parseSkills = (skills) => {
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

const getExperienceRank = (experienceLevel) => {
  const level = String(experienceLevel || '').toLowerCase();
  if (level === 'senior') return 3;
  if (level === 'mid') return 2;
  return 1;
};

const getSkillCoverage = (memberSkills, requiredSkills) => {
  if (!requiredSkills.length) return 0;

  const normalizedMemberSkills = new Set(memberSkills.map((skill) => skill.toLowerCase()));
  const normalizedRequiredSkills = requiredSkills.map((skill) => skill.toLowerCase());
  const matchedSkills = normalizedRequiredSkills.filter((skill) => normalizedMemberSkills.has(skill)).length;

  return matchedSkills / normalizedRequiredSkills.length;
};

const calculateMatchScore = (memberSkills, requiredSkills, experienceLevel, currentLoad, completedTasks) => {
  if (!requiredSkills.length) {
    return 0;
  }

  const normalizedMemberSkills = new Set(memberSkills.map((skill) => skill.toLowerCase()));
  const normalizedRequiredSkills = requiredSkills.map((skill) => skill.toLowerCase());
  const matchedSkills = normalizedRequiredSkills.filter((skill) => normalizedMemberSkills.has(skill)).length;

  if (matchedSkills === 0) {
    return 0;
  }

  const experienceBonus =
    experienceLevel === 'senior' ? 0.25 : experienceLevel === 'mid' ? 0.12 : 0;
  const loadPenalty = Number(currentLoad || 0) * 0.08;
  const productivityBonus = Math.min(Number(completedTasks || 0) * 0.005, 0.15);

  return (matchedSkills / normalizedRequiredSkills.length) + experienceBonus - loadPenalty + productivityBonus;
};

const getBestAssignee = (projectId, requiredSkills, callback) => {
  const candidateSql = `
    SELECT
      u.id,
      dp.skills,
      dp.experience_level,
      CASE WHEN EXISTS (
        SELECT 1 FROM project_members pm WHERE pm.project_id = ? AND pm.user_id = u.id
      ) THEN 1 ELSE 0 END AS in_project,
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
  `;

  db.query(candidateSql, [projectId], (candidateErr, candidateRows) => {
    if (candidateErr) {
      return callback(candidateErr);
    }

    const candidates = (candidateRows || []).map((row) => {
      const memberSkills = parseSkills(row.skills);
      const skillCoverage = getSkillCoverage(memberSkills, requiredSkills);
      const experienceRank = getExperienceRank(row.experience_level);
      const score = calculateMatchScore(
        memberSkills,
        requiredSkills,
        String(row.experience_level || 'mid').toLowerCase(),
        row.current_load,
        row.completed_tasks
      ) + (Number(row.in_project || 0) ? 0.08 : 0);

      return {
        id: row.id,
        score,
        skillCoverage,
        experienceRank,
      };
    });

    // Ranking priority:
    // 1) Better required-skill coverage
    // 2) Higher experience level (senior > mid > junior) when coverage is equal
    // 3) Overall score (workload/productivity/in-project bonuses)
    candidates.sort((a, b) => {
      if (b.skillCoverage !== a.skillCoverage) return b.skillCoverage - a.skillCoverage;
      if (b.experienceRank !== a.experienceRank) return b.experienceRank - a.experienceRank;
      return b.score - a.score;
    });

    if (candidates.length > 0 && candidates[0].score > 0) {
      return callback(null, candidates[0].id);
    }

    const fallbackSql = `
      SELECT u.id
      FROM users u
      WHERE u.role = 'developer'
      ORDER BY u.created_at ASC
      LIMIT 1
    `;

    db.query(fallbackSql, (fallbackErr, fallbackRows) => {
      if (fallbackErr) {
        return callback(fallbackErr);
      }

      const fallbackAssignee = fallbackRows?.length ? fallbackRows[0].id : null;
      return callback(null, fallbackAssignee);
    });
  });
};

// GET all tasks assigned to current user (for developer dashboard)
export const getMyTasks = (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT t.id, t.title, t.description, t.summary, t.project_id, t.assignee_id,
             t.status, t.priority, t.skills, t.ai_assigned, t.progress_percent,
             t.created_at, t.updated_at,
             p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.assignee_id = ?
      ORDER BY t.updated_at DESC
    `;

    db.query(sql, [userId], (err, rows) => {
      if (err) {
        console.error('❌ DB Error (get my tasks):', err);
        return res.status(500).json({ message: 'Failed to fetch tasks.' });
      }

      return res.json({ success: true, tasks: rows });
    });
  } catch (error) {
    console.error('❌ Error in getMyTasks:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET all tasks for a project (only if user has access)
export const getProjectTasks = (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const authSql = `
      SELECT id
      FROM projects
      WHERE id = ?
        AND (
          owner_id = ?
          OR id IN (SELECT project_id FROM project_members WHERE user_id = ?)
        )
      LIMIT 1
    `;

    db.query(authSql, [projectId, userId, userId], (authErr, authRows) => {
      if (authErr) {
        console.error('❌ DB Error (task auth):', authErr);
        return res.status(500).json({ message: 'Server error.' });
      }

      if (authRows.length === 0) {
        return res.status(403).json({ message: 'Not authorized.' });
      }

      const sql = isManager(req)
        ? `
          SELECT id, title, description, summary, project_id, assignee_id, status, priority, skills, ai_assigned, progress_percent, created_at, updated_at
          FROM tasks
          WHERE project_id = ?
          ORDER BY created_at DESC
        `
        : `
          SELECT id, title, description, summary, project_id, assignee_id, status, priority, skills, ai_assigned, progress_percent, created_at, updated_at
          FROM tasks
          WHERE project_id = ? AND assignee_id = ?
          ORDER BY created_at DESC
        `;

      const params = isManager(req) ? [projectId] : [projectId, userId];

      db.query(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ DB Error (get tasks):', err);
          return res.status(500).json({ message: 'Failed to fetch tasks.' });
        }

        return res.json({ success: true, tasks: rows });
      });
    });
  } catch (error) {
    console.error('❌ Error in getProjectTasks:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// CREATE task in project
export const createTask = (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ message: 'Only manager/admin can create tasks.' });
    }

    const { projectId } = req.params;
    const userId = req.user.id;
    const {
      title,
      description,
      summary,
      assigneeId,
      status = 'todo',
      priority = 'medium',
      skills = [],
      aiAssigned = false,
      progressPercent = 0,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    const authSql = `
      SELECT id
      FROM projects
      WHERE id = ?
        AND (
          owner_id = ?
          OR id IN (SELECT project_id FROM project_members WHERE user_id = ?)
        )
      LIMIT 1
    `;

    db.query(authSql, [projectId, userId, userId], (authErr, authRows) => {
      if (authErr) {
        console.error('❌ DB Error (create task auth):', authErr);
        return res.status(500).json({ message: 'Server error.' });
      }

      if (authRows.length === 0) {
        return res.status(403).json({ message: 'Not authorized.' });
      }

      const insertSql = `
        INSERT INTO tasks (title, description, summary, project_id, assignee_id, status, priority, skills, ai_assigned, progress_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const safeSkills = Array.isArray(skills) ? skills : [];
      const parsedAssignee = Number(assigneeId);
      const explicitAssignee = Number.isInteger(parsedAssignee) && parsedAssignee > 0 ? parsedAssignee : null;

      const saveTask = (resolvedAssigneeId, resolvedAiAssigned) => {
        db.query(
          insertSql,
          [
            title.trim(),
            description ?? '',
            summary ?? null,
            projectId,
            resolvedAssigneeId,
            status,
            priority,
            JSON.stringify(safeSkills),
            !!resolvedAiAssigned,
            Number(progressPercent) || 0,
          ],
          (insertErr, result) => {
            if (insertErr) {
              console.error('❌ DB Error (create task):', insertErr);
              return res.status(500).json({ message: 'Failed to create task.' });
            }

            if (resolvedAssigneeId) {
              const addMemberSql = `
                INSERT INTO project_members (project_id, user_id, role)
                VALUES (?, ?, 'member')
                ON DUPLICATE KEY UPDATE role = role
              `;
              db.query(addMemberSql, [projectId, resolvedAssigneeId], () => {});

              const notificationSql = `
                INSERT INTO notifications (user_id, project_id, task_id, title, message)
                VALUES (?, ?, ?, ?, ?)
              `;
              const notificationTitle = 'New task assigned';
              const notificationMessage = `You have been assigned task: ${title.trim()}`;

              db.query(
                notificationSql,
                [resolvedAssigneeId, projectId, result.insertId, notificationTitle, notificationMessage],
                () => {}
              );
            }

            const fetchSql = `
              SELECT id, title, description, summary, project_id, assignee_id, status, priority, skills, ai_assigned, progress_percent, created_at, updated_at
              FROM tasks
              WHERE id = ?
              LIMIT 1
            `;

            db.query(fetchSql, [result.insertId], (fetchErr, rows) => {
              if (fetchErr) {
                console.error('❌ DB Error (fetch created task):', fetchErr);
                return res.status(500).json({ message: 'Task created but fetch failed.' });
              }

              return res.status(201).json({ success: true, task: rows[0] });
            });
          }
        );
      };

      if (explicitAssignee) {
        saveTask(explicitAssignee, !!aiAssigned);
        return;
      }

      getBestAssignee(projectId, safeSkills, (assigneeErr, suggestedAssigneeId) => {
        if (assigneeErr) {
          console.error('❌ DB Error (smart assign):', assigneeErr);
          return saveTask(null, false);
        }

        saveTask(suggestedAssigneeId || null, Boolean(suggestedAssigneeId));
      });
    });
  } catch (error) {
    console.error('❌ Error in createTask:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// UPDATE task status
export const updateTaskStatus = (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const { status } = req.body;

    if (!['todo', 'in-progress', 'review', 'done'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    const manager = isManager(req);

    // Auto-update progress based on status
    const progressMap = {
      'todo': 0,
      'in-progress': 50,
      'review': 80,
      'done': 100,
    };
    const autoProgress = progressMap[status] ?? 0;

    const sql = manager
      ? `
        UPDATE tasks t
        JOIN projects p ON p.id = t.project_id
        LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
        SET t.status = ?, t.progress_percent = ?
        WHERE t.id = ? AND (p.owner_id = ? OR pm.user_id IS NOT NULL)
      `
      : `
        UPDATE tasks
        SET status = ?, progress_percent = ?
        WHERE id = ? AND assignee_id = ?
      `;

    const params = manager ? [userId, status, autoProgress, taskId, userId] : [status, autoProgress, taskId, userId];

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('❌ DB Error (update task status):', err);
        return res.status(500).json({ message: 'Failed to update task status.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Task not found or not authorized.' });
      }

      return res.json({ success: true, message: 'Task status updated.' });
    });
  } catch (error) {
    console.error('❌ Error in updateTaskStatus:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// UPDATE task details (manager only - cannot change status)
export const updateTask = (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ message: 'Only manager/admin can update task details.' });
    }

    const { taskId } = req.params;
    const userId = req.user.id;
    const { title, description, skills, priority } = req.body;

    // Manager cannot update status - that's for developers only
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description ?? '');
    }
    if (skills !== undefined) {
      updates.push('skills = ?');
      values.push(JSON.stringify(Array.isArray(skills) ? skills : []));
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(taskId);
    values.push(userId);

    const sql = `
      UPDATE tasks t
      JOIN projects p ON p.id = t.project_id
      SET ${updates.join(', ')}
      WHERE t.id = ? AND p.owner_id = ?
    `;

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('❌ DB Error (update task):', err);
        return res.status(500).json({ message: 'Failed to update task.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Task not found or not authorized.' });
      }

      return res.json({ success: true, message: 'Task updated.' });
    });
  } catch (error) {
    console.error('❌ Error in updateTask:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE task
export const deleteTask = (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ message: 'Only manager/admin can delete tasks.' });
    }

    const { taskId } = req.params;
    const userId = req.user.id;

    const sql = `
      DELETE t
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ? AND p.owner_id = ?
    `;

    db.query(sql, [taskId, userId], (err, result) => {
      if (err) {
        console.error('❌ DB Error (delete task):', err);
        return res.status(500).json({ message: 'Failed to delete task.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Task not found or not authorized.' });
      }

      return res.json({ success: true, message: 'Task deleted.' });
    });
  } catch (error) {
    console.error('❌ Error in deleteTask:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// UPDATE task progress (for developers to update their task progress)
export const updateTaskProgress = (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    const { progressPercent } = req.body;

    if (progressPercent === undefined || progressPercent < 0 || progressPercent > 100) {
      return res.status(400).json({ message: 'Progress must be between 0 and 100.' });
    }

    // Check if user is the assignee or a manager
    const sql = `
      UPDATE tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      SET t.progress_percent = ?
      WHERE t.id = ? AND (t.assignee_id = ? OR p.owner_id = ? OR pm.user_id IS NOT NULL)
    `;

    db.query(sql, [progressPercent, taskId, userId, userId], (err, result) => {
      if (err) {
        console.error('❌ DB Error (update progress):', err);
        return res.status(500).json({ message: 'Failed to update task progress.' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Task not found or not authorized.' });
      }

      return res.json({ success: true, message: 'Task progress updated.' });
    });
  } catch (error) {
    console.error('❌ Error in updateTaskProgress:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
