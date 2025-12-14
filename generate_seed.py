#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys

def generate_seed_sql(json_file, output_file):
    """JSON 데이터를 SQL seed 파일로 변환"""
    
    with open(json_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        # JSON 출력 부분만 추출
        json_start = False
        json_lines = []
        for line in lines:
            if line.strip() == '=== JSON 출력 ===':
                json_start = True
                continue
            if json_start:
                json_lines.append(line)
        
        data = json.loads(''.join(json_lines))
    
    location_codes = data['location_codes']
    shipping_lines = data['shipping_lines']
    
    # 배차업체 중복 제거
    dispatch_companies = set()
    for loc in location_codes:
        if loc['dispatch_company']:
            dispatch_companies.add(loc['dispatch_company'])
    
    sql_lines = []
    sql_lines.append('-- 초기 데이터 시드 파일 (상하차지/선사 코드)')
    sql_lines.append('-- 자동 생성됨\n')
    
    sql_lines.append('-- 기존 데이터 삭제')
    sql_lines.append('DELETE FROM location_codes;')
    sql_lines.append('DELETE FROM shipping_lines;')
    sql_lines.append('DELETE FROM dispatch_companies;\n')
    
    # 배차업체 삽입
    sql_lines.append('-- 협력업체 (배차업체) 삽입')
    for company in sorted(dispatch_companies):
        escaped = company.replace("'", "''")
        sql_lines.append(f"INSERT OR IGNORE INTO dispatch_companies (name, payment_level, notes) VALUES ('{escaped}', '일반', '');")
    sql_lines.append('')
    
    # 상하차지 코드 삽입
    sql_lines.append('-- 상하차지 코드 삽입')
    for loc in location_codes:
        name_escaped = loc['name'].replace("'", "''")
        code_escaped = loc['code'].replace("'", "''")
        dispatch_escaped = loc['dispatch_company'].replace("'", "''") if loc['dispatch_company'] else ''
        sql_lines.append(f"INSERT OR IGNORE INTO location_codes (name, code, dispatch_company) VALUES ('{name_escaped}', '{code_escaped}', '{dispatch_escaped}');")
    sql_lines.append('')
    
    # 선사 코드 삽입
    sql_lines.append('-- 선사 코드 삽입')
    for ship in shipping_lines:
        name_escaped = ship['name'].replace("'", "''")
        code_escaped = ship['code'].replace("'", "''")
        sql_lines.append(f"INSERT OR IGNORE INTO shipping_lines (name, code) VALUES ('{name_escaped}', '{code_escaped}');")
    
    # 파일 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_lines))
    
    print(f"SQL 파일 생성 완료: {output_file}")
    print(f"- 상하차지 코드: {len(location_codes)}개")
    print(f"- 선사 코드: {len(shipping_lines)}개")
    print(f"- 협력업체: {len(dispatch_companies)}개")

if __name__ == '__main__':
    generate_seed_sql('codes_data.json', 'seed.sql')
