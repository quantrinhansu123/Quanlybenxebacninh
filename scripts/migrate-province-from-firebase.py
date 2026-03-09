#!/usr/bin/env python3
"""
Migration script: Update operator province/district from Firebase export
Run from project root: python scripts/migrate-province-from-firebase.py
"""

import json
import os
import sys
from pathlib import Path

# Firebase export file path
FIREBASE_EXPORT_PATH = r'E:\Tải Xuống\benxe-management-20251218-default-rtdb-export (1).json'

def normalize_province(prov: str) -> str:
    """Normalize province names - fix common issues like 'Tỉnh Tỉnh X'"""
    if not prov:
        return ''
    prov = prov.strip()
    while prov.startswith('Tỉnh Tỉnh'):
        prov = prov.replace('Tỉnh Tỉnh', 'Tỉnh')
    return prov

def load_firebase_data() -> dict:
    """Load and parse Firebase export file"""
    print(f"Loading Firebase export from: {FIREBASE_EXPORT_PATH}")
    with open(FIREBASE_EXPORT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    dvvt = data.get('datasheet', {}).get('DONVIVANTAI', {})
    print(f"Found {len(dvvt)} operators in Firebase export")
    return dvvt

def build_update_data(dvvt: dict) -> list:
    """Build list of (firebase_id, province, district) tuples for update"""
    updates = []
    for k, v in dvvt.items():
        fb_id = v.get('id', k)
        province = normalize_province(v.get('province', ''))
        district = (v.get('district', '') or '').strip()

        if province:
            updates.append({
                'firebase_id': fb_id,
                'province': province,
                'district': district
            })

    print(f"Prepared {len(updates)} operators with province data")
    return updates

def generate_sql_batches(updates: list, batch_size: int = 100) -> list:
    """Generate SQL UPDATE statements in batches"""
    batches = []

    for i in range(0, len(updates), batch_size):
        batch = updates[i:i+batch_size]

        case_prov = []
        case_dist = []
        fb_ids = []

        for u in batch:
            fb_id = u['firebase_id']
            prov = u['province'].replace("'", "''")
            dist = u['district'].replace("'", "''")

            case_prov.append(f"WHEN firebase_id = '{fb_id}' THEN '{prov}'")
            case_dist.append(f"WHEN firebase_id = '{fb_id}' THEN '{dist}'")
            fb_ids.append(f"'{fb_id}'")

        sql = f"""UPDATE operators SET
  province = CASE {' '.join(case_prov)} END,
  district = CASE {' '.join(case_dist)} END,
  updated_at = NOW()
WHERE firebase_id IN ({', '.join(fb_ids)});"""

        batches.append({
            'batch_num': i // batch_size + 1,
            'count': len(batch),
            'sql': sql
        })

    return batches

def save_sql_files(batches: list, output_dir: str):
    """Save SQL batches to files for manual execution if needed"""
    os.makedirs(output_dir, exist_ok=True)

    for batch in batches:
        filepath = os.path.join(output_dir, f"batch-{batch['batch_num']:03d}.sql")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(f"-- Batch {batch['batch_num']}: {batch['count']} records\n")
            f.write(batch['sql'])

    print(f"Saved {len(batches)} SQL batch files to {output_dir}")

def main():
    print("=" * 60)
    print("Migration: Update operator province from Firebase export")
    print("=" * 60)

    # Load Firebase data
    dvvt = load_firebase_data()

    # Build update data
    updates = build_update_data(dvvt)

    # Generate SQL batches (100 records per batch)
    batches = generate_sql_batches(updates, batch_size=100)
    print(f"Generated {len(batches)} SQL batches")

    # Save SQL files
    output_dir = Path(__file__).parent / 'province-migration'
    save_sql_files(batches, str(output_dir))

    # Print summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total operators with province: {len(updates)}")
    print(f"Total SQL batches: {len(batches)}")
    print(f"SQL files saved to: {output_dir}")
    print("\nTo apply migration:")
    print("1. Run each SQL file through Supabase SQL editor, or")
    print("2. Use the Supabase MCP tool to execute each batch")

    return 0

if __name__ == '__main__':
    sys.exit(main())
