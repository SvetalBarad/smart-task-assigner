import db from '../config/db.js';

export const getMyNotifications = (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
      SELECT id, user_id, project_id, task_id, title, message, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `;

    db.query(sql, [userId], (err, rows) => {
      if (err) {
        console.error('DB Error (get notifications):', err);
        return res.status(500).json({ message: 'Failed to fetch notifications.' });
      }

      return res.json({ success: true, notifications: rows || [] });
    });
  } catch (error) {
    console.error('Error in getMyNotifications:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

export const markNotificationAsRead = (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const sql = 'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?';

    db.query(sql, [id, userId], (err, result) => {
      if (err) {
        console.error('DB Error (mark read):', err);
        return res.status(500).json({ message: 'Failed to update notification.' });
      }

      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Notification not found.' });
      }

      return res.json({ success: true, message: 'Notification marked as read.' });
    });
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

export const markAllNotificationsAsRead = (req, res) => {
  try {
    const userId = req.user.id;
    const sql = 'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE';

    db.query(sql, [userId], (err) => {
      if (err) {
        console.error('DB Error (mark all read):', err);
        return res.status(500).json({ message: 'Failed to update notifications.' });
      }

      return res.json({ success: true, message: 'All notifications marked as read.' });
    });
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};
