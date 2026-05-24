import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
db = client["stratify_ai"]

goals_collection = db["goals"]
sessions_collection = db["sessions"]
roadmaps_collection = db["roadmaps"] 