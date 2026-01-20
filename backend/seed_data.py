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

async def seed_database():
    print("Limpiando base de datos...")
    await db.houses.delete_many({})
    await db.staff.delete_many({})
    await db.coverage.delete_many({})
    
    print("Insertando casas...")
    houses = [
        {"house_id": "house_2", "name": "Casa 2", "caregivers_required": 1, "assistant_required": True, "encargada_staff_id": "staff_milagros"},
        {"house_id": "house_4", "name": "Casa 4", "caregivers_required": 1, "assistant_required": True, "encargada_staff_id": "staff_marcela"},
        {"house_id": "house_7", "name": "Casa 7", "caregivers_required": 1, "assistant_required": True, "encargada_staff_id": "staff_mabel"},
        {"house_id": "house_8", "name": "Casa 8", "caregivers_required": 1, "assistant_required": True, "encargada_staff_id": "staff_gaby"},
        {"house_id": "house_9", "name": "Casa 9", "caregivers_required": 2, "assistant_required": False, "encargada_staff_id": "staff_ines"},
        {"house_id": "house_11", "name": "Casa 11", "caregivers_required": 1, "assistant_required": True, "encargada_staff_id": "staff_ysabel"},
        {"house_id": "house_14", "name": "Casa 14", "caregivers_required": 1, "assistant_required": True, "encargada_staff_id": "staff_betania"},
        {"house_id": "house_15", "name": "Casa 15", "caregivers_required": 1, "assistant_required": True, "encargada_staff_id": "staff_mariel"},
        {"house_id": "house_herrera", "name": "Casa Herrera", "caregivers_required": 2, "assistant_required": False, "encargada_staff_id": None}
    ]
    await db.houses.insert_many(houses)
    
    print("Insertando personal...")
    staff = [
        {"staff_id": "staff_milagros", "name": "Milagros Feliz", "staff_type": "caregiver", "subtype": "encargada", "work_days": 20, "rest_days": 8, "fixed_house_id": "house_2"},
        {"staff_id": "staff_marcela", "name": "Marcela Leites", "staff_type": "caregiver", "subtype": "encargada", "work_days": 20, "rest_days": 8, "fixed_house_id": "house_4"},
        {"staff_id": "staff_mabel", "name": "Mabel Pereira", "staff_type": "caregiver", "subtype": "encargada", "work_days": 20, "rest_days": 8, "fixed_house_id": "house_7"},
        {"staff_id": "staff_gaby", "name": "Gaby Duarte", "staff_type": "caregiver", "subtype": "encargada", "work_days": 5, "rest_days": 2, "fixed_house_id": "house_8", "work_schedule": "Descansa sábado y domingo"},
        {"staff_id": "staff_ines", "name": "Inés Díaz", "staff_type": "caregiver", "subtype": "encargada", "work_days": 20, "rest_days": 8, "fixed_house_id": "house_9"},
        {"staff_id": "staff_ysabel", "name": "Ysabel Moreta", "staff_type": "caregiver", "subtype": "encargada", "work_days": 20, "rest_days": 8, "fixed_house_id": "house_11"},
        {"staff_id": "staff_betania", "name": "Betania Reyes", "staff_type": "caregiver", "subtype": "encargada", "work_days": 20, "rest_days": 8, "fixed_house_id": "house_14"},
        {"staff_id": "staff_mariel", "name": "Mariel Merlo", "staff_type": "caregiver", "subtype": "encargada", "work_days": 20, "rest_days": 8, "fixed_house_id": "house_15"},
        
        {"staff_id": "staff_claritza", "name": "Claritza Sánchez", "staff_type": "caregiver", "subtype": "jornalera", "work_days": 20, "fixed_house_id": "house_herrera", "work_schedule": "Lunes a viernes"},
        {"staff_id": "staff_beatriz", "name": "Beatriz Portela", "staff_type": "caregiver", "subtype": "jornalera", "fixed_house_id": "house_herrera", "work_schedule": "Lunes a viernes"},
        {"staff_id": "staff_carmen", "name": "Carmen Alcántara", "staff_type": "caregiver", "subtype": "jornalera", "fixed_house_id": "house_herrera", "work_schedule": "Sábado y domingo"},
        
        {"staff_id": "staff_eloisa", "name": "Eloisa Richardson", "staff_type": "caregiver", "subtype": "rotativa_mensual"},
        {"staff_id": "staff_iris", "name": "Iris Felix", "staff_type": "caregiver", "subtype": "rotativa_mensual"},
        {"staff_id": "staff_paula", "name": "Paula Montero", "staff_type": "caregiver", "subtype": "rotativa_mensual"},
        {"staff_id": "staff_libia", "name": "Libia Leites", "staff_type": "caregiver", "subtype": "rotativa_mensual"},
        {"staff_id": "staff_mamerta", "name": "Mamerta Duarte", "staff_type": "caregiver", "subtype": "rotativa_mensual"},
        {"staff_id": "staff_norma", "name": "Norma Gianelli", "staff_type": "caregiver", "subtype": "rotativa_mensual", "notes": "Prioridad Casa 9"},
        {"staff_id": "staff_charina", "name": "Charina de los Santos", "staff_type": "caregiver", "subtype": "rotativa_mensual", "notes": "Opción secundaria Casa 9"},
        {"staff_id": "staff_awilda", "name": "Awilda Brand", "staff_type": "caregiver", "subtype": "rotativa_mensual"},
        
        {"staff_id": "staff_wendy", "name": "Wendy Castillo", "staff_type": "caregiver", "subtype": "jornalera", "work_days": 15},
        {"staff_id": "staff_cruz", "name": "Cruz María Bautista", "staff_type": "caregiver", "subtype": "jornalera", "work_days": 15},
        {"staff_id": "staff_yvelisse", "name": "Yvelisse Abreu", "staff_type": "caregiver", "subtype": "jornalera", "work_days": 15},
        {"staff_id": "staff_luz", "name": "Luz Sindel", "staff_type": "caregiver", "subtype": "jornalera", "work_days": 15},
        {"staff_id": "staff_charlie", "name": "Charlie Patricio", "staff_type": "caregiver", "subtype": "jornalera", "work_days": 15, "notes": "Generalmente Casa 9"},
        
        {"staff_id": "staff_nellina", "name": "Nellina Álvarez", "staff_type": "assistant", "subtype": "mensual", "weekly_hours": 40},
        {"staff_id": "staff_leticia", "name": "Leticia Crosa", "staff_type": "assistant", "subtype": "mensual", "weekly_hours": 40, "fixed_house_id": "house_14"},
        {"staff_id": "staff_silvia", "name": "Silvia Castifor", "staff_type": "assistant", "subtype": "mensual", "weekly_hours": 40},
        {"staff_id": "staff_belkis", "name": "Belkis García", "staff_type": "assistant", "subtype": "mensual", "weekly_hours": 40},
        {"staff_id": "staff_matias", "name": "Matías Mercadal", "staff_type": "assistant", "subtype": "mensual", "weekly_hours": 40},
        
        {"staff_id": "staff_camila", "name": "Camila Irureta", "staff_type": "assistant", "subtype": "jornalera", "work_days": 5, "rest_days": 2, "fixed_house_id": "house_8", "notes": "8h exactas, sin días fijos"},
        {"staff_id": "staff_tatiana", "name": "Tatiana Barreto", "staff_type": "assistant", "subtype": "jornalera", "work_days": 5, "rest_days": 2},
        {"staff_id": "staff_luciana", "name": "Luciana Morella", "staff_type": "assistant", "subtype": "jornalera", "work_days": 5, "rest_days": 2},
        {"staff_id": "staff_veronica", "name": "Verónica Ovelar", "staff_type": "assistant", "subtype": "jornalera", "work_days": 5, "rest_days": 2},
        {"staff_id": "staff_liliana", "name": "Liliana Cruz", "staff_type": "assistant", "subtype": "jornalera", "work_days": 5, "rest_days": 2},
        {"staff_id": "staff_iliana", "name": "Iliana Aquino", "staff_type": "assistant", "subtype": "jornalera", "work_days": 5, "rest_days": 2}
    ]
    await db.staff.insert_many(staff)
    
    print("Generando coberturas para enero 2025...")
    coverage_entries = []
    import uuid
    
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 31)
    current_date = start_date
    
    houses_list = await db.houses.find({}, {"_id": 0}).to_list(100)
    
    while current_date <= end_date:
        date_str = current_date.isoformat()
        
        for house in houses_list:
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
    
    await db.coverage.insert_many(coverage_entries)
    
    print(f"✅ Base de datos inicializada con:")
    print(f"   - {len(houses)} casas")
    print(f"   - {len(staff)} miembros del personal")
    print(f"   - {len(coverage_entries)} entradas de cobertura para enero 2025")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())