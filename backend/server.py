from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone, date
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

class StaffType(str, Enum):
    CAREGIVER = "caregiver"
    ASSISTANT = "assistant"

class CaregiverSubtype(str, Enum):
    ENCARGADA = "encargada"
    ROTATIVA_MENSUAL = "rotativa_mensual"
    JORNALERA = "jornalera"

class AssistantSubtype(str, Enum):
    MENSUAL = "mensual"
    JORNALERA = "jornalera"

class CoverageType(str, Enum):
    CAREGIVER_24H = "caregiver_24h"
    ASSISTANT_8H = "assistant_8h"

class CoverageStatus(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    INCOMPLETE = "incomplete"

class House(BaseModel):
    model_config = ConfigDict(extra="ignore")
    house_id: str
    name: str
    caregivers_required: int
    assistant_required: bool
    encargada_staff_id: Optional[str] = None
    notes: Optional[str] = None

class HouseCreate(BaseModel):
    house_id: str
    name: str
    caregivers_required: int
    assistant_required: bool
    encargada_staff_id: Optional[str] = None
    notes: Optional[str] = None

class Staff(BaseModel):
    model_config = ConfigDict(extra="ignore")
    staff_id: str
    name: str
    staff_type: StaffType
    subtype: str
    work_days: Optional[int] = None
    rest_days: Optional[int] = None
    weekly_hours: Optional[int] = None
    fixed_house_id: Optional[str] = None
    work_schedule: Optional[str] = None
    notes: Optional[str] = None

class StaffCreate(BaseModel):
    staff_id: str
    name: str
    staff_type: StaffType
    subtype: str
    work_days: Optional[int] = None
    rest_days: Optional[int] = None
    weekly_hours: Optional[int] = None
    fixed_house_id: Optional[str] = None
    work_schedule: Optional[str] = None
    notes: Optional[str] = None

class CoverageEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coverage_id: str
    date: str
    house_id: str
    coverage_type: CoverageType
    assigned_staff_id: Optional[str] = None
    assigned_staff_name: Optional[str] = None
    status: CoverageStatus
    notes: Optional[str] = None

class CoverageEntryCreate(BaseModel):
    date: str
    house_id: str
    coverage_type: CoverageType
    assigned_staff_id: Optional[str] = None
    notes: Optional[str] = None

class CoverageEntryUpdate(BaseModel):
    assigned_staff_id: Optional[str] = None
    notes: Optional[str] = None

@api_router.get("/")
async def root():
    return {"message": "Sistema de Gestión de Coberturas"}

@api_router.get("/houses", response_model=List[House])
async def get_houses():
    houses = await db.houses.find({}, {"_id": 0}).to_list(100)
    return houses

@api_router.post("/houses", response_model=House)
async def create_house(house: HouseCreate):
    house_dict = house.model_dump()
    await db.houses.insert_one(house_dict)
    return House(**house_dict)

@api_router.get("/staff", response_model=List[Staff])
async def get_staff():
    staff_list = await db.staff.find({}, {"_id": 0}).to_list(100)
    return staff_list

@api_router.post("/staff", response_model=Staff)
async def create_staff(staff: StaffCreate):
    staff_dict = staff.model_dump()
    await db.staff.insert_one(staff_dict)
    return Staff(**staff_dict)

@api_router.get("/coverage/{year}/{month}", response_model=List[CoverageEntry])
async def get_coverage_by_month(year: int, month: int):
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    coverage_entries = await db.coverage.find(
        {"date": {"$gte": start_date, "$lt": end_date}},
        {"_id": 0}
    ).to_list(1000)
    
    return coverage_entries

@api_router.post("/coverage", response_model=CoverageEntry)
async def create_coverage(coverage: CoverageEntryCreate):
    import uuid
    coverage_id = str(uuid.uuid4())
    
    assigned_staff_name = None
    if coverage.assigned_staff_id:
        staff = await db.staff.find_one({"staff_id": coverage.assigned_staff_id}, {"_id": 0})
        if staff:
            assigned_staff_name = staff.get("name")
    
    status = CoverageStatus.COMPLETE if coverage.assigned_staff_id else CoverageStatus.INCOMPLETE
    
    coverage_dict = coverage.model_dump()
    coverage_dict["coverage_id"] = coverage_id
    coverage_dict["assigned_staff_name"] = assigned_staff_name
    coverage_dict["status"] = status
    
    await db.coverage.insert_one(coverage_dict)
    return CoverageEntry(**coverage_dict)

@api_router.put("/coverage/{coverage_id}", response_model=CoverageEntry)
async def update_coverage(coverage_id: str, update: CoverageEntryUpdate):
    existing = await db.coverage.find_one({"coverage_id": coverage_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Coverage entry not found")
    
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "assigned_staff_id" in update_dict:
        if update_dict["assigned_staff_id"]:
            staff = await db.staff.find_one({"staff_id": update_dict["assigned_staff_id"]}, {"_id": 0})
            if staff:
                update_dict["assigned_staff_name"] = staff.get("name")
            update_dict["status"] = CoverageStatus.COMPLETE
        else:
            update_dict["assigned_staff_name"] = None
            update_dict["status"] = CoverageStatus.INCOMPLETE
    
    await db.coverage.update_one({"coverage_id": coverage_id}, {"$set": update_dict})
    
    updated = await db.coverage.find_one({"coverage_id": coverage_id}, {"_id": 0})
    return CoverageEntry(**updated)

@api_router.delete("/coverage/{coverage_id}")
async def delete_coverage(coverage_id: str):
    result = await db.coverage.delete_one({"coverage_id": coverage_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coverage entry not found")
    return {"message": "Coverage deleted successfully"}

@api_router.get("/coverage/gaps/{year}/{month}")
async def get_coverage_gaps(year: int, month: int):
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    gaps = await db.coverage.find(
        {
            "date": {"$gte": start_date, "$lt": end_date},
            "status": {"$in": [CoverageStatus.INCOMPLETE, CoverageStatus.PARTIAL]}
        },
        {"_id": 0}
    ).to_list(1000)
    
    return gaps

@api_router.get("/stats/{year}/{month}")
async def get_monthly_stats(year: int, month: int):
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    total = await db.coverage.count_documents({"date": {"$gte": start_date, "$lt": end_date}})
    complete = await db.coverage.count_documents({
        "date": {"$gte": start_date, "$lt": end_date},
        "status": CoverageStatus.COMPLETE
    })
    incomplete = await db.coverage.count_documents({
        "date": {"$gte": start_date, "$lt": end_date},
        "status": CoverageStatus.INCOMPLETE
    })
    
    return {
        "total": total,
        "complete": complete,
        "incomplete": incomplete,
        "completion_rate": round((complete / total * 100) if total > 0 else 0, 1)
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()