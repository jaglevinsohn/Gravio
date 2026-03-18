from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from db.database import get_db
from db.models import SchoologyConnection, Student, Course, Assignment, Category
from api.schemas import ConnectRequest, ConnectExtensionRequest, StudentResponse
from auth.schoology_connector import connect_schoology_account
from auth.encryption import encrypt_cookies
from sync.sync_service import run_sync_for_connection

router = APIRouter()

@router.post("/connect-schoology")
async def connect_schoology(request: ConnectRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Initiates a Playwright login session with Schoology.
    On success, stores encrypted cookies and triggers initial sync.
    """
    try:
        connection = db.query(SchoologyConnection).filter(SchoologyConnection.user_id == request.user_id).first()
        
        # 1. Run Playwright login to get cookies
        encrypted_cookies = await connect_schoology_account(request.username, request.password)
        
        # 2. Save or update connection
        if not connection:
            connection = SchoologyConnection(
                user_id=request.user_id,
                schoology_username=request.username,
                encrypted_cookies=encrypted_cookies,
                connection_status="active"
            )
            db.add(connection)
        else:
            connection.encrypted_cookies = encrypted_cookies
            connection.connection_status = "active"
            connection.schoology_username = request.username
            
        db.commit()
        db.refresh(connection)
        
        # 3. Trigger initial sync in background
        background_tasks.add_task(run_sync_worker, connection.id)
        
        return {"success": True, "message": "Schoology connected successfully. Initial sync started."}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/connect-schoology-extension")
async def connect_schoology_extension(request: ConnectExtensionRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Receives raw cookies directly from the Gravio Chrome Extension.
    Encrypts them, stores them, and triggers initial sync.
    """
    try:
        connection = db.query(SchoologyConnection).filter(SchoologyConnection.user_id == request.user_id).first()
        
        # 1. Encrypt the raw cookies provided by the extension
        encrypted_cookies = encrypt_cookies(request.cookies)
        
        # 2. Save or update connection
        if not connection:
            connection = SchoologyConnection(
                user_id=request.user_id,
                # We do not have a username from the extension natively, just store 'Extension Connected'
                schoology_username="Extension User",
                encrypted_cookies=encrypted_cookies,
                connection_status="active"
            )
            db.add(connection)
        else:
            connection.encrypted_cookies = encrypted_cookies
            connection.connection_status = "active"
            connection.schoology_username = "Extension User"
            
        db.commit()
        db.refresh(connection)
        
        # 3. Trigger initial sync in background
        background_tasks.add_task(run_sync_worker, connection.id)
        
        return {"success": True, "message": "Schoology cookies captured via extension. Initial sync started."}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/check-connection")
def check_connection(user_id: str, db: Session = Depends(get_db)):
    """ Returns whether the user has an active Schoology connection and its sync status. """
    from db.models import SyncLog
    connection = db.query(SchoologyConnection).filter(SchoologyConnection.user_id == user_id).first()
    is_active = connection is not None and connection.connection_status == "active"
    
    sync_status = "idle"
    stats = {
        "courses_imported": 0,
        "assignments_imported": 0,
        "grades_imported": 0,
        "error": None
    }
    if connection:
        latest_log = db.query(SyncLog).filter(SyncLog.connection_id == connection.id).order_by(SyncLog.id.desc()).first()
        if latest_log:
            sync_status = latest_log.status  # "success" or "failed" etc.
            stats["courses_imported"] = latest_log.courses_imported or 0
            stats["assignments_imported"] = latest_log.assignments_imported or 0
            stats["grades_imported"] = latest_log.grades_imported or 0
            stats["error"] = latest_log.error_message
        else:
            sync_status = "validating"
            
    return {"connected": is_active, "sync_status": sync_status, "stats": stats}

async def run_sync_worker(connection_id: int):
    """ Helper to run async sync in background without blocking response. """
    generator = get_db()
    db = next(generator)
    try:
        await run_sync_for_connection(db, connection_id)
    finally:
        generator.close()

@router.post("/sync")
async def trigger_manual_sync(user_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    connection = db.query(SchoologyConnection).filter(SchoologyConnection.user_id == user_id).first()
    if not connection or connection.connection_status != "active":
        raise HTTPException(status_code=404, detail="Active connection not found.")
        
    background_tasks.add_task(run_sync_worker, connection.id)
    return {"message": "Sync queued."}

@router.get("/students", response_model=list[StudentResponse])
def get_students(user_id: str, db: Session = Depends(get_db)):
    connection = db.query(SchoologyConnection).filter(SchoologyConnection.user_id == user_id).first()
    if not connection:
        return []
        
    students = db.query(Student).filter(Student.connection_id == connection.id).all()
    
    # Manually populate nested data for MVP
    # In production, use SQLAlchemy relationships with `joinedload`
    for student in students:
        student.courses = db.query(Course).filter(Course.student_id == student.id).all()
        for course in student.courses:
            course.categories = db.query(Category).filter(Category.course_id == course.id).all()
            course.assignments = db.query(Assignment).filter(Assignment.course_id == course.id).all()
            
    return students
