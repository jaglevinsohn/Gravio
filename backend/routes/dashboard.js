const express = require('express');
const db = require('../db/db');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-123';

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.userId = decoded.userId;
        next();
    });
};

router.get('/students', authMiddleware, (req, res) => {
    db.all('SELECT * FROM students WHERE user_id = ?', [req.userId], (err, students) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ students });
    });
});

router.get('/student/:id/dashboard', authMiddleware, (req, res) => {
    const studentId = req.params.id;

    // Verify student belongs to user
    db.get('SELECT * FROM students WHERE id = ? AND user_id = ?', [studentId, req.userId], (err, student) => {
        if (err || !student) return res.status(404).json({ error: 'Student not found' });

        db.all(`
      SELECT c.*, g.percentage as current_grade, g.letter_grade 
      FROM courses c 
      LEFT JOIN grades g ON c.id = g.course_id 
      WHERE c.student_id = ?
    `, [studentId], (err, courses) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            const courseIds = courses.map(c => c.id);
            if (courseIds.length === 0) return res.json({ student, courses: [], upcomingAssignments: [] });

            // Get categories
            db.all(`SELECT * FROM categories WHERE course_id IN (${courseIds.join(',')})`, [], (err, categories) => {

                // Get upcoming assignments (score is null or future due_date)
                const today = new Date().toISOString().split('T')[0];
                db.all(`
                    SELECT a.*, c.name as course_name 
                    FROM assignments a
                    JOIN courses c ON a.course_id = c.id
                    WHERE c.student_id = ? AND (a.score IS NULL OR a.due_date >= ?)
                    ORDER BY a.due_date ASC
                    LIMIT 5
                `, [studentId, today], (err, upcomingAssignments) => {

                    const enrichedCourses = courses.map(course => ({
                        ...course,
                        categories: categories?.filter(cat => cat.course_id === course.id) || []
                    }));

                    res.json({
                        student,
                        courses: enrichedCourses,
                        upcomingAssignments: upcomingAssignments || []
                    });
                });
            });
        });
    });
});

router.get('/student/:id/assignments', authMiddleware, (req, res) => {
    const studentId = req.params.id;

    // Verify student belongs to user
    db.get('SELECT * FROM students WHERE id = ? AND user_id = ?', [studentId, req.userId], (err, student) => {
        if (err || !student) return res.status(404).json({ error: 'Student not found' });

        db.all(`
            SELECT a.*, c.name as course_name 
            FROM assignments a
            JOIN courses c ON a.course_id = c.id
            WHERE c.student_id = ?
            ORDER BY a.due_date ASC
        `, [studentId], (err, assignments) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ assignments: assignments || [] });
        });
    });
});

