import os
import random
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import Course, Category, Base

DB_PATH = os.path.join(os.path.dirname(__file__), "gravio_backend.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL)
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

courses = db.query(Course).all()
print(f"Found {len(courses)} courses.")

for c in courses:
    existing = db.query(Category).filter(Category.course_id == c.id).count()
    if existing > 0:
        continue
    
    # create 3-4 categories around the current grade
    base_grade = c.current_grade if c.current_grade else random.uniform(85, 95)
    
    cats = [
        {"name": "Homework", "weight": 20.0, "percentage": min(100, max(0, base_grade + random.uniform(-4, 2)))},
        {"name": "Tests & Quizzes", "weight": 50.0, "percentage": min(100, max(0, base_grade + random.uniform(-2, 3)))},
        {"name": "Projects", "weight": 30.0, "percentage": min(100, max(0, base_grade + random.uniform(-5, 5)))}
    ]
    
    for cat in cats:
        db.add(Category(course_id=c.id, name=cat["name"], weight=cat["weight"], percentage=cat["percentage"]))

db.commit()
print("Categories seeded successfully.")
