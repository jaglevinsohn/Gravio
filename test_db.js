const db = require('./backend/db/db.js');
db.serialize(() => {
    db.all(`SELECT id FROM courses WHERE student_id = 1`, [], (err, courses) => {
        console.log("courses:", courses);
        const courseIds = courses.map(c => c.id);
        if (courseIds.length === 0) return;
        db.all(`SELECT * FROM categories WHERE course_id IN (${courseIds.join(',')})`, [], (err, categories) => {
            console.log("categories for student 1:", categories);
        });
    });
});