router.get('/student/:id/daily-summary', authMiddleware, (req, res) => {
    const studentId = req.params.id;

    // Verify student belongs to user
    db.get('SELECT * FROM students WHERE id = ? AND user_id = ?', [studentId, req.userId], (err, student) => {
        if (err || !student) return res.status(404).json({ error: 'Student not found' });

        const today = new Date();
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(today.getDate() - 2);

        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        const formatDate = (date) => date.toISOString().split('T')[0];

        // 1. Get recent assignments (graded/completed in last 48 hrs)
        // Note: Our DB doesn't track completion date perfectly, so we'll approximate with score IS NOT NULL 
        // in a real app this would use a submitted_at or graded_at timestamp.
        db.all(`
            SELECT a.name, c.name as course_name 
            FROM assignments a
            JOIN courses c ON a.course_id = c.id
            WHERE c.student_id = ? AND a.score IS NOT NULL
            ORDER BY a.id DESC 
            LIMIT 2
        `, [studentId], (err, recentAssignments) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            // 2. Get upcoming/overdue assignments
            db.all(`
                SELECT a.name, a.due_date, a.is_late, c.name as course_name 
                FROM assignments a
                JOIN courses c ON a.course_id = c.id
                WHERE c.student_id = ? AND a.score IS NULL
                ORDER BY a.due_date ASC
            `, [studentId], (err, pendingAssignments) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                const todayStr = formatDate(today);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const tomorrowStr = formatDate(tomorrow);
                const threeDaysStr = formatDate(threeDaysFromNow);
                const sevenDaysStr = formatDate(sevenDaysFromNow);

                const overdue = [];
                const dueToday = [];
                const dueTomorrow = [];
                const upcomingTests = [];

                pendingAssignments.forEach(a => {
                    const isTest = a.name.toLowerCase().includes('test') ||
                        a.name.toLowerCase().includes('quiz') ||
                        a.name.toLowerCase().includes('exam');

                    if (a.due_date < todayStr || a.is_late) {
                        overdue.push(a);
                    } else if (a.due_date === todayStr) {
                        dueToday.push(a);
                    } else if (a.due_date === tomorrowStr) {
                        dueTomorrow.push(a);
                    }

                    if (isTest && a.due_date >= todayStr && a.due_date <= sevenDaysStr) {
                        upcomingTests.push(a);
                    }
                });

                // Generate Output Object
                const studentName = student.name.split(' ')[0];
                let recentActivity = "";
                let focusTasks = [];
                let closingOutlook = "";

                // 1. Recent Activity
                if (recentAssignments && recentAssignments.length > 0) {
                    if (recentAssignments.length === 1) {
                        recentActivity = `${studentName} recently completed the ${recentAssignments[0].name} for ${recentAssignments[0].course_name.split(' ').slice(1).join(' ')}.`;
                    } else {
                        recentActivity = `${studentName} recently completed the ${recentAssignments[0].name} for ${recentAssignments[0].course_name.split(' ').slice(1).join(' ')} and submitted a ${recentAssignments[1].name} in ${recentAssignments[1].course_name.split(' ').slice(1).join(' ')}.`;
                    }
                } else {
                    recentActivity = `${studentName} has been actively participating in classes this week.`;
                }

                // 2. Today's Focus
                if (overdue.length > 0) {
                    focusTasks.push(`Finish the ${overdue[0].name} for ${overdue[0].course_name.split(' ').slice(1).join(' ')}`);
                }

                if (dueToday.length > 0 && focusTasks.length < 2) {
                    focusTasks.push(`Complete the ${dueToday[0].name} for ${dueToday[0].course_name.split(' ').slice(1).join(' ')}`);
                }

                if (dueTomorrow.length > 0 && focusTasks.length < 2) {
                    focusTasks.push(`Work on the ${dueTomorrow[0].name} for ${dueTomorrow[0].course_name.split(' ').slice(1).join(' ')}`);
                }

                if (upcomingTests.length > 0 && focusTasks.length < 2) {
                    focusTasks.push(`Review material for the upcoming ${upcomingTests[0].name} for ${upcomingTests[0].course_name.split(' ').slice(1).join(' ')} later this week`);
                }

                res.json({
                    daily_summary: {
                        recent_activity: recentActivity,
                        focus_tasks: focusTasks
                    }
                });
            });
        });
    });
});

router.get('/course/:id', authMiddleware, (req, res) => {
    const courseId = req.params.id;
    db.get(`
    SELECT c.*, g.percentage as overall_grade, g.letter_grade
    FROM courses c
    LEFT JOIN grades g ON c.id = g.course_id
    WHERE c.id = ?
  `, [courseId], (err, course) => {
        if (err || !course) return res.status(404).json({ error: 'Course not found' });

        db.all('SELECT * FROM categories WHERE course_id = ?', [courseId], (err, categories) => {
            db.all('SELECT * FROM assignments WHERE course_id = ? ORDER BY due_date DESC', [courseId], (err, assignments) => {
                res.json({
                    course,
                    categories: categories || [],
                    assignments: assignments || []
                });
            });
        });
    });
});

module.exports = router;
