import os
import pymongo
from pymongo.mongo_client import MongoClient
import json
from datetime import datetime, date

# Helper to handle non-serializable types like datetime/ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, (datetime, date)):
            return o.isoformat()
        if isinstance(o, (bytes,)):
            return o.decode("utf-8")
        if hasattr(o, '__str__'):
            return str(o)
        return json.JSONEncoder.default(self, o)

def main():
    uri = "mongodb+srv://ADA:JOCxymPsM8ZuElfe@cluster0.iac9go2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    
    try:
        client = MongoClient(uri, tlsAllowInvalidCertificates=True)
        # Ping to confirm connection
        client.admin.command('ping')
        print("Connected to MongoDB successfully.")
        # print(f"Nodes: {client.nodes}")
        try:
             print(f"Replica Set: {client.topology_description.replica_set_name}")
        except:
             pass
        
        target_collection_name = "conversations"
        found_data = False

        db_names = client.list_database_names()
        print(f"Databases found: {db_names}")

        for db_name in db_names:
            db = client[db_name]
            cols = db.list_collection_names()
            
            if target_collection_name in cols:
                print(f"\nFound '{target_collection_name}' in database '{db_name}'.")
                collection = db[target_collection_name]
                
                # Fetch documents
                docs = list(collection.find().limit(5).sort("_id", -1)) # Get last 5
                
                print(f"--- Data from {db_name}.{target_collection_name} ({len(docs)} docs) ---")
                print(json.dumps(docs, cls=MongoJSONEncoder, indent=2))
                found_data = True
                # specific to this user request, we probably just want the first one we find
                # break 

        if not found_data:
            print(f"\nCould not find collection '{target_collection_name}' in any accessible database.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
