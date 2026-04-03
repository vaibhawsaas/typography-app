import os
import uuid
import json
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# Ensure outputs folder exists
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'outputs')
os.makedirs(OUTPUT_DIR, exist_ok=True)
DB_FILE = os.path.join(os.path.dirname(__file__), 'db.json')

from services.video_engine import segment_script_local, render_video_local

app = FastAPI(title="TypeMotion Python API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === DB LAYER ===
USE_FIREBASE = False
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    cred_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        FIREBASE_DB = firestore.client()
        USE_FIREBASE = True
        print("Firebase initialized successfully")
    else:
        print("serviceAccountKey.json missing, using db.json")
except Exception as e:
    print(f"Firebase initialization skipped/failed: {e}")

def read_db() -> list:
    if USE_FIREBASE:
        try:
            return [doc.to_dict() for doc in FIREBASE_DB.collection('videos').get()]
        except Exception as e:
            print("Firebase read error:", e)
            return []
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, 'w') as f:
            json.dump([], f)
        return []
    try:
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    except:
        return []

def write_db(data: list):
    if USE_FIREBASE:
        try:
            batch = FIREBASE_DB.batch()
            collection = FIREBASE_DB.collection('videos')
            for item in data:
                batch.set(collection.document(item["_id"]), item)
            batch.commit()
        except Exception as e:
            print("Firebase write error:", e)
    else:
        with open(DB_FILE, 'w') as f:
            json.dump(data, f, indent=2)

def update_db_progress(video_id: str, progress_val: int):
    if USE_FIREBASE:
        try:
            FIREBASE_DB.collection('videos').document(video_id).update({"progress": progress_val})
        except: pass
    else:
        db = read_db()
        for v in db:
            if v["_id"] == video_id:
                v["progress"] = progress_val
                break
        with open(DB_FILE, 'w') as f:
            json.dump(db, f, indent=2)

def delete_from_db(video_ids: list):
    if USE_FIREBASE:
        try:
            batch = FIREBASE_DB.batch()
            for vid in video_ids:
                batch.delete(FIREBASE_DB.collection('videos').document(vid))
            batch.commit()
        except: pass
    else:
        db = read_db()
        db = [v for v in db if v["_id"] not in video_ids]
        with open(DB_FILE, 'w') as f:
            json.dump(db, f, indent=2)

# === MODELS ===
class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    phone_number: str

VALID_ANIMATIONS  = ['karaoke', 'typewriter', 'bounce', 'zoom_in', 'slide_up',
                      'shake', 'glow', 'wave', 'fade_in', 'scale_pulse',
                      'pop_up', 'flip_in', 'glitch', 'spotlight', 'color_pop',
                      'word_by_word_rise']
VALID_BACKGROUNDS = ['gradient', 'radial', 'particles', 'solid', 'aurora',
                      'geometric', 'bokeh', 'cinematic_bars', 'glitch_lines']
VALID_TRANSITIONS = ['crossfade', 'fade', 'slide_right', 'slide_left', 'none']
VALID_STYLES      = ['neon', 'cinematic', 'minimal', 'retro', 'pop', 'dark_luxury', 'vibrant']
VALID_FONT_STYLES = ['bold', 'italic', 'impact', 'script', 'condensed', 'rounded', 'outline']

class GenerateRequest(BaseModel):
    script: str
    style: Optional[str] = "neon"
    videoSize: Optional[str] = "9:16"
    duration: Optional[int] = None  # e.g., 10, 30, 60  (seconds)
    background: Optional[str] = "gradient"
    effects: Optional[str] = "none"
    transitions: Optional[str] = "crossfade"
    animation: Optional[str] = "karaoke"
    fps: Optional[int] = 24
    fontsize: Optional[int] = 80
    fontStyle: Optional[str] = "bold"
    userId: Optional[str] = None

class RenderRequest(BaseModel):
    videoId: str

class DeleteRequest(BaseModel):
    videoIds: List[str]

