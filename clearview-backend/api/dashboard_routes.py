from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from db.database import get_db
from db.models import Student, Course, Assignment, Category, SchoologyConnection

router = APIRouter()

@router.get("/students")
def get_dashboard_students(user_id: str = "1", db: Session = Depends(get_db)):
    connection = db.query(SchoologyConnection).filter(SchoologyConnection.user_id == user_id).first()
    if not connection: 
        return {"students": []}
    students = db.query(Student).filter(Student.connection_id == connection.id).all()
    return {"students": [{"id": s.id, "name": s.name, "school": s.school_name} for s in students]}

@router.get("/student/{student_id}/dashboard")
def get_student_dashboard(student_id: int, user_id: str = "1", db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student: 
        return {}
    
    courses_db = db.query(Course).filter(Course.student_id == student.id).all()
    courses_out = []
    
    # Eager load cats and assigns to prevent N+1
    all_course_ids = [c.id for c in courses_db]
    all_categories = db.query(Category).filter(Category.course_id.in_(all_course_ids)).all()
    all_assignments = db.query(Assignment).filter(Assignment.course_id.in_(all_course_ids)).all()
    
    categories_by_course = {}
    for cat in all_categories:
        categories_by_course.setdefault(cat.course_id, []).append(cat)
        
    assignments_by_course = {}
    for a in all_assignments:
        assignments_by_course.setdefault(a.course_id, []).append(a)
    upcoming_assignments = []
    
    total_gpa_points = 0.0
    valid_gpa_courses = 0
    now = datetime.now()
    
    # Standard unweighted GPA mapping
    gpa_scale = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'D-': 0.7,
        'F': 0.0
    }
    
    for c in courses_db:
        cats = categories_by_course.get(c.id, [])
        courses_out.append({
            "id": c.id,
            "name": c.title,
            "teacher": c.teacher_name,
            "current_grade": c.current_grade,
            "letter_grade": c.letter_grade,
            "categories": [{"name": cat.name, "weight": cat.weight, "percentage": cat.percentage} for cat in cats]
        })
        
        # Calculate GPA Contribution
        if c.letter_grade and c.letter_grade in gpa_scale:
            total_gpa_points += gpa_scale[c.letter_grade]
            valid_gpa_courses += 1
            
        assigns = assignments_by_course.get(c.id, [])
        for a in assigns:
            # Show in "Upcoming Deadlines" if it's not submitted and it's either upcoming or overdue
            if a.submission_status == "not_submitted" and a.timeliness_status in ["upcoming", "overdue"]:
                upcoming_assignments.append({
                    "id": a.id,
                    "name": a.title,
                    "course_name": c.title,
                    "due_date": a.due_date if a.due_date else now.isoformat(),
                    "score": a.score,
                    "max_score": a.max_score,
                    "submission_status": a.submission_status,
                    "grading_status": a.grading_status,
                    "timeliness_status": a.timeliness_status
                })
                
    calculated_gpa = round(total_gpa_points / valid_gpa_courses, 2) if valid_gpa_courses > 0 else 0.0
    
    # --- Grade Trend Calculation (GPA + Behavioral Focus) ---
    at_risk_count = 0
    # Evaluate across all assignments for the student
    for c_id, assigns in assignments_by_course.items():
        for a in assigns:
            # Check for overdue or missing assignments
            is_missing_or_zero = a.submission_status == "missing" or (a.score == 0 and a.grading_status == "graded")
            is_overdue = a.timeliness_status == "overdue"
            
            if is_missing_or_zero or is_overdue:
                at_risk_count += 1

    grade_trend = {
        "status": "Strong",
        "direction": "up",
        "color": "emerald" # Will map to tailwind class or hex
    }
    
    # Logic: High GPA + Consistency = Strong
    # Logic: Slipping GPA OR some missing work = Caution
    # Logic: Low GPA OR lots of missing work = At Risk
    
    if calculated_gpa < 2.5 or at_risk_count > 3:
        grade_trend = {
            "status": "At Risk",
            "direction": "down",
            "color": "rose"
        }
    elif calculated_gpa < 3.3 or at_risk_count > 0:
         grade_trend = {
            "status": "Caution",
            "direction": "flat",
            "color": "amber"
        }
    elif calculated_gpa >= 3.8 and at_risk_count == 0:
        grade_trend = {
            "status": "Excelling",
            "direction": "up",
            "color": "emerald"
        }

    return {
        "student": {"id": student.id, "name": student.name},
        "courses": courses_out,
        "upcomingAssignments": upcoming_assignments,
        "gpa": calculated_gpa,
        "gradeTrend": grade_trend
    }

