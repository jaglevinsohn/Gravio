from pydantic import BaseModel
from typing import List, Optional

class ConnectRequest(BaseModel):
    user_id: str
    username: str
    password: str

class ConnectExtensionRequest(BaseModel):
    user_id: str
    cookies: list # Raw dict cookies from Chrome Extension API

class AssignmentResponse(BaseModel):
    id: int
    course_id: int
    external_assignment_id: str
    title: str
    due_date: Optional[str]
    status: str
    score: Optional[float]
    max_score: Optional[float]
    is_late: bool
    category: Optional[str]

    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: int
    name: str
    weight: float
    percentage: Optional[float]

    class Config:
        from_attributes = True

class CourseResponse(BaseModel):
    id: int
    external_course_id: str
    title: str
    teacher_name: str
    current_grade: Optional[float]
    letter_grade: Optional[str]
    
    categories: List[CategoryResponse] = []
    assignments: List[AssignmentResponse] = []

    class Config:
        from_attributes = True

class StudentResponse(BaseModel):
    id: int
    name: str
    school_name: str
    courses: List[CourseResponse] = []

    class Config:
        from_attributes = True
