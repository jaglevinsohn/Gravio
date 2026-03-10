const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'clearview.db');
const db = new sqlite3.Database(dbPath);

// Usage: node seedMockData.js <firebase_uid>
const firebaseUid = process.argv[2];

if (!firebaseUid) {
    console.error("Please provide the Firebase UID as an argument.");
    process.exit(1);
}

console.log(`Seeding mock data for user: ${firebaseUid}`);

db.serialize(() => {
    // 1. Insert Mock Student
    db.run(
        `INSERT INTO students (user_id, name, school) VALUES (?, ?, ?)`,
        [firebaseUid, 'Alex (Demo Student)', 'Springfield High School'],
        function (err) {
            if (err) return console.error(err);
            const studentId = this.lastID;
            console.log(`Inserted Mock Student with ID: ${studentId}`);

            // 2. Insert Mock Courses
            const courses = [
                { name: 'AP Calculus BC', teacher: 'Mr. Johnson' },
                { name: 'AP Physics C', teacher: 'Dr. Smith' },
                { name: 'World History', teacher: 'Ms. Davis' },
                { name: 'English Literature', teacher: 'Mr. Wilson' }
            ];

            courses.forEach(course => {
                db.run(
                    `INSERT INTO courses (student_id, name, teacher) VALUES (?, ?, ?)`,
                    [studentId, course.name, course.teacher],
                    function (err) {
                        if (err) return console.error(err);
                        const courseId = this.lastID;
                        console.log(`Inserted Course: ${course.name} (ID: ${courseId})`);

                        // 3. Insert Mock Grades
                        const percentage = Math.floor(Math.random() * (100 - 80 + 1)) + 80; // 80-100%
                        const letterGrade = percentage >= 90 ? 'A' : 'B';

                        db.run(
                            `INSERT INTO grades (course_id, percentage, letter_grade) VALUES (?, ?, ?)`,
                            [courseId, percentage, letterGrade]
                        );

                        // 4. Insert Categories
                        const categories = [
                            { name: 'Tests & Quizzes', weight: 50, percentage: percentage + (Math.random() * 5 - 2) },
                            { name: 'Homework', weight: 20, percentage: percentage + (Math.random() * 10 - 5) },
                            { name: 'Projects', weight: 30, percentage: percentage + (Math.random() * 8 - 4) }
                        ];

                        categories.forEach(cat => {
                            db.run(
                                `INSERT INTO categories (course_id, name, weight, percentage) VALUES (?, ?, ?, ?)`,
                                [courseId, cat.name, cat.weight, Math.min(100, Math.max(0, cat.percentage))]
                            );
                        });

                        // 5. Insert Assignments
                        const today = new Date();
                        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                        const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 5);

                        // Recent graded assignment
                        db.run(
                            `INSERT INTO assignments (course_id, name, due_date, score, max_score, is_late) VALUES (?, ?, ?, ?, ?, ?)`,
                            [courseId, 'Chapter Review', today.toISOString().split('T')[0], 9, 10, 0]
                        );

                        // Upcoming pending assignment
                        db.run(
                            `INSERT INTO assignments (course_id, name, due_date, score, max_score, is_late) VALUES (?, ?, ?, ?, ?, ?)`,
                            [courseId, course.name.includes('AP') ? 'Practice Exam' : 'Weekly Reading', course.name.includes('History') ? today.toISOString().split('T')[0] : tomorrow.toISOString().split('T')[0], null, 100, 0]
                        );
                    }
                );
            });
        }
    );
});

console.log("Mock data seeding initiated. It should appear in the dashboard momentarily.");
