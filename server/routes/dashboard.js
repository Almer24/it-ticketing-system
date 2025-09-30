const express = require('express');
const { pool } = require('../config/database');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    // Total tickets
    const [totalTickets] = await pool.execute('SELECT COUNT(*) as total FROM tickets');
    
    // Tickets by status
    const [statusStats] = await pool.execute(`
      SELECT status, COUNT(*) as count 
      FROM tickets 
      GROUP BY status
    `);
    
    // Tickets by department
    const [departmentStats] = await pool.execute(`
      SELECT department, COUNT(*) as count 
      FROM tickets 
      GROUP BY department
    `);
    
    // Recent tickets (last 7 days)
    const [recentTickets] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM tickets 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    // Average resolution time (for completed tickets)
    const [avgResolution] = await pool.execute(`
      SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours
      FROM tickets 
      WHERE status IN ('Done', 'Closed')
    `);

    // Ensure avgResolutionHours is a valid number
    const avgHours = avgResolution[0].avg_hours;
    const avgResolutionHours = avgHours !== null && !isNaN(avgHours) ? parseFloat(avgHours) : null;

    res.json({
      totalTickets: totalTickets[0].total,
      statusStats,
      departmentStats,
      recentTickets: recentTickets[0].count,
      avgResolutionHours
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get IT team members
router.get('/team', auth, requireAdmin, async (req, res) => {
  try {
    const [team] = await pool.execute(`
      SELECT id, username, email, department, role
      FROM users 
      WHERE role IN ('admin', 'it')
      ORDER BY username
    `);

    res.json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get departments
router.get('/departments', auth, requireAdmin, async (req, res) => {
  try {
    const [departments] = await pool.execute(`
      SELECT DISTINCT department 
      FROM users 
      ORDER BY department
    `);

    res.json({ departments: departments.map(d => d.department) });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate monthly report
router.get('/report/monthly', auth, requireAdmin, async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    // Tickets created in the month
    const [monthlyTickets] = await pool.execute(`
      SELECT 
        t.*,
        u.username as created_by_name,
        a.username as assigned_to_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE MONTH(t.created_at) = ? AND YEAR(t.created_at) = ?
      ORDER BY t.created_at DESC
    `, [targetMonth, targetYear]);

    // Status breakdown
    const [statusBreakdown] = await pool.execute(`
      SELECT status, COUNT(*) as count
      FROM tickets
      WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
      GROUP BY status
    `, [targetMonth, targetYear]);

    // Department breakdown
    const [departmentBreakdown] = await pool.execute(`
      SELECT department, COUNT(*) as count
      FROM tickets
      WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
      GROUP BY department
    `, [targetMonth, targetYear]);

    // Equipment type breakdown
    const [equipmentBreakdown] = await pool.execute(`
      SELECT equipment_type, COUNT(*) as count
      FROM tickets
      WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?
      GROUP BY equipment_type
    `, [targetMonth, targetYear]);

    res.json({
      period: { month: targetMonth, year: targetYear },
      totalTickets: monthlyTickets.length,
      tickets: monthlyTickets,
      statusBreakdown,
      departmentBreakdown,
      equipmentBreakdown
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tickets assigned to current user
router.get('/my-tickets', auth, requireAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, u.username as created_by_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.assigned_to = ?
    `;
    
    const queryParams = [req.user.id];

    if (status) {
      query += ' AND t.status = ?';
      queryParams.push(status);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), offset);

    const [tickets] = await pool.execute(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM tickets WHERE assigned_to = ?';
    const countParams = [req.user.id];
    
    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      tickets,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unassigned tickets
router.get('/unassigned', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT t.*, u.username as created_by_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.assigned_to IS NULL AND t.status != 'Closed'
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [tickets] = await pool.execute(query, [parseInt(limit), offset]);

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM tickets WHERE assigned_to IS NULL AND status != "Closed"'
    );
    const total = countResult[0].total;

    res.json({
      tickets,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    console.error('Get unassigned tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recurring problems (similar descriptions)
router.get('/recurring-problems', auth, requireAdmin, async (req, res) => {
  try {
    const [problems] = await pool.execute(`
      SELECT 
        problem_description,
        COUNT(*) as occurrence_count,
        MIN(created_at) as first_occurrence,
        MAX(created_at) as last_occurrence
      FROM tickets
      GROUP BY problem_description
      HAVING COUNT(*) > 1
      ORDER BY occurrence_count DESC
      LIMIT 10
    `);

    res.json({ recurringProblems: problems });
  } catch (error) {
    console.error('Get recurring problems error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 