class PaymentRequest(BaseModel):
    user_id: str
    payer_name: str
    email: Optional[str] = None
    phone_number: str
    plan_name: str
    amount: float

# === MOCK ADMIN DATA ===
MOCK_USERS = [
    {
        "id": "1",
        "email": "m@example.com",
        "name": "Test User 1",
        "plan": "Creator",
        "videos_generated": 0,
        "joined_date": "2023-11-20T10:00:00Z"
    },
    {
        "id": "2",
        "email": "creator@agency.com",
        "name": "Agency Creator",
        "plan": "Starter",
        "videos_generated": 0,
        "joined_date": "2024-01-15T14:30:00Z"
    }
]

MOCK_PAYMENTS = [
    {
        "id": "pay_1029310",
        "user_id": "1",
        "amount": 29.99,
        "currency": "USD",
        "status": "Completed",
        "date": "2024-03-01T09:00:00Z",
        "method": "Credit Card"
    },
    {
        "id": "pay_9821381",
        "user_id": "2",
        "amount": 0.00,
        "currency": "USD",
        "status": "Completed",
        "date": "2024-01-15T14:31:00Z",
        "method": "Free Tier"
    }
]

# === ROUTES ===

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    db_data = read_db()
    
    # Simple check for our mocked admin
    if req.email == "srivastavvaibhaw17@gmail.com" and req.password == "adminji@8539":
        return {"token": "mock_admin_token", "user": {"id": "admin", "email": req.email, "role": "admin"}}
        
    # Check regular users
    users = [item for item in db_data if item.get("type") == "user"]
    user = next((u for u in users if u.get("email") == req.email and u.get("password") == req.password), None)
    
    if user:
        return {
            "token": "mock_user_token", 
            "user": {
                "id": user["_id"], 
                "email": user["email"], 
                "name": user.get("name"), 
                "phone_number": user.get("phone_number"), 
                "role": "user",
                "plan": user.get("plan")
            }
        }
        
    raise HTTPException(status_code=401, detail="Invalid email or password")


@app.post("/api/auth/signup")
async def signup(req: SignupRequest):
    db_data = read_db()
    users = [item for item in db_data if item.get("type") == "user"]
    
    # Check if email or phone number already exists
    if any(u.get("email") == req.email for u in users):
        raise HTTPException(status_code=400, detail="Email already registered")
    if any(u.get("phone_number") == req.phone_number for u in users):
        raise HTTPException(status_code=400, detail="Phone number already registered. Only one ID per phone number is allowed.")
        
    user_id = str(uuid.uuid4())
    new_user = {
        "type": "user",
        "_id": user_id,
        "name": req.name,
        "email": req.email,
        "password": req.password,
        "phone_number": req.phone_number,
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }
    
    db_data.append(new_user)
    write_db(db_data)
    
    return {
        "token": "mock_user_token", 
        "user": {
            "id": user_id, 
            "name": req.name, 
            "email": req.email, 
            "phone_number": req.phone_number, 
            "role": "user",
            "plan": None
        }
    }

PLAN_QUOTA = {"Starter": 1, "Creator": 30, "Agency": -1}  # -1 = unlimited

@app.post("/api/payments")
async def submit_payment(req: PaymentRequest):
    db_data = read_db()
    payment_id = str(uuid.uuid4())
    new_payment = {
        "type": "payment",
        "_id": payment_id,
        "user_id": req.user_id,
        "payer_name": req.payer_name,
        "email": req.email,
        "phone_number": req.phone_number,
        "plan_name": req.plan_name,
        "amount": req.amount,
        "status": "pending",
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }
    db_data.append(new_payment)
    # Also update user record with the chosen plan and start date
    for item in db_data:
        if item.get("type") == "user" and item.get("_id") == req.user_id:
            item["plan"] = req.plan_name
            item["plan_start_date"] = datetime.utcnow().isoformat() + "Z"
            break
    write_db(db_data)
    return {"message": "Payment submitted successfully", "paymentId": payment_id}


