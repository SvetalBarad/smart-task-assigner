import db from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

const normalizeSkills = (skills) => {
  if (Array.isArray(skills)) {
    return skills
      .map((skill) => String(skill || '').trim())
      .filter(Boolean);
  }

  if (typeof skills === 'string') {
    return skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeExperienceLevel = (experienceLevel) => {
  const value = String(experienceLevel || '').trim().toLowerCase();
  if (value === 'junior' || value === 'mid' || value === 'senior') {
    return value;
  }
  return 'mid';
};

const normalizeRole = (role) => {
  const value = String(role || '').trim().toLowerCase();

  if (value === 'admin' || value === 'manager') return 'manager';
  if (value === 'team' || value === 'developer') return 'developer';
  if (value === 'user') return 'developer';

  return null;
};

const issueTokenAndUser = (user) => {
  const normalizedRole = normalizeRole(user.role) || 'developer';

  const token = jwt.sign(
    { id: user.id, email: user.email, role: normalizedRole },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1d' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: normalizedRole },
  };
};

// Middleware to verify JWT token
export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// REGISTER
export const register = (req, res) => {
  console.log('📝 Register attempt for:', req.body.email);
  try {
    const { name, email, password, role, skills, experienceLevel } = req.body;
    const normalizedRole = normalizeRole(role);
    const normalizedSkills = normalizeSkills(skills);
    const normalizedExperienceLevel = normalizeExperienceLevel(experienceLevel);

    if (!name || !email || !password || !normalizedRole) {
      console.log('❌ Missing fields');
      return res.json({ message: 'Name, email, password and valid role are required.' });
    }

    if (normalizedRole === 'developer' && normalizedSkills.length === 0) {
      return res.json({ message: 'Please add at least one skill for team/developer role.' });
    }
    
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('❌ DB Error (SELECT):', err);
        return res.json({ message: 'Server error. Please try again.' });
      }
      if (results.length > 0) {
        console.log('❌ Email already registered');
        return res.json({ message: 'Email already registered. Please login.' });
      }
      
      const hashedPassword = bcrypt.hashSync(password, 10);
      const sql = 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)';
      
      db.query(sql, [name, email, hashedPassword, normalizedRole], (err, insertResult) => {
        if (err) {
          console.error('❌ DB Error (INSERT):', err);
          return res.json({ message: 'Registration failed.' });
        }

        if (normalizedRole !== 'developer') {
          console.log('✅ User registered successfully:', email);
          return res.json({ success: true, message: 'Account created successfully!' });
        }

        const profileSql = `
          INSERT INTO developer_profiles (user_id, skills, experience_level)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE skills = VALUES(skills), experience_level = VALUES(experience_level)
        `;

        db.query(
          profileSql,
          [insertResult.insertId, JSON.stringify(normalizedSkills), normalizedExperienceLevel],
          (profileErr) => {
            if (profileErr) {
              console.error('❌ DB Error (developer profile insert):', profileErr);
              return res.status(500).json({ message: 'User created but failed to save developer profile.' });
            }

            console.log('✅ User registered successfully:', email);
            return res.json({ success: true, message: 'Account created successfully!' });
          }
        );
      });
    });
  } catch (error) {
    console.error('❌ Catch Block Error in register:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// LOGIN
export const login = (req, res) => {
  console.log('🔑 Login attempt for:', req.body.email);
  try {
    const { email, password, role } = req.body;
    const selectedRole = normalizeRole(role);

    if (!email || !password) {
      return res.json({ message: 'All fields are required.' });
    }

    if (!selectedRole) {
      return res.json({ message: 'Please select a valid role.' });
    }
    
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
      if (err) {
        console.error('❌ DB Error (SELECT login):', err);
        return res.json({ message: 'Server error. Please try again.' });
      }
      if (results.length === 0) {
        return res.json({ message: 'User not found.' });
      }
      
      const user  = results[0];
      const dbRole = normalizeRole(user.role) || 'developer';

      if (dbRole !== selectedRole) {
        return res.json({ message: `This account is registered as ${dbRole}, not ${selectedRole}.` });
      }

      const match = bcrypt.compareSync(password, user.password);
      if (!match) {
        return res.json({ message: 'Wrong password.' });
      }
      
      console.log('✅ User logged in successfully:', email);
      res.json(issueTokenAndUser(user));
    });
  } catch (error) {
    console.error('❌ Catch Block Error in login:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// FORGOT PASSWORD (email + new password)
export const forgotPassword = (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    db.query('SELECT id FROM users WHERE email = ?', [email], (selectErr, users) => {
      if (selectErr) {
        console.error('❌ DB Error (forgot/select):', selectErr);
        return res.status(500).json({ message: 'Server error. Please try again.' });
      }

      if (users.length === 0) {
        return res.status(404).json({ message: 'No account found for this email.' });
      }

      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      const userId = users[0].id;

      db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], (updateErr) => {
        if (updateErr) {
          console.error('❌ DB Error (forgot/update):', updateErr);
          return res.status(500).json({ message: 'Failed to reset password.' });
        }

        console.log('✅ Password reset for user:', userId);
        return res.json({ success: true, message: 'Password reset successfully. Please sign in.' });
      });
    });
  } catch (error) {
    console.error('❌ Catch Block Error in forgotPassword:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// GOOGLE SIGN IN
export const googleSignIn = async (req, res) => {
  try {
    const { credential } = req.body;
    const audience = process.env.GOOGLE_CLIENT_ID;

    if (!audience) {
      return res.status(500).json({ message: 'Google Sign-In is not configured on server.' });
    }

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(400).json({ message: 'Google account email is missing.' });
    }

    const email = payload.email;
    const name = payload.name || email.split('@')[0] || 'Google User';

    db.query('SELECT * FROM users WHERE email = ?', [email], (selectErr, users) => {
      if (selectErr) {
        console.error('❌ DB Error (google/select):', selectErr);
        return res.status(500).json({ message: 'Server error. Please try again.' });
      }

      if (users.length > 0) {
        console.log('✅ Google login successful for existing user:', email);
        return res.json(issueTokenAndUser(users[0]));
      }

      const generatedPassword = `google_${payload.sub || Date.now()}`;
      const hashedPassword = bcrypt.hashSync(generatedPassword, 10);

      db.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, 'developer'],
        (insertErr, result) => {
          if (insertErr) {
            console.error('❌ DB Error (google/insert):', insertErr);
            return res.status(500).json({ message: 'Failed to create user from Google account.' });
          }

          const profileSql = `
            INSERT INTO developer_profiles (user_id, skills, experience_level)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE skills = VALUES(skills), experience_level = VALUES(experience_level)
          `;

          db.query(profileSql, [result.insertId, JSON.stringify([]), 'mid'], (profileErr) => {
            if (profileErr) {
              console.error('❌ DB Error (google/profile):', profileErr);
            }

            const createdUser = { id: result.insertId, name, email, role: 'developer' };
            console.log('✅ Google login successful for new user:', email);
            return res.json(issueTokenAndUser(createdUser));
          });
        }
      );
    });
  } catch (error) {
    console.error('❌ Google Sign-In verification error:', error);
    res.status(401).json({ message: 'Google authentication failed.' });
  }
};

