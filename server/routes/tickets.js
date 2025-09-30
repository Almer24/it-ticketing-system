const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { auth, requireUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ticket-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Create new ticket
router.post('/', [
  auth,
  requireUser,
  upload.single('photo'),
  // department will be taken from req.user for non-admins.
  // Make department optional in validators; enforce for admins in handler below.
  body('department').optional().isString(),
  body('equipment_type').notEmpty().withMessage('Equipment type is required').isString().trim(),
  body('problem_description').notEmpty().withMessage('Problem description is required'),
  body('issue_date').isISO8601().withMessage('Valid issue date is required')
], async (req, res) => {
  let conn;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Determine department: if user is Admin allow req.body.department (must be provided),
    // otherwise use req.user.department (ignore any client-provided value).
    let department;
    if (String(req.user.role || '').toLowerCase() === 'admin') {
      department = req.body.department;
      if (!department) {
        return res.status(400).json({ errors: [{ msg: 'Department is required for admin', param: 'department' }] });
      }
    } else {
      department = req.user.department; // enforce server-side
    }
    const { equipment_type, problem_description, issue_date } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Use a transaction + SELECT ... FOR UPDATE to generate a unique sequential ticket number
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const prefix = 'TKT';
    const year = new Date().getFullYear();

    // Lock the relevant rows while we compute the next number
    const [rows] = await conn.execute(
      `SELECT ticket_number
       FROM tickets
       WHERE YEAR(created_at) = ?
       ORDER BY ticket_number DESC
       LIMIT 1 FOR UPDATE`,
      [year]
    );

    let nextCount = 1;
    if (rows.length > 0 && rows[0].ticket_number) {
      const last = rows[0].ticket_number;
      const lastNumStr = last.replace(`${prefix}${year}`, '');
      const parsed = parseInt(lastNumStr, 10);
      if (!Number.isNaN(parsed)) {
        nextCount = parsed + 1;
      }
    }

    const ticket_number = `${prefix}${year}${nextCount.toString().padStart(4, '0')}`;

    const [result] = await conn.execute(
      `INSERT INTO tickets (ticket_number, department, equipment_type, problem_description, 
        issue_date, photo_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ticket_number, department, equipment_type, problem_description, issue_date, photo_url, req.user.id]
    );

    await conn.execute(
      'INSERT INTO ticket_updates (ticket_id, user_id, update_type, new_value, notes) VALUES (?, ?, ?, ?, ?)',
      [result.insertId, req.user.id, 'status_change', 'Pending', 'Ticket created']
    );

    await conn.commit();
    conn.release();
    conn = null;

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: {
        id: result.insertId,
        ticket_number,
        department,
        equipment_type,
        problem_description,
        issue_date,
        photo_url,
        status: 'Pending'
      }
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    if (conn) {
      try { await conn.rollback(); conn.release(); } catch (e) { /* ignore */ }
    }
    // If duplicate still somehow occurs, return 409 so client can retry
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Duplicate ticket number generated; please retry' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tickets (filtered by user role)
router.get('/', auth, requireUser, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;
    const { status, department, search, created_by } = req.query;

    const where = [];
    const params = [];

    // non-admin users only see their tickets regardless of created_by param
    if (String(req.user.role || '').toLowerCase() !== 'admin') {
      where.push('t.created_by = ?');
      params.push(req.user.id);
    } else {
      // admin may filter by created_by query param
      if (created_by && String(created_by).trim().length > 0 && !Number.isNaN(Number(created_by))) {
        where.push('t.created_by = ?');
        params.push(Number(created_by));
      }
    }

    if (status) {
      where.push('t.status = ?');
      params.push(status);
    }

    if (department) {
      where.push('t.department = ?');
      params.push(department);
    }

    if (search && String(search).trim().length > 0) {
      const term = `%${String(search).trim()}%`;
      where.push('(t.ticket_number LIKE ? OR t.problem_description LIKE ? OR t.equipment_type LIKE ? OR t.department LIKE ?)');
      params.push(term, term, term, term);
    }

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countQuery = `SELECT COUNT(*) as total FROM tickets t ${whereSQL}`;
    const [countRows] = await pool.execute(countQuery, params);
    const totalItems = countRows[0].total || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const listQuery = `
      SELECT t.*
      FROM tickets t
      ${whereSQL}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const listParams = params.slice();
    listParams.push(limit, offset);

    const [rows] = await pool.execute(listQuery, listParams);

    res.json({
      tickets: rows,
      pagination: {
        current: page,
        total: totalPages,
        totalItems
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single ticket with updates
router.get('/:id', auth, requireUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = `
      SELECT t.*, u.username as created_by_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `;
    
    const queryParams = [id];

    // Add user role filter
    if (req.user.role === 'user') {
      query += ' AND t.created_by = ?';
      queryParams.push(req.user.id);
    }

    const [tickets] = await pool.execute(query, queryParams);

    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Get ticket updates
    const [updates] = await pool.execute(`
      SELECT tu.*, u.username
      FROM ticket_updates tu
      JOIN users u ON tu.user_id = u.id
      WHERE tu.ticket_id = ?
      ORDER BY tu.created_at DESC
    `, [id]);

    res.json({
      ticket,
      updates
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update ticket status (admin/IT only)
router.put('/:id/status', [
  auth,
  requireAdmin,
  body('status').isIn(['Pending', 'In Progress', 'On Hold', 'Done', 'Closed']).withMessage('Invalid status'),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    // Get current ticket
    const [tickets] = await pool.execute(
      'SELECT status FROM tickets WHERE id = ?',
      [id]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Prevent modifications to closed tickets
    if (tickets[0].status === 'Closed') {
      return res.status(400).json({ message: 'Cannot modify a closed ticket' });
    }

    const oldStatus = tickets[0].status;

    // Update ticket status
    await pool.execute(
      'UPDATE tickets SET status = ? WHERE id = ?',
      [status, id]
    );

    // Add status update record
    await pool.execute(
      'INSERT INTO ticket_updates (ticket_id, user_id, update_type, old_value, new_value, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.user.id, 'status_change', oldStatus, status, notes]
    );

    res.json({ message: 'Ticket status updated successfully' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add note to ticket
router.post('/:id/notes', [
  auth,
  requireUser,
  body('notes').notEmpty().withMessage('Notes are required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { notes } = req.body;

    // Verify ticket exists and user has access
    let query = 'SELECT id, status FROM tickets WHERE id = ?';
    const queryParams = [id];

    if (req.user.role === 'user') {
      query += ' AND created_by = ?';
      queryParams.push(req.user.id);
    }

    const [tickets] = await pool.execute(query, queryParams);

    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Prevent modifications to closed tickets
    if (tickets[0].status === 'Closed') {
      return res.status(400).json({ message: 'Cannot modify a closed ticket' });
    }

    // Add note
    await pool.execute(
      'INSERT INTO ticket_updates (ticket_id, user_id, update_type, notes) VALUES (?, ?, ?, ?)',
      [id, req.user.id, 'note', notes]
    );

    res.json({ message: 'Note added successfully' });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get ticket history
router.get('/:id/history', auth, requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ticket exists and user has access
    let query = 'SELECT id FROM tickets WHERE id = ?';
    const queryParams = [id];

    if (req.user.role === 'user') {
      query += ' AND created_by = ?';
      queryParams.push(req.user.id);
    }

    const [tickets] = await pool.execute(query, queryParams);

    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Get all updates
    const [updates] = await pool.execute(`
      SELECT tu.*, u.username, u.department
      FROM ticket_updates tu
      JOIN users u ON tu.user_id = u.id
      WHERE tu.ticket_id = ?
      ORDER BY tu.created_at ASC
    `, [id]);

    res.json({ updates });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete ticket (admin can delete any ticket, users can only delete their own)
router.delete('/:id', auth, requireUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ticket exists and user has access
    let query = 'SELECT id, photo_url, status FROM tickets WHERE id = ?';
    const queryParams = [id];

    if (req.user.role === 'user') {
      query += ' AND created_by = ?';
      queryParams.push(req.user.id);
    }

    const [tickets] = await pool.execute(query, queryParams);

    if (tickets.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Prevent deletion of closed tickets
    if (ticket.status === 'Closed') {
      return res.status(400).json({ message: 'Cannot delete a closed ticket' });
    }

    // Delete associated photo file if it exists
    if (ticket.photo_url) {
      const photoPath = path.join(__dirname, '..', ticket.photo_url);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    // Delete ticket (ticket_updates will be deleted automatically due to CASCADE)
    await pool.execute('DELETE FROM tickets WHERE id = ?', [id]);

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;