@app.get("/api/user/{user_id}/plan")
async def get_user_plan(user_id: str):
    db_data = read_db()
    users = [item for item in db_data if item.get("type") == "user"]
    user = next((u for u in users if u.get("_id") == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    plan = user.get("plan", None)
    quota = PLAN_QUOTA.get(plan, 0) if plan else 0
    # Count videos generated by this user
    videos = [item for item in db_data if item.get("type") not in ("user", "payment") and item.get("userId") == user_id]
    videos_generated = len(videos)
    return {
        "plan": plan,
        "quota": quota,
        "videos_generated": videos_generated,
        "quota_remaining": max(0, quota - videos_generated) if quota != -1 else -1
    }

@app.get("/api/video")
async def get_videos(userId: Optional[str] = None):
    db_data = read_db()
    videos = [item for item in db_data if item.get("type") not in ("user", "payment")]
    if userId:
        videos = [v for v in videos if v.get("userId") == userId]
    # Sort descending by createdAt
    return sorted(videos, key=lambda x: x.get('createdAt', ''), reverse=True)

@app.get("/api/video/{video_id}")
async def get_video(video_id: str):
    db_data = read_db()
    videos = [item for item in db_data if item.get("type") not in ("user", "payment")]
    video = next((v for v in videos if v["_id"] == video_id), None)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

@app.post("/api/video/generate-video")
async def generate_video(req: GenerateRequest):
    # === SERVER-SIDE QUOTA CHECK ===
    if req.userId:
        db_data = read_db()
        user = next((u for u in db_data if u.get("type") == "user" and u.get("_id") == req.userId), None)
        if user:
            plan = user.get("plan")
            if not plan:
                raise HTTPException(status_code=403, detail="No active plan. Please purchase a plan.")
            quota = PLAN_QUOTA.get(plan, 0)
            if quota != -1:  # -1 = unlimited (Agency)
                videos_used = len([
                    item for item in db_data
                    if item.get("type") not in ("user", "payment") and item.get("userId") == req.userId
                ])
                if videos_used >= quota:
                    raise HTTPException(
                        status_code=403,
                        detail=f"quota_exceeded|{plan}|{quota}"
                    )

    # Process script completely locally in Python, passing advanced options
    scenes = segment_script_local(
        req.script,
        req.style,
        target_duration=req.duration,
        background=req.background,
        effects=req.effects,
        transitions=req.transitions,
        animation=req.animation,
        font_style=req.fontStyle,
    )

    video_id = str(uuid.uuid4())
    new_video = {
        "_id": video_id,
        "script": req.script,
        "style": req.style,
        "videoSize": req.videoSize,
        "status": "pending",
        "progress": 0,
        "scenes": scenes,
        "videoUrl": "",
        "userId": req.userId,
        "fps": req.fps or 24,
        "fontsize": req.fontsize or 80,
        "fontStyle": req.fontStyle or "bold",
        "animation": req.animation,
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }

    db = read_db()
    db.append(new_video)
    write_db(db)

    return {
        "message": "Video generation and segmentation completed",
        "videoId": video_id,
        "scenes": scenes
    }

def background_render_task(
    video_id: str, scenes: list, style: str, video_size: str,
    fps: int = 24, fontsize: int = 80, font_style: str = "bold"
):
    def update_progress(progress_val: int):
        nonlocal last_progress
        if progress_val - last_progress >= 5 or progress_val == 100:
            update_db_progress(video_id, progress_val)
            last_progress = progress_val

    last_progress = 0

    try:
        print(f"Starting render for {video_id}  style={style}  size={video_size}  fps={fps}")
        output_filename = f"video-{video_id}.mp4"
        output_path = os.path.join(OUTPUT_DIR, output_filename)

        render_video_local(
            output_path, scenes, style, video_size,
            progress_callback=update_progress,
            fps=fps,
            font_size=fontsize,
            font_style=font_style,
        )

        db = read_db()
        for v in db:
            if v["_id"] == video_id:
                v["status"] = "completed"
                v["progress"] = 100
                v["videoUrl"] = f"/api/video/download/{video_id}"
                break
        write_db(db)
        print(f"Finished rendering {video_id}")
    except Exception as e:
        import traceback
        print(f"Failed to render {video_id}: {e}")
        traceback.print_exc()
        db = read_db()
        for v in db:
            if v["_id"] == video_id:
                v["status"] = "failed"
                v["error"] = str(e)
                break
        write_db(db)

@app.post("/api/video/render-video")
async def render_video(req: RenderRequest, bg_tasks: BackgroundTasks):
    db = read_db()
    video = next((v for v in db if v["_id"] == req.videoId), None)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    if video["status"] == "processing":
        raise HTTPException(status_code=400, detail="Video already rendering")

    for v in db:
        if v["_id"] == req.videoId:
            v["status"] = "processing"
            break
    write_db(db)

    bg_tasks.add_task(
        background_render_task,
        video["_id"], video["scenes"], video["style"], video["videoSize"],
        video.get("fps", 24), video.get("fontsize", 80), video.get("fontStyle", "bold"),
    )

    return {"message": "Render started", "videoId": req.videoId}

@app.get("/api/video/download/{video_id}")
async def download_video(video_id: str):
    db = read_db()
    video = next((v for v in db if v["_id"] == video_id), None)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    if video["status"] != "completed":
        raise HTTPException(status_code=400, detail="Video not fully rendered yet")
        
    output_filename = f"video-{video_id}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Video file missing on server")
        
    return FileResponse(output_path, media_type="video/mp4", filename=output_filename)

@app.post("/api/video/delete")
async def delete_videos(req: DeleteRequest):
    delete_from_db(req.videoIds)
    for vid in req.videoIds:
        output_filename = f"video-{vid}.mp4"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except:
                pass
    return {"message": "Deleted successfully"}

@app.get("/api/admin/dashboard")
async def get_admin_dashboard():
    # Fetch all videos across all users to calculate stats
    db_data = read_db()
    videos = [item for item in db_data if item.get("type") not in ("user", "payment")]
    users_db = [item for item in db_data if item.get("type") == "user"]
    payments_db = [item for item in db_data if item.get("type") == "payment"]
    
    # Calculate global system stats
    total_videos = len(videos)
    completed_videos = len([v for v in videos if v.get("status") == "completed"])
    
    # We mix Mock data for structure but rely on DB for accurate counting
    total_revenue = sum(p["amount"] for p in MOCK_PAYMENTS if p["status"] == "Completed")
    
    # Calculate per-user stats
    # Merge mock users and DB users
    users_data = MOCK_USERS.copy()
    
    for u in users_db:
        users_data.append({
            "id": u["_id"],
            "email": u["email"],
            "name": u["name"],
            "phone_number": u.get("phone_number"),
            "plan": u.get("plan", "No Plan"),
            "videos_generated": 0,
            "joined_date": u.get("createdAt", "")
        })
        
    for user in users_data:
        # Count videos generated by this user in the reality 'videos' table (db.json or Firebase)
        user_videos = [v for v in videos if v.get("userId") == user["id"]]
        user["videos_generated"] = len(user_videos)
        
        # Attach their latest payment record natively
        user_payments = [p for p in MOCK_PAYMENTS if p.get("user_id") == user["id"]]
        # also check custom payments
        db_pays = [p for p in payments_db if p.get("user_id") == user["id"]]
        
        all_pays_for_user = user_payments + db_pays
        # Sort desc by date
        all_pays_for_user.sort(key=lambda x: x.get("date", x.get("createdAt", "")), reverse=True)
        user["latest_payment"] = all_pays_for_user[0] if all_pays_for_user else None
        
    all_payments = MOCK_PAYMENTS + payments_db
    all_payments.sort(key=lambda x: x.get("date", x.get("createdAt", "")), reverse=True)

    return {
        "stats": {
            "total_users": len(users_data),
            "total_videos_created": total_videos,
            "total_videos_completed": completed_videos,
            "total_revenue_usd": total_revenue
        },
        "users": users_data,
        "payments_history": all_payments
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
