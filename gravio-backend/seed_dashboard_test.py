from db.database import SessionLocal
from db.models import Student, Course, Category, Assignment, SchoologyConnection
from datetime import datetime, timedelta

def seed_db():
    db = SessionLocal()
    
    # Clean the slate
    db.query(Assignment).delete()
    db.query(Course).delete()
    db.query(Student).delete()
    db.query(SchoologyConnection).delete()
    db.commit()
    
    # 0. Create Connection
    conn = SchoologyConnection(
        user_id=1, 
        schoology_username='testuser', 
        connection_status='active',
        created_at=datetime.utcnow(),
        last_sync_at=datetime.utcnow()
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    
    # 1. Create a dummy student
    student = Student(
        connection_id=conn.id,
        external_student_id='ext_s_1',
        name='Test Student',
        school_name='Test High School'
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    
    # 2. Add course
    course = Course(
        student_id=student.id,
        external_course_id='course_123',
        title='AP Computer Science',
        current_grade='95',
        grading_mode='percentage'
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    
    now = datetime.now()
    due_today = now.strftime('%Y-%m-%d %H:%M:%S')
    due_past = (now - timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S')
    due_future = (now + timedelta(days=2)).strftime('%Y-%m-%d %H:%M:%S')
    
    # 3. Add varied assignment states
    
    # Missing / Overdue
    a1 = Assignment(
        course_id=course.id,
        external_assignment_id='ext_1',
        title='Missing Homework (Will show OVERDUE)',
        due_date=due_past,
        submission_status='not_submitted',
        grading_status='ungraded',
        timeliness_status='overdue',
        max_score=100
    )
    
    # Submitted but ungraded (Awaiting grade)
    a2 = Assignment(
        course_id=course.id,
        external_assignment_id='ext_2',
        title='Submitted Essay (Awaiting Grade)',
        due_date=due_past,
        submission_status='submitted',
        grading_status='ungraded',
        timeliness_status='on_time',
        submitted_at=datetime.utcnow(),
        max_score=100
    )
    
    # Submitted Late
    a3 = Assignment(
        course_id=course.id,
        external_assignment_id='ext_3',
        title='Late Project (Submitted Late)',
        due_date=due_past,
        submission_status='submitted',
        grading_status='ungraded',
        timeliness_status='late_submitted',
        max_score=100
    )
    
    # Upcoming
    a4 = Assignment(
        course_id=course.id,
        external_assignment_id='ext_4',
        title='Upcoming Quiz (UPCOMING)',
        due_date=due_future,
        submission_status='not_submitted',
        grading_status='ungraded',
        timeliness_status='upcoming',
        max_score=100
    )
    
    # Graded
    a5 = Assignment(
        course_id=course.id,
        external_assignment_id='ext_5',
        title='Graded Midterm',
        due_date=due_past,
        submission_status='submitted',
        grading_status='graded',
        timeliness_status='on_time',
        score=95,
        max_score=100,
        grade_text='95'
    )
                        
    db.add_all([a1, a2, a3, a4, a5])
    db.commit()
    print("Test data seeded successfully!")

if __name__ == '__main__':
    seed_db()
