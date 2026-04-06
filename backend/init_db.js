import db from './config/db.js';

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'developer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const createProjectsTable = `
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(120) DEFAULT 'from-blue-500 to-cyan-500',
  owner_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

const createTasksTable = `
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  summary VARCHAR(500),
  project_id INT NOT NULL,
  assignee_id INT,
  status ENUM('todo', 'in-progress', 'review', 'done') DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  skills JSON,
  ai_assigned BOOLEAN DEFAULT FALSE,
  progress_percent INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);
`;

const createProjectMembersTable = `
CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_member (project_id, user_id)
);
`;

const createDeveloperProfilesTable = `
CREATE TABLE IF NOT EXISTS developer_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  skills JSON,
  experience_level ENUM('junior', 'mid', 'senior') DEFAULT 'mid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

const createNotificationsTable = `
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  project_id INT NULL,
  task_id INT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
`;

db.query(createUsersTable, (err) => {
  if (err) {
    console.error('❌ Error creating users table:', err.message);
  } else {
    console.log('✅ Users table is ready!');
  }
  const normalizeLegacyRolesSql = `
    UPDATE users
    SET role = 'developer'
    WHERE role IS NULL OR role = '' OR role = 'user' OR role = 'team'
  `;

  db.query(normalizeLegacyRolesSql, () => {
    db.query(createProjectsTable, (err) => {
    if (err) {
      console.error('❌ Error creating projects table:', err.message);
    } else {
      console.log('✅ Projects table is ready!');
    }
    const colorColumnCheckSql = `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'projects'
        AND COLUMN_NAME = 'color'
      LIMIT 1
    `;

    db.query(colorColumnCheckSql, (checkErr, rows) => {
      if (checkErr) {
        console.error('❌ Error checking projects.color column:', checkErr.message);
      }

      const ensureTasksAndMembers = () => {
        db.query(createTasksTable, (err) => {
          if (err) {
            console.error('❌ Error creating tasks table:', err.message);
          } else {
            console.log('✅ Tasks table is ready!');
          }

          // Add progress_percent column to existing tables if it doesn't exist
          const checkProgressColumnSql = `
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'tasks'
              AND COLUMN_NAME = 'progress_percent'
            LIMIT 1
          `;

          db.query(checkProgressColumnSql, (checkErr, rows) => {
            if (!checkErr && (!rows || rows.length === 0)) {
              const addProgressColumnSql = `
                ALTER TABLE tasks
                ADD COLUMN progress_percent INT DEFAULT 0
              `;
              db.query(addProgressColumnSql, (addErr) => {
                if (addErr) {
                  console.error('❌ Error adding progress_percent column:', addErr.message);
                } else {
                  console.log('✅ Added progress_percent column to tasks table');
                }
              });
            }
          });

          db.query(createProjectMembersTable, (err) => {
            if (err) {
              console.error('❌ Error creating project_members table:', err.message);
            } else {
              console.log('✅ Project members table is ready!');
            }

            db.query(createDeveloperProfilesTable, (profileErr) => {
              if (profileErr) {
                console.error('❌ Error creating developer_profiles table:', profileErr.message);
              } else {
                console.log('✅ Developer profiles table is ready!');
              }

              db.query(createNotificationsTable, (notificationErr) => {
                if (notificationErr) {
                  console.error('❌ Error creating notifications table:', notificationErr.message);
                } else {
                  console.log('✅ Notifications table is ready!');
                }

                process.exit();
              });
            });
          });
        });
      };

      if (rows && rows.length > 0) {
        ensureTasksAndMembers();
        return;
      }

      const addProjectColorColumnSql = `
        ALTER TABLE projects
        ADD COLUMN color VARCHAR(120) DEFAULT 'from-blue-500 to-cyan-500'
      `;

      db.query(addProjectColorColumnSql, (colorErr) => {
        if (colorErr) {
          console.error('❌ Error adding projects.color column:', colorErr.message);
        }

        ensureTasksAndMembers();
      });
    });
    });
  });
});
