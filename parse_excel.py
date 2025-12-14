#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import json
import sys

def parse_code_data(excel_file):
    """상하차지/선사 코드 데이터 파싱"""
    df = pd.read_excel(excel_file, sheet_name=0)
    
    # 컬럼명 확인
    print(f"총 {len(df)} 행 발견")
    print(f"컬럼: {list(df.columns)}")
    
    # 데이터 파싱
    location_codes = []
    shipping_lines = []
    
    location_set = set()
    shipping_set = set()
    
    for idx, row in df.iterrows():
        # A열: 상차지명, B열: 코드, C열: 배차업체
        if pd.notna(row.iloc[0]) and pd.notna(row.iloc[1]):
            location_name = str(row.iloc[0]).strip()
            location_code = str(row.iloc[1]).strip()
            dispatch_company = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else ""
            
            key = (location_name, location_code)
            if key not in location_set:
                location_set.add(key)
                location_codes.append({
                    'name': location_name,
                    'code': location_code,
                    'dispatch_company': dispatch_company
                })
        
        # D열: 선사명, E열: 선사코드
        if pd.notna(row.iloc[3]) and pd.notna(row.iloc[4]):
            shipping_name = str(row.iloc[3]).strip()
            shipping_code = str(row.iloc[4]).strip()
            
            key = (shipping_name, shipping_code)
            if key not in shipping_set:
                shipping_set.add(key)
                shipping_lines.append({
                    'name': shipping_name,
                    'code': shipping_code
                })
    
    print(f"\n상하차지 코드: {len(location_codes)}개")
    print(f"선사 코드: {len(shipping_lines)}개")
    
    return {
        'location_codes': location_codes,
        'shipping_lines': shipping_lines
    }

def parse_order_data(excel_file):
    """엑셀에서 오더 데이터 파싱 (엑셀 업로드용)"""
    df = pd.read_excel(excel_file, sheet_name=0)
    
    orders = []
    
    for idx, row in df.iterrows():
        # A열: 수입OR수출여부
        if pd.isna(row.iloc[0]):
            continue
            
        order_type_str = str(row.iloc[0]).strip()
        
        # 타입 판단
        if '수출' in order_type_str:
            order_type = 'container_export'
        elif '수입' in order_type_str:
            order_type = 'container_import'
        elif 'LCL' in order_type_str.upper():
            order_type = 'lcl'
        else:
            order_type = 'bulk'
        
        # 데이터 추출
        order = {
            'order_type': order_type,
            'work_datetime': str(row.iloc[2]) if pd.notna(row.iloc[2]) else '',  # C: 작업일
            'billing_company': str(row.iloc[3]) if pd.notna(row.iloc[3]) else '',  # D: 청구처
            'shipper': str(row.iloc[4]) if pd.notna(row.iloc[4]) else '',  # E: 화주
            'work_site_code': str(row.iloc[5]) if pd.notna(row.iloc[5]) else '',  # F: 작업지코드
            'work_site': str(row.iloc[6]) if pd.notna(row.iloc[6]) else '',  # G: 작업지
            'container_size': str(row.iloc[7]) if pd.notna(row.iloc[7]) else '',  # H: 컨테이너사이즈
            'loading_location': str(row.iloc[8]) if pd.notna(row.iloc[8]) else '',  # I: 상차지
            'loading_location_code': str(row.iloc[9]) if pd.notna(row.iloc[9]) else '',  # J: 상차지 코드
            'unloading_location': str(row.iloc[10]) if pd.notna(row.iloc[10]) else '',  # K: 하차지
            'unloading_location_code': str(row.iloc[11]) if pd.notna(row.iloc[11]) else '',  # L: 하차지 코드
            'shipping_line': str(row.iloc[12]) if pd.notna(row.iloc[12]) else '',  # M: 선사
            'shipping_line_code': str(row.iloc[13]) if pd.notna(row.iloc[13]) else '',  # N: 선사코드
            'vessel_name': str(row.iloc[14]) if pd.notna(row.iloc[14]) else '',  # O: 선명
            'berth_date': str(row.iloc[15]) if pd.notna(row.iloc[15]) else '',  # P: 접안일
            'container_number': str(row.iloc[16]) if pd.notna(row.iloc[16]) else '',  # Q: 컨테이너 넘버
            'seal_number': str(row.iloc[17]) if pd.notna(row.iloc[17]) else '',  # R: 씰넘버
            'dispatch_company': str(row.iloc[18]) if pd.notna(row.iloc[18]) else '',  # S: 배차업체
            'vehicle_info': str(row.iloc[19]) if pd.notna(row.iloc[19]) else '',  # T: 차량정보
            'contact_person': str(row.iloc[25]) if pd.notna(row.iloc[25]) else '',  # Z: 담당자
            'remarks': []
        }
        
        # Y열: BKG/BL/NO
        if pd.notna(row.iloc[24]):
            bkg_bl_no = str(row.iloc[24])
            if order_type == 'container_export':
                order['booking_number'] = bkg_bl_no
            elif order_type == 'container_import':
                order['bl_number'] = bkg_bl_no
            else:
                order['order_no'] = bkg_bl_no
        
        # AB열: 비고
        if pd.notna(row.iloc[27]):
            remark_content = str(row.iloc[27]).strip()
            if remark_content:
                order['remarks'].append({
                    'content': remark_content,
                    'importance': 1
                })
        
        # 청구/하불
        order['billings'] = []
        order['payments'] = []
        
        if pd.notna(row.iloc[21]):  # V: 청구금액
            order['billings'].append({
                'amount': float(row.iloc[21]),
                'description': ''
            })
        
        if pd.notna(row.iloc[22]):  # W: 하불금액
            order['payments'].append({
                'amount': float(row.iloc[22]),
                'description': ''
            })
        
        orders.append(order)
    
    print(f"\n오더 데이터: {len(orders)}개")
    return orders

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python parse_excel.py <excel_file> [mode]")
        sys.exit(1)
    
    excel_file = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else 'codes'
    
    if mode == 'codes':
        result = parse_code_data(excel_file)
        print("\n=== JSON 출력 ===")
        print(json.dumps(result, ensure_ascii=False, indent=2))
    elif mode == 'orders':
        orders = parse_order_data(excel_file)
        print("\n=== JSON 출력 (첫 3개만) ===")
        print(json.dumps(orders[:3], ensure_ascii=False, indent=2))
