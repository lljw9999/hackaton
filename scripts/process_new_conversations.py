import sys
import os

# Ensure the script can import sibling modules when run as a script
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import json
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from analyze_transcript import analyze_text

def get_transcript_text(doc):
    """
    Extracts a readable transcript from the conversation document events.
    Assumes events have 'role' and 'text'.
    """
    if "events" not in doc or not isinstance(doc["events"], list):
        return ""
    
    transcript_lines = []
    for event in doc["events"]:
        if event.get("type") == "message":
            role = event.get("role", "unknown").capitalize()
            text = event.get("text", "")
            transcript_lines.append(f"{role}: {text}")
    
    return "\n".join(transcript_lines)

def main():
    uri = "mongodb+srv://ADA:JOCxymPsM8ZuElfe@cluster0.iac9go2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    model = "gpt-4o-mini"  # or gpt-4o, etc.

    try:
        # 1. Connect to MongoDB
        client = MongoClient(uri, tlsAllowInvalidCertificates=True)
        db = client["ada_db"]
        conversations_col = db["conversations"]
        semantics_col = db["conversation_semantics"]
        
        print("Connected to MongoDB.")

        # 2. Find all processed sessionIds to avoid re-work
        # (Alternatively, we could add a flag 'analyzed: true' to the conversations doc)
        processed_docs = list(semantics_col.find({}, {"sessionId": 1}))
        processed_session_ids = {doc["sessionId"] for doc in processed_docs if "sessionId" in doc}
        
        print(f"Found {len(processed_session_ids)} already processed sessions.")

        # 3. Find unprocessed conversations
        # Fetching all IDs first or using $nin (can be slow if large dataset, but fine for prototype)
        query = {"sessionId": {"$nin": list(processed_session_ids)}} if processed_session_ids else {}
        
        unprocessed_cursor = conversations_col.find(query)
        unprocessed_docs = list(unprocessed_cursor)
        
        print(f"Found {len(unprocessed_docs)} unprocessed conversations.")
        
        for doc in unprocessed_docs:
            session_id = doc.get("sessionId")
            if not session_id:
                print(f"Skipping doc with missing sessionId: {doc.get('_id')}")
                continue

            print(f"Processing session: {session_id}")
            
            # 4. Generate Transcript
            transcript_text = get_transcript_text(doc)
            if not transcript_text.strip():
                print(f"  - Empty transcript for {session_id}, skipping.")
                continue

            # 5. Analyze
            try:
                analysis_result = analyze_text(transcript_text, model)
                
                # 6. Save to conversation_semantics
                semantics_doc = {
                    "sessionId": session_id,
                    "originalConversationId": doc["_id"],
                    "analyzedAt": datetime.utcnow(),
                    "analysis": analysis_result
                }
                
                semantics_col.insert_one(semantics_doc)
                print(f"  - Analysis saved to 'conversation_semantics'.")

            except Exception as e:
                print(f"  - Error analyzing {session_id}: {e}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
