import db from '../config/db.js';

const isManager = (req) => (req.user?.role || '').toLowerCase() === 'manager';

// GET all projects for a user
export const getProjects = (req, res) => {
  try {
    const userId = req.user.id;
    const manager = isManager(req);

    const sql = manager
      ? `
        SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as completed_count
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?)
        ORDER BY p.updated_at DESC
      `
      : `
        SELECT DISTINCT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND assignee_id = ?) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND assignee_id = ? AND status = 'done') as completed_count
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        JOIN tasks t ON t.project_id = p.id
        WHERE t.assignee_id = ?
        ORDER BY p.updated_at DESC
      `;

    const params = manager ? [userId, userId] : [userId, userId, userId];

    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('❌ DB Error (get projects):', err);
        return res.status(500).json({ message: 'Server error.' });
      }
      res.json({ success: true, projects: results });
    });
  } catch (error) {
    console.error('❌ Error in getProjects:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET single project
export const getProject = (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const manager = isManager(req);

    const sql = manager
      ? `
        SELECT p.*, u.name as owner_name
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.id = ? AND (p.owner_id = ? OR p.id IN (SELECT project_id FROM project_members WHERE user_id = ?))
      `
      : `
        SELECT DISTINCT p.*, u.name as owner_name
        FROM projects p
        LEFT JOIN users u ON p.owner_id = u.id
        JOIN tasks t ON t.project_id = p.id
        WHERE p.id = ? AND t.assignee_id = ?
      `;

    const params = manager ? [id, userId, userId] : [id, userId];

    db.query(sql, params, (err, results) => {
      if (err) {
        console.error('❌ DB Error:', err);
        return res.status(500).json({ message: 'Server error.' });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'Project not found.' });
      }
      res.json({ success: true, project: results[0] });
    });
  } catch (error) {
    console.error('❌ Error in getProject:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// CREATE project
export const createProject = (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ message: 'Only manager/admin can create projects.' });
    }

    const { name, description, color } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.json({ message: 'Project name is required.' });
    }

    const projectColor = color || 'from-blue-500 to-cyan-500';
    const sql = 'INSERT INTO projects (name, description, owner_id, color) VALUES (?, ?, ?, ?)';
    db.query(sql, [name, description || null, userId, projectColor], (err, result) => {
      if (err) {
        console.error('❌ DB Error (create project):', err);
        return res.status(500).json({ message: 'Failed to create project.' });
      }

      // Add owner as project member
      const memberSql = 'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)';
      db.query(memberSql, [result.insertId, userId, 'owner'], (err) => {
        if (err) {
          console.error('❌ DB Error (add member):', err);
        }
      });

      console.log('✅ Project created:', name);
      res.json({
        success: true,
        message: 'Project created successfully!',
        project: { id: result.insertId, name, description, color: projectColor, owner_id: userId }
      });
    });
  } catch (error) {
    console.error('❌ Error in createProject:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// UPDATE project
export const updateProject = (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ message: 'Only manager/admin can update projects.' });
    }

    const { id } = req.params;
    const { name, description, color } = req.body;
    const userId = req.user.id;

    // Check ownership
    const checkSql = 'SELECT * FROM projects WHERE id = ? AND owner_id = ?';
    db.query(checkSql, [id, userId], (err, results) => {
      if (err) {
        console.error('❌ DB Error (check):', err);
        return res.status(500).json({ message: 'Server error.' });
      }
      if (results.length === 0) {
        return res.status(403).json({ message: 'Not authorized.' });
      }

      const updateSql = 'UPDATE projects SET name = ?, description = ?, color = COALESCE(?, color) WHERE id = ?';
      db.query(updateSql, [name, description || null, color || null, id], (err) => {
        if (err) {
          console.error('❌ DB Error (update):', err);
          return res.status(500).json({ message: 'Failed to update project.' });
        }
        console.log('✅ Project updated:', id);
        res.json({ success: true, message: 'Project updated!' });
      });
    });
  } catch (error) {
    console.error('❌ Error in updateProject:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE project
export const deleteProject = (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ message: 'Only manager/admin can delete projects.' });
    }

    const { id } = req.params;
    const userId = req.user.id;

    const sql = 'DELETE FROM projects WHERE id = ? AND owner_id = ?';
    db.query(sql, [id, userId], (err, result) => {
      if (err) {
        console.error('❌ DB Error (delete):', err);
        return res.status(500).json({ message: 'Failed to delete project.' });
      }
      if (result.affectedRows === 0) {
        return res.status(403).json({ message: 'Not authorized or project not found.' });
      }
      console.log('✅ Project deleted:', id);
      res.json({ success: true, message: 'Project deleted!' });
    });
  } catch (error) {
    console.error('❌ Error in deleteProject:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET project members
export const getProjectMembers = (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ message: 'Only manager/admin can view project members.' });
    }

    const { id } = req.params;
    const sql = `
      SELECT u.id, u.name, u.email, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `;
    db.query(sql, [id], (err, results) => {
      if (err) {
        console.error('❌ DB Error:', err);
        return res.status(500).json({ message: 'Server error.' });
      }
      res.json({ success: true, members: results });
    });
  } catch (error) {
    console.error('❌ Error in getProjectMembers:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ADD project member
export const addProjectMember = (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ message: 'Only manager/admin can add members.' });
    }

    const { id } = req.params;
    const { userId: memberId, role = 'member' } = req.body;
    const ownerId = req.user.id;

    // Check if user is owner
    const checkSql = 'SELECT * FROM projects WHERE id = ? AND owner_id = ?';
    db.query(checkSql, [id, ownerId], (err, results) => {
      if (err) {
        console.error('❌ DB Error (check):', err);
        return res.status(500).json({ message: 'Server error.' });
      }
      if (results.length === 0) {
        return res.status(403).json({ message: 'Not authorized.' });
      }

      const insertSql = 'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = ?';
      db.query(insertSql, [id, memberId, role, role], (err) => {
        if (err) {
          console.error('❌ DB Error (add member):', err);
          return res.status(500).json({ message: 'Failed to add member.' });
        }
        console.log('✅ Member added to project');
        res.json({ success: true, message: 'Member added!' });
      });
    });
  } catch (error) {
    console.error('❌ Error in addProjectMember:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// REMOVE project member
export const removeProjectMember = (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ message: 'Only manager/admin can remove members.' });
    }

    const { id, userId } = req.params;
    const ownerId = req.user.id;

    const checkSql = 'SELECT id FROM projects WHERE id = ? AND owner_id = ?';
    db.query(checkSql, [id, ownerId], (checkErr, checkRows) => {
      if (checkErr) {
        console.error('❌ DB Error (check owner):', checkErr);
        return res.status(500).json({ message: 'Server error.' });
      }

      if (checkRows.length === 0) {
        return res.status(403).json({ message: 'Not authorized.' });
      }

      const sql = 'DELETE FROM project_members WHERE project_id = ? AND user_id = ?';
      db.query(sql, [id, userId], (err) => {
        if (err) {
          console.error('❌ DB Error:', err);
          return res.status(500).json({ message: 'Server error.' });
        }
        console.log('✅ Member removed from project');
        res.json({ success: true, message: 'Member removed!' });
      });
    });
  } catch (error) {
    console.error('❌ Error in removeProjectMember:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