@router.get("/student/{student_id}/daily-summary")
def get_daily_summary(student_id: int, user_id: str = "1", db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    courses = db.query(Course).filter(Course.student_id == student.id).all()
    if not courses:
        return {"daily_summary": {"recent_activity": "No courses found.", "focus_tasks": []}}
        
    course_ids = [c.id for c in courses]
    course_dict = {c.id: c.title for c in courses}
    
    # Fetch all assignments that are NOT submitted
    assignments = db.query(Assignment).filter(
        Assignment.course_id.in_(course_ids),
        Assignment.submission_status == "not_submitted"
    ).all()
    
    today = datetime.now().date()
    overdue_tasks = []
    today_tasks = []
    upcoming_tasks = []
    
    for a in assignments:
        if a.due_date:
            try:
                # Extract the YYYY-MM-DD portion of the ISO string safely
                date_str = a.due_date[:10]
                a_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                
                course_name = course_dict.get(a.course_id, "Unknown Course")
                days_until_due = (a_date - today).days
                
                # Format: "Study/complete Assignment Name for Course Name"
                clean_course_name = course_name.split(':')[0].split('-')[0].strip()
                
                # Check for keywords to make the sentence read better
                action_verb = "Complete"
                title_lower = a.title.lower()
                if any(word in title_lower for word in ["test", "quiz", "exam", "assessment"]):
                    action_verb = "Study for"
                elif any(word in title_lower for word in ["reading", "chapter"]):
                    action_verb = "Read"
                elif "project" in title_lower:
                    action_verb = "Work on"
                    
                task_str = f"{action_verb} {a.title} for {clean_course_name}"
                
                if days_until_due == 0:
                    today_tasks.append(f"{task_str} (Due Today)")
                elif days_until_due == 1:
                    upcoming_tasks.append((days_until_due, f"{task_str} (Due in 1 day)"))
                elif 1 < days_until_due <= 7:
                    upcoming_tasks.append((days_until_due, f"{task_str} (Due in {days_until_due} days)"))
            except Exception:
                # Ignore invalid dates
                pass

    # Sort upcoming tasks by days until due (ascending)
    upcoming_tasks.sort(key=lambda x: x[0])
    sorted_upcoming_strings = [task[1] for task in upcoming_tasks]

    # Focus only on Today and Upcoming, ordered by urgency
    focus_tasks = today_tasks + sorted_upcoming_strings
    
    if len(today_tasks) > 0:
        recent_activity = f"You have {len(today_tasks)} assignment(s) due today!"
    elif len(upcoming_tasks) > 0:
        recent_activity = "You're caught up for today, but you have assignments coming up soon."
    else:
        recent_activity = "You're all caught up! No tasks due today or in the next 7 days."

    return {
        "daily_summary": {
            "recent_activity": recent_activity,
            "focus_tasks": focus_tasks[:5] # Limit to top 5 most urgent tasks
        }
    }

@router.get("/student/{student_id}/assignments")
def get_student_assignments(student_id: int, user_id: str = "1", db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    courses = db.query(Course).filter(Course.student_id == student.id).all()
    if not courses:
        return {"assignments": []}
        
    course_ids = [c.id for c in courses]
    course_dict = {c.id: c.title for c in courses}
    
    assignments = db.query(Assignment).filter(Assignment.course_id.in_(course_ids)).all()
    
    result = []
    for a in assignments:
        result.append({
            "id": a.id,
            "name": a.title,
            "course_name": course_dict.get(a.course_id, "Unknown Course"),
            "due_date": a.due_date,
            "score": a.score,
            "max_score": a.max_score,
            "is_late": a.timeliness_status in ["overdue", "late_submitted"]
        })
        
    return {"assignments": result}

@router.get("/course/{course_id}")
def get_course_detail(course_id: int, user_id: str = "1", db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    categories_db = db.query(Category).filter(Category.course_id == course.id).all()
    assignments_db = db.query(Assignment).filter(Assignment.course_id == course.id).all()
    
    return {
        "course": {
            "id": course.id,
            "name": course.title,
            "teacher": course.teacher_name,
            "overall_grade": course.current_grade,
            "letter_grade": course.letter_grade,
            "grading_mode": course.grading_mode
        },
        "categories": [
            {"id": c.id, "name": c.name, "weight": c.weight, "percentage": c.percentage} for c in categories_db
        ],
        "assignments": [
            {
                "id": a.id,
                "name": a.title,
                "due_date": a.due_date if a.due_date else datetime.now().isoformat(),
                "score": a.score,
                "grade_text": a.grade_text,
                "score_type": a.score_type,
                "max_score": a.max_score,
                "submission_status": a.submission_status,
                "grading_status": a.grading_status,
                "timeliness_status": a.timeliness_status
            } for a in assignments_db
        ]
    }
