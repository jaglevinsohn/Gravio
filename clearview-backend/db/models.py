from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from .database import Base

class SchoologyConnection(Base):
    __tablename__ = "schoology_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True) # ID mapping to Node.js backend user (e.g. 1)
    schoology_username = Column(String)
    encrypted_cookies = Column(Text)
    connection_status = Column(String, default="active") # active, reauth_required
    last_sync_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("schoology_connections.id"))
    external_student_id = Column(String) # Schoology's internal ID for the student
    name = Column(String)
    school_name = Column(String)

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    external_course_id = Column(String)
    title = Column(String)
    teacher_name = Column(String)
    current_grade = Column(Float, nullable=True)
    letter_grade = Column(String, nullable=True)
    grading_mode = Column(String, default="percent")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), index=True)
    external_assignment_id = Column(String)
    title = Column(String)
    due_date = Column(String, nullable=True) # ISO Date string or None
    submission_status = Column(String, default="not_submitted") # not_submitted, submitted, resubmitted
    grading_status = Column(String, default="ungraded") # ungraded, graded
    timeliness_status = Column(String, default="upcoming") # upcoming, on_time, overdue, late_submitted
    submitted_at = Column(DateTime, nullable=True)
    score = Column(Float, nullable=True)
    grade_text = Column(String, nullable=True)
    score_type = Column(String, nullable=True)
    max_score = Column(Float, nullable=True)
    category = Column(String, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), index=True)
    name = Column(String)
    weight = Column(Float)
    percentage = Column(Float, nullable=True)

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    connection_id = Column(Integer, ForeignKey("schoology_connections.id"))
    sync_time = Column(DateTime, server_default=func.now())
    status = Column(String) # validating, syncing, syncing_courses, syncing_assignments, success, failed
    error_message = Column(Text, nullable=True)
    courses_imported = Column(Integer, default=0)
    assignments_imported = Column(Integer, default=0)
    grades_imported = Column(Integer, default=0)