// UPDATE PROFILE
export const updateProfile = (req, res) => {
  try {
    const { name, email, skills, experienceLevel } = req.body;
    const userId = req.user.id;
    const role = normalizeRole(req.user.role) || 'developer';

    if (!name || !email) {
      return res.json({ message: 'Name and email are required.' });
    }

    // Check if email is already taken by another user
    db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, results) => {
      if (err) {
        console.error('❌ DB Error (email check):', err);
        return res.json({ message: 'Server error. Please try again.' });
      }
      if (results.length > 0) {
        return res.json({ message: 'Email already in use by another account.' });
      }

      const sql = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
      db.query(sql, [name, email, userId], (err) => {
        if (err) {
          console.error('❌ DB Error (UPDATE):', err);
          return res.json({ message: 'Failed to update profile.' });
        }

        if (role !== 'developer') {
          console.log('✅ Profile updated for user:', userId);
          return res.json({
            success: true,
            message: 'Profile updated successfully!',
            user: { id: userId, name, email, role }
          });
        }

        const normalizedSkills = normalizeSkills(skills);
        const normalizedExperienceLevel = normalizeExperienceLevel(experienceLevel);

        const profileSql = `
          INSERT INTO developer_profiles (user_id, skills, experience_level)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE skills = VALUES(skills), experience_level = VALUES(experience_level)
        `;

        db.query(profileSql, [userId, JSON.stringify(normalizedSkills), normalizedExperienceLevel], (profileErr) => {
          if (profileErr) {
            console.error('❌ DB Error (UPDATE profile):', profileErr);
            return res.status(500).json({ message: 'Failed to update developer profile.' });
          }

          console.log('✅ Profile updated for user:', userId);
          return res.json({
            success: true,
            message: 'Profile updated successfully!',
            user: { id: userId, name, email, role }
          });
        });
      });
    });
  } catch (error) {
    console.error('❌ Catch Block Error in updateProfile:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// CHANGE PASSWORD
export const changePassword = (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.json({ message: 'Current and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.json({ message: 'New password must be at least 6 characters.' });
    }

    db.query('SELECT password FROM users WHERE id = ?', [userId], (err, results) => {
      if (err) {
        console.error('❌ DB Error (get password):', err);
        return res.json({ message: 'Server error. Please try again.' });
      }
      if (results.length === 0) {
        return res.json({ message: 'User not found.' });
      }

      const user = results[0];
      const match = bcrypt.compareSync(currentPassword, user.password);

      if (!match) {
        return res.json({ message: 'Current password is incorrect.' });
      }

      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      const sql = 'UPDATE users SET password = ? WHERE id = ?';
      db.query(sql, [hashedPassword, userId], (err) => {
        if (err) {
          console.error('❌ DB Error (password update):', err);
          return res.json({ message: 'Failed to change password.' });
        }
        console.log('✅ Password changed for user:', userId);
        res.json({ success: true, message: 'Password changed successfully!' });
      });
    });
  } catch (error) {
    console.error('❌ Catch Block Error in changePassword:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
