const db = require('../db/db');

// Function to run SQLite commands with promises
const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const getQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const getFutureDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

async function runSyncForUser(userId) {
    // 1. Check if students exist for user, else create
    let emma = await getQuery('SELECT id FROM students WHERE user_id = ? AND name = ?', [userId, 'Emma']);
    if (!emma) {
        const result = await runQuery('INSERT INTO students (user_id, name, school) VALUES (?, ?, ?)', [userId, 'Emma', 'Springfield High']);
        emma = { id: result.lastID };
    }

    let noah = await getQuery('SELECT id FROM students WHERE user_id = ? AND name = ?', [userId, 'Noah']);
    if (!noah) {
        const result = await runQuery('INSERT INTO students (user_id, name, school) VALUES (?, ?, ?)', [userId, 'Noah', 'Springfield Middle']);
        noah = { id: result.lastID };
    }

    // Clear existing mock data to ensure clean state
    await runQuery('DELETE FROM courses WHERE student_id IN (?, ?)', [emma.id, noah.id]);

    const emmaCourses = [
        {
            name: 'ENG-301 AP English Language & Composition', teacher: 'Mr. Smith',
            grade: { percentage: 93.8, letter: 'A' },
            categories: [
                { name: 'Essays', weight: 40, percentage: 94 },
                { name: 'Reading Quizzes', weight: 30, percentage: 92 },
                { name: 'Participation', weight: 30, percentage: 95 }
            ],
            assignments: [
                { name: 'Gatsby Essay Draft', dueDate: getFutureDate(2), score: null, maxScore: 100, isLate: 0 }
            ]
        },
        {
            name: 'MATH-401 AP Calculus AB', teacher: 'Mrs. Davis',
            grade: { percentage: 88.5, letter: 'B+' },
            categories: [
                { name: 'Homework', weight: 25, percentage: 88.9 },
                { name: 'Tests', weight: 50, percentage: 87.0 },
                { name: 'Quizzes', weight: 15, percentage: 90.0 },
                { name: 'Projects', weight: 10, percentage: null }
            ],
            assignments: [
                { name: 'Integration by Parts HW', dueDate: '2026-02-21', score: 27, maxScore: 30, isLate: 0 },
                { name: 'U-Substitution Practice', dueDate: '2026-02-28', score: 28, maxScore: 30, isLate: 0 },
                { name: 'Differential Equations Set', dueDate: '2026-03-07', score: 25, maxScore: 30, isLate: 1 },
                { name: 'Chapter 6 Test', dueDate: getFutureDate(5), score: null, maxScore: 100, isLate: 0 }
            ]
        },
        {
            name: 'HIST-201 US History', teacher: 'Mr. Johnson',
            grade: { percentage: 96.5, letter: 'A+' },
            categories: [
                { name: 'Tests & Quizzes', weight: 40, percentage: 98 },
                { name: 'Research Papers', weight: 30, percentage: 96 },
                { name: 'Participation', weight: 15, percentage: 95 }
            ],
            assignments: [
                { name: 'WWII Research Outline', dueDate: getFutureDate(1), score: null, maxScore: 50, isLate: 0 }
            ]
        },
        {
            name: 'SCI-301 Chemistry Honors', teacher: 'Dr. Lee',
            grade: { percentage: 91.2, letter: 'A-' },
            categories: [
                { name: 'Labs', weight: 30, percentage: 91 },
                { name: 'Tests', weight: 40, percentage: 92 }
            ],
            assignments: []
        }
    ];

    const noahCourses = [
        {
            name: 'MATH-201 Algebra I', teacher: 'Mr. Baker',
            grade: { percentage: 82.5, letter: 'B-' },
            categories: [
                { name: 'Homework', weight: 30, percentage: 85 },
                { name: 'Tests', weight: 50, percentage: 80 },
                { name: 'Participation', weight: 20, percentage: 85 }
            ],
            assignments: [
                // Make this due tomorrow so a bullet point appears
                { name: 'Linear Equations HW', dueDate: getFutureDate(1), score: null, maxScore: 20, isLate: 0 }
            ]
        },
        {
            name: 'SCI-201 Earth Science', teacher: 'Ms. Green',
            grade: { percentage: 95.0, letter: 'A' },
            categories: [
                { name: 'Labs', weight: 40, percentage: 96 },
                { name: 'Tests', weight: 40, percentage: 94 },
                { name: 'Homework', weight: 20, percentage: 95 }
            ],
            assignments: [
                { name: 'Rock Cycle Project', dueDate: getFutureDate(7), score: null, maxScore: 100, isLate: 0 }
            ]
        },
        {
            name: 'ENG-201 English 8', teacher: 'Mrs. White',
            grade: { percentage: 88.0, letter: 'B+' },
            categories: [
                { name: 'Reading Log', weight: 20, percentage: 90 },
                { name: 'Essays', weight: 50, percentage: 86 },
                { name: 'Vocab Quizzes', weight: 30, percentage: 90 }
            ],
            assignments: [
                { name: 'Chapter 4 Quiz', dueDate: getFutureDate(4), score: null, maxScore: 50, isLate: 0 }
            ]
        }
    ];

    const insertCourses = async (studentId, coursesList) => {
        for (const c of coursesList) {
            const courseResult = await runQuery('INSERT INTO courses (student_id, name, teacher) VALUES (?, ?, ?)', [studentId, c.name, c.teacher]);
            const courseId = courseResult.lastID;

            await runQuery('INSERT INTO grades (course_id, percentage, letter_grade) VALUES (?, ?, ?)', [courseId, c.grade.percentage, c.grade.letter]);

            for (const cat of c.categories) {
                await runQuery('INSERT INTO categories (course_id, name, weight, percentage) VALUES (?, ?, ?, ?)', [courseId, cat.name, cat.weight, cat.percentage]);
            }

            for (const a of c.assignments) {
                await runQuery('INSERT INTO assignments (course_id, name, due_date, score, max_score, is_late) VALUES (?, ?, ?, ?, ?, ?)',
                    [courseId, a.name, a.dueDate, a.score, a.maxScore, a.isLate]);
            }
        }
    };

    await insertCourses(emma.id, emmaCourses);
    await insertCourses(noah.id, noahCourses);
}

module.exports = {
    runSyncForUser
};
