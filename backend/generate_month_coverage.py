import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import date, timedelta
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def generate_coverage_for_month(year, month):
    print(f"Generando coberturas para {year}/{month:02d}...")
    
    # Verificar si ya existen
    existing = await db.coverage.count_documents({"date": {"$regex": f"^{year}-{month:02d}"}})
    if existing > 0:
        print(f"  Ya existen {existing} coberturas para este mes")
        return
    
    coverage_entries = []
    import uuid
    
    # Calcular días del mes
    if month == 12:
        last_day = 31
    else:
        from calendar import monthrange
        last_day = monthrange(year, month)[1]
    
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)
    current_date = start_date
    
    houses_list = await db.houses.find({}, {"_id": 0}).to_list(100)
    
    while current_date <= end_date:
        date_str = current_date.isoformat()
        
        for house in houses_list:
            # Crear entradas para cuidadoras
            for i in range(house["caregivers_required"]):
                coverage_entries.append({
                    "coverage_id": str(uuid.uuid4()),
                    "date": date_str,
                    "house_id": house["house_id"],
                    "coverage_type": "caregiver_24h",
                    "assigned_staff_id": None,
                    "assigned_staff_name": None,
                    "status": "incomplete",
                    "notes": None
                })
            
            # Crear entrada para asistente si se requiere
            if house["assistant_required"]:
                coverage_entries.append({
                    "coverage_id": str(uuid.uuid4()),
                    "date": date_str,
                    "house_id": house["house_id"],
                    "coverage_type": "assistant_8h",
                    "assigned_staff_id": None,
                    "assigned_staff_name": None,
                    "status": "incomplete",
                    "notes": None
                })
        
        current_date += timedelta(days=1)
    
    if coverage_entries:
        await db.coverage.insert_many(coverage_entries)
        print(f"✅ Creadas {len(coverage_entries)} entradas de cobertura para {year}/{month:02d}")
    
    client.close()

if __name__ == "__main__":
    import sys
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2026
    month = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    asyncio.run(generate_coverage_for_month(year, month))
