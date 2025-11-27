#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
提成计算数据核对工具
用于读取Excel文件并核对问题订单
"""

import pandas as pd
import sys
from pathlib import Path

# 问题订单列表
PROBLEM_ORDERS = {
    "A20251031003624": "未明确说明",
    "A20251031002265": "未明确说明",
    "A20251029003723": "佳尼特带单费",
    "A20251030000497": "应该是政策机型",
    "A20251028004580": "标注紫色",
    "A20251027004349": "保留小数",
    "A20251026007091": "带单费",
    "XSDD251026004": "采暖",
    "A20251026001230": "R1700wi 为什么给钱",
    "A20251025005260": "政策（还有100 带单费）269.46",
    "A20251022004134": "金华的能效不走特价机，参与过特价机佳尼特的不参加能效，特价机了什么活动都不参与",
    "A20251023001265": "收款问题查一下",
    "A20251021005203": "带单费没剪掉",
    "A20251021002402": "特价机优先",
    "A20251020003601": "回款对不上，查一下",
    "A20251022001997": "带单费",
    "A20251020000295": "符合套餐了可能",
    "A20250819001432C": "套餐问题",
    "A20251019000697": "带单费",
    "A20251019003525": "特价",
    "A20251012001647": "没有这单",
    "A20251014000643": "厨电两件套",
    "A20250930000811": "300没有",
}

def read_excel_file(file_path):
    """读取Excel文件的所有工作表"""
    print(f"正在读取文件: {file_path}")
    try:
        # 读取所有工作表
        excel_file = pd.ExcelFile(file_path)
        print(f"找到 {len(excel_file.sheet_names)} 个工作表: {excel_file.sheet_names}")
        
        sheets = {}
        for sheet_name in excel_file.sheet_names:
            sheets[sheet_name] = pd.read_excel(file_path, sheet_name=sheet_name)
            print(f"  - {sheet_name}: {len(sheets[sheet_name])} 行")
        
        return sheets
    except Exception as e:
        print(f"读取文件失败: {e}")
        return None

def analyze_problem_orders(df, sheet_name="明细"):
    """分析问题订单"""
    print(f"\n{'='*80}")
    print(f"开始分析问题订单 (工作表: {sheet_name})")
    print(f"{'='*80}\n")
    
    # 确定单据编号列名
    order_col = None
    for col in df.columns:
        if '单据编号' in str(col) or '订单' in str(col):
            order_col = col
            break
    
    if order_col is None:
        print("错误: 未找到单据编号列")
        print(f"可用列: {list(df.columns)}")
        return
    
    print(f"使用列名: {order_col}\n")
    
    # 分析每个问题订单
    found_count = 0
    missing_count = 0
    
    for order_no, issue in PROBLEM_ORDERS.items():
        # 查找订单
        mask = df[order_col].astype(str).str.contains(order_no, na=False)
        order_data = df[mask]
        
        if len(order_data) > 0:
            found_count += 1
            print(f"\n{'─'*80}")
            print(f"✓ 找到订单: {order_no}")
            print(f"  问题描述: {issue}")
            print(f"{'─'*80}")
            
            # 显示关键字段
            display_order_details(order_data.iloc[0], order_no, issue)
        else:
            missing_count += 1
            print(f"\n✗ 未找到订单: {order_no} (问题: {issue})")
    
    print(f"\n{'='*80}")
    print(f"统计: 找到 {found_count} 个订单, 缺失 {missing_count} 个订单")
    print(f"{'='*80}\n")

def display_order_details(row, order_no, issue):
    """显示订单详细信息"""
    # 关键字段列表
    key_fields = [
        "日期", "单据编号", "规格型号", "促销员", "客户店名",
        "大类型", "机型", "销售数量", "订单类型",
        "系统定价", "价税合计", "回款收款金额", "最终折扣率", "卖出的实际折扣",
        "支付带单提成点位", "带单费",
        "佳尼特特价", "特价机提成计算方案", "特价机公司最低折扣",
        "壁挂炉销售折扣", "销售政策折扣率", "销售政策提成原始", "销售政策加提原始",
        "能效标识", "所属地区",
        "特价机提成", "特价机提成说明",
        "壁挂炉提成", "壁挂炉提成说明",
        "销售政策提成", "销售政策提成说明",
        "销售政策加提", "销售政策加提说明",
        "烟灶提成", "烟灶提成说明",
        "国补提成", "国补提成说明",
        "折扣机提成", "折扣机提成说明",
        "最终总提成", "最终总提成说明",
        "常规机说明",
        "提成计算状态", "计算优先级"
    ]
    
    # 分类显示
    print("\n  【基本信息】")
    for field in ["日期", "单据编号", "规格型号", "促销员", "客户店名", "大类型", "机型"]:
        if field in row.index:
            print(f"    {field}: {row[field]}")
    
    print("\n  【金额与折扣】")
    for field in ["销售数量", "系统定价", "价税合计", "回款收款金额", "最终折扣率", "卖出的实际折扣"]:
        if field in row.index:
            value = row[field]
            if pd.notna(value) and isinstance(value, (int, float)):
                if '折扣' in field:
                    print(f"    {field}: {value:.4f} ({value*100:.2f}%)")
                else:
                    print(f"    {field}: {value:,.2f}")
            else:
                print(f"    {field}: {value}")
    
    print("\n  【带单费相关】")
    for field in ["支付带单提成点位", "带单费"]:
        if field in row.index:
            value = row[field]
            if pd.notna(value):
                print(f"    {field}: {value:,.2f}" if isinstance(value, (int, float)) else f"    {field}: {value}")
            else:
                print(f"    {field}: (空)")
    
    print("\n  【政策配置】")
    for field in ["佳尼特特价", "特价机提成计算方案", "特价机公司最低折扣", 
                  "壁挂炉销售折扣", "销售政策折扣率", "销售政策提成原始", "销售政策加提原始",
                  "能效标识", "所属地区", "订单类型"]:
        if field in row.index:
            value = row[field]
            if pd.notna(value):
                if isinstance(value, (int, float)) and '折扣' in field:
                    print(f"    {field}: {value:.4f}")
                elif isinstance(value, (int, float)):
                    print(f"    {field}: {value:,.2f}")
                else:
                    print(f"    {field}: {value}")
            else:
                print(f"    {field}: (空)")
    
    print("\n  【计算结果】")
    commission_fields = [
        ("特价机提成", "特价机提成说明"),
        ("壁挂炉提成", "壁挂炉提成说明"),
        ("销售政策提成", "销售政策提成说明"),
        ("销售政策加提", "销售政策加提说明"),
        ("烟灶提成", "烟灶提成说明"),
        ("国补提成", "国补提成说明"),
        ("折扣机提成", "折扣机提成说明"),
        ("最终总提成", "最终总提成说明"),
    ]
    
    for amount_field, desc_field in commission_fields:
        if amount_field in row.index:
            amount = row[amount_field]
            desc = row[desc_field] if desc_field in row.index else ""
            
            if pd.notna(amount) and amount != 0:
                if isinstance(amount, (int, float)):
                    print(f"    {amount_field}: {amount:,.2f}")
                else:
                    print(f"    {amount_field}: {amount}")
                if pd.notna(desc) and desc:
                    print(f"      └─ {desc}")
    
    if "常规机说明" in row.index and pd.notna(row["常规机说明"]) and row["常规机说明"]:
        print(f"    常规机说明: {row['常规机说明']}")
    
    # 问题分析
    print(f"\n  【问题分析】")
    analyze_issue(row, issue)

def analyze_issue(row, issue):
    """根据问题描述分析可能的原因"""
    issue_lower = issue.lower()
    
    if "带单费" in issue:
        leadfee1 = row.get("支付带单提成点位", None)
        leadfee2 = row.get("带单费", None)
        payment = row.get("回款收款金额", None)
        
        print(f"    → 带单费问题:")
        print(f"       支付带单提成点位: {leadfee1 if pd.notna(leadfee1) else '(空)'}")
        print(f"       带单费: {leadfee2 if pd.notna(leadfee2) else '(空)'}")
        print(f"       回款收款金额: {payment if pd.notna(payment) else '(空)'}")
        
        if pd.notna(leadfee1) or pd.notna(leadfee2):
            leadfee = leadfee1 if pd.notna(leadfee1) else leadfee2
            if pd.notna(payment):
                print(f"       扣除后金额: {payment - leadfee:,.2f}")
    
    elif "小数" in issue or "精度" in issue:
        print(f"    → 数值精度问题:")
        for field in ["特价机提成", "壁挂炉提成", "销售政策提成", "烟灶提成", "国补提成", "折扣机提成", "最终总提成"]:
            if field in row.index and pd.notna(row[field]):
                value = row[field]
                if isinstance(value, float):
                    decimal_places = len(str(value).split('.')[-1]) if '.' in str(value) else 0
                    print(f"       {field}: {value} (小数位数: {decimal_places})")
    
    elif "政策" in issue or "机型" in issue:
        print(f"    → 政策机型识别问题:")
        print(f"       销售政策折扣率: {row.get('销售政策折扣率', '(空)')}")
        print(f"       销售政策提成原始: {row.get('销售政策提成原始', '(空)')}")
        print(f"       销售政策加提原始: {row.get('销售政策加提原始', '(空)')}")
    
    elif "特价" in issue:
        print(f"    → 特价机识别问题:")
        print(f"       机型: {row.get('机型', '(空)')}")
        print(f"       佳尼特特价: {row.get('佳尼特特价', '(空)')}")
        print(f"       特价机提成计算方案: {row.get('特价机提成计算方案', '(空)')}")
    
    elif "能效" in issue or "金华" in issue:
        print(f"    → 能效/地区规则问题:")
        print(f"       所属地区: {row.get('所属地区', '(空)')}")
        print(f"       能效标识: {row.get('能效标识', '(空)')}")
        print(f"       特价机提成: {row.get('特价机提成', 0)}")
        print(f"       折扣机提成: {row.get('折扣机提成', 0)}")
    
    elif "套餐" in issue:
        print(f"    → 套餐识别问题:")
        print(f"       提成计算状态: {row.get('提成计算状态', '(空)')}")
        print(f"       计算优先级: {row.get('计算优先级', '(空)')}")
    
    elif "收款" in issue or "回款" in issue:
        print(f"    → 收款/回款问题:")
        print(f"       价税合计: {row.get('价税合计', '(空)')}")
        print(f"       回款收款金额: {row.get('回款收款金额', '(空)')}")
        if pd.notna(row.get('价税合计')) and pd.notna(row.get('回款收款金额')):
            diff = row['回款收款金额'] - row['价税合计']
            print(f"       差额: {diff:,.2f}")
    
    else:
        print(f"    → 其他问题: {issue}")

def generate_summary_report(sheets):
    """生成汇总报告"""
    print(f"\n{'='*80}")
    print("数据汇总报告")
    print(f"{'='*80}\n")
    
    if "明细" in sheets:
        df = sheets["明细"]
        print(f"总订单数: {len(df)}")
        
        # 统计各类提成
        commission_fields = ["特价机提成", "壁挂炉提成", "销售政策提成", "销售政策加提", 
                           "烟灶提成", "国补提成", "折扣机提成"]
        
        print("\n各类提成统计:")
        for field in commission_fields:
            if field in df.columns:
                non_zero = df[df[field] > 0]
                total = df[field].sum()
                print(f"  {field}: {len(non_zero)} 笔, 合计 {total:,.2f}")
        
        # 统计问题订单中找到的
        if "单据编号" in df.columns:
            found_in_data = []
            for order_no in PROBLEM_ORDERS.keys():
                mask = df["单据编号"].astype(str).str.contains(order_no, na=False)
                if mask.any():
                    found_in_data.append(order_no)
            
            print(f"\n问题订单统计:")
            print(f"  总问题订单数: {len(PROBLEM_ORDERS)}")
            print(f"  在数据中找到: {len(found_in_data)}")
            print(f"  未找到: {len(PROBLEM_ORDERS) - len(found_in_data)}")

def main():
    # 文件路径
    file_path = Path(__file__).parent / "输出结果" / "五合一提成计算_2025-11-18.xlsx"
    
    if not file_path.exists():
        print(f"错误: 文件不存在: {file_path}")
        print("请确保文件路径正确")
        return
    
    # 读取Excel文件
    sheets = read_excel_file(file_path)
    if sheets is None:
        return
    
    # 分析明细数据
    if "明细" in sheets:
        analyze_problem_orders(sheets["明细"], "明细")
    else:
        print("警告: 未找到'明细'工作表")
        print(f"可用工作表: {list(sheets.keys())}")
        # 尝试使用第一个工作表
        if sheets:
            first_sheet = list(sheets.keys())[0]
            print(f"使用第一个工作表: {first_sheet}")
            analyze_problem_orders(sheets[first_sheet], first_sheet)
    
    # 生成汇总报告
    generate_summary_report(sheets)
    
    print("\n分析完成!")

if __name__ == "__main__":
    main()
