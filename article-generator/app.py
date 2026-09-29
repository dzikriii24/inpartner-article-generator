import os
import sys
import uvicorn

# Add project folder to sys.path
project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "project")
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

if __name__ == "__main__":
    print("Starting Inpartner Article Generator on http://127.0.0.1:8000 ...")
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)
