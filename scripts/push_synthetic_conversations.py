import json
import os
from pymongo import MongoClient
from datetime import datetime
from bson import ObjectId

def parse_date(date_str):
    if not date_str:
        return None
    # Handle ISO format. Python's fromisoformat handles most, but let's be safe
    # The examples are like "2025-12-07T20:45:12.311000"
    try:
        return datetime.fromisoformat(date_str)
    except ValueError:
        return date_str

def main():
    json_path = "synthetic_conversations.json"
    uri = "mongodb+srv://ADA:JOCxymPsM8ZuElfe@cluster0.iac9go2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

    if not os.path.exists(json_path):
        print(f"File {json_path} not found.")
        return

    with open(json_path, "r") as f:
        data = json.load(f)

    # Prepare data for insertion
    documents_to_insert = []
    
    for doc in data:
        new_doc = doc.copy()
        
        # Remove _id to let MongoDB generate a unique ObjectId
        if "_id" in new_doc:
            del new_doc["_id"]
            
        # Convert top-level dates
        for date_field in ["startTime", "createdAt", "updatedAt"]:
            if date_field in new_doc:
                new_doc[date_field] = parse_date(new_doc[date_field])
        
        # Process events
        if "events" in new_doc and isinstance(new_doc["events"], list):
            for event in new_doc["events"]:
                # Remove _id from events too just in case
                if "_id" in event:
                    del event["_id"]
                
                if "timestamp" in event:
                    event["timestamp"] = parse_date(event["timestamp"])
                    
        documents_to_insert.append(new_doc)

    try:
        # Connect with SSL bypass as previously discovered
        client = MongoClient(uri, tlsAllowInvalidCertificates=True)
        db = client["ada_db"]
        collection = db["conversations"]
        
        print(f"Inserting {len(documents_to_insert)} documents into 'ada_db.conversations'...")
        result = collection.insert_many(documents_to_insert)
        
        print("Successfully inserted documents.")
        print("New ObjectIds:", result.inserted_ids)
        
    except Exception as e:
        print(f"Error inserting data: {e}")

if __name__ == "__main__":
    main()
