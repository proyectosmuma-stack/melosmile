import os
import json
import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

N8N_URL = "https://n8n.mumaweb.com"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhODM3MjcyMy0wODhkLTQ0MWQtYTc0OS0zNjBmMGVhYjQyOTUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMGNjNzEyYWYtMWE4OC00YWQ5LTkzMGEtNTA1ZWY4NGM3MDZhIiwiaWF0IjoxNzcxNzY3NzYwfQ.RHOVLkZCyX9rqXcrdlX3X8Rg1cMYtmdXqDp3MnOHrEo"
WORKFLOW_ID = "jTWHg9bHaNOdzL13"

headers = {
    "X-N8N-API-KEY": N8N_API_KEY,
    "Accept": "application/json",
    "Content-Type": "application/json"
}

req = urllib.request.Request(f"{N8N_URL}/api/v1/workflows/{WORKFLOW_ID}", headers=headers)
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        workflow = json.loads(response.read().decode())
except Exception as e:
    print("Error fetching:", e)
    exit(1)

for node in workflow.get("nodes", []):
    if node["type"] == "@n8n/n8n-nodes-langchain.toolHttpRequest":
        if "url" in node["parameters"]:
            url = node["parameters"]["url"]
            if url.startswith("="):
                url = url[1:]
            node["parameters"]["url"] = url
            
        if "jsonBody" in node["parameters"]:
            body = node["parameters"]["jsonBody"]
            if body.startswith("="):
                body = body[1:]
            node["parameters"]["jsonBody"] = body

payload = {
    "name": workflow["name"],
    "nodes": workflow["nodes"],
    "connections": workflow["connections"],
    "settings": {}
}

req = urllib.request.Request(f"{N8N_URL}/api/v1/workflows/{WORKFLOW_ID}", headers=headers, method="PUT", data=json.dumps(payload).encode("utf-8"))
try:
    with urllib.request.urlopen(req, context=ctx) as response:
        resp = json.loads(response.read().decode())
        print("Successfully updated workflow:", resp.get("id"))
except Exception as e:
    print("Error updating:", e)
    try:
        print("Detail:", e.read().decode())
    except:
        pass

