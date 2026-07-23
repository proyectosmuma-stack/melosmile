import urllib.request
import json
import os

url = "https://amhfdzfcmpastmlsosou.supabase.co/rest/v1/appointments?select=*"
headers = {
    "apikey": "sb_publishable_kN-3hlqUxOni9onF1CDmhg_03EOCXG6",
    "Authorization": "Bearer sb_publishable_kN-3hlqUxOni9onF1CDmhg_03EOCXG6"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data, indent=2))
except Exception as e:
    print("Error:", e)
