import csv
import re
import os

markdown_path = r'c:\Users\dzikri\Downloads\Inpartner\inpartner-product\project_plan.md'
csv_path = r'c:\Users\dzikri\Downloads\Inpartner\inpartner-product\project_plan.csv'

with open(markdown_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

data = []
current_phase = ""
current_timeline = ""

for line in lines:
    line = line.strip()
    if line.startswith('### Phase'):
        # Extract phase and timeline
        # Example: ### Phase 1: Foundation & Database Blueprint (Days 1-2)
        match = re.match(r'### (Phase \d+.*?)\s*\((Days \d+-\d+)\)', line)
        if match:
            current_phase = match.group(1)
            current_timeline = match.group(2)
        else:
            current_phase = line.replace('###', '').strip()
            current_timeline = ""
    elif line.startswith('- ') and not line.startswith('- **Tasks:**'):
        task = line[2:].strip()
        data.append([
            current_phase,
            current_timeline,
            task,
            'Dzikri Rabbani', # PIC
            '', # Status
            current_timeline, # Date / Due Date
            '' # Notes
        ])
    elif line.startswith('  - '):
        task = line[4:].strip()
        data.append([
            current_phase,
            current_timeline,
            task,
            'Dzikri Rabbani', # PIC
            'Belum Berjalan', # Status (default)
            current_timeline, # Date / Due Date
            '' # Notes
        ])
    elif line.startswith('    - '):
        task = "  - " + line[6:].strip()
        data.append([
            current_phase,
            current_timeline,
            task,
            'Dzikri Rabbani', # PIC
            'Belum Berjalan', # Status (default)
            current_timeline, # Date / Due Date
            '' # Notes
        ])

with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Phase / Goal', 'Timeline', 'Task', 'PIC', 'Status', 'Date / Due Date', 'Notes'])
    writer.writerows(data)

print("CSV created successfully at:", csv_path)
