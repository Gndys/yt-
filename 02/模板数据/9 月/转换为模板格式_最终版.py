import pandas as pd
import numpy as np
from datetime import datetime

# 文件路径
source_file = "2025.1月-9月回款(1).xlsx"
employee_file = "../../员工基础信息/员工基础信息表.xlsx"
output_file = f"销售员回款汇总表_1-9月_2025年数据_最终版.xlsx"

# 读取员工基础信息
df_employee = pd.read_excel(employee_file)
print("=" * 80)
print("步骤1: 读取员工基础信息")
print("=" * 80)
print(f"员工数: {len(df_employee)}")

# 定义销售组织和销售部门映射
sales_org = "杭州中冠电器有限公司"

# 根据地区映射销售部门
dept_mapping = {
    '杭州': '杭州大区',
    '湖州': '湖州办事处',
    '金华': '金华办事处',
    '嘉兴': '嘉兴办事处',
    '台州': '台州办事处',
    '绍兴': '绍兴办事处',
    '温州': '温州办事处',
    '丽水': '丽水办事处'
}

print("\n" + "=" * 80)
print("步骤2: 从各地区工作表汇总业务员回款数据（提取2025年数据）")
print("=" * 80)

# 月份列名
month_names = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月']

# 汇总数据字典
salesman_data = {}

# ==================== 特殊处理杭州工作表（2行表头）====================
print("\n处理【杭州】工作表（2行表头）...")

# 读取前2行分析表头
df_hz_header = pd.read_excel(source_file, sheet_name='杭州', header=None, nrows=2)

# 找出2025年数据所在的列
col_2025_indices = {}  # {月份: 列索引}

row0_fields = df_hz_header.iloc[0]  # 字段行
row1_years = df_hz_header.iloc[1]   # 年份行

current_month = None
for i in range(len(df_hz_header.columns)):
    field_val = row0_fields.iloc[i]
    if pd.notna(field_val) and '月' in str(field_val):
        month_str = str(field_val).strip()
        if month_str in month_names:
            current_month = month_str
    
    year_val = row1_years.iloc[i]
    if pd.notna(year_val) and '2025' in str(year_val):
        if current_month and current_month not in col_2025_indices:
            col_2025_indices[current_month] = i
            print(f"  找到: {current_month} -> 列{i} (2025年)")

# 读取实际数据（跳过前2行表头）
df_hz = pd.read_excel(source_file, sheet_name='杭州', skiprows=2, header=None)

# 业务员在第7列
salesman_col_idx = 7

if df_hz.shape[1] > salesman_col_idx:
    for salesman in df_hz.iloc[:, salesman_col_idx].dropna().unique():
        if pd.isna(salesman) or salesman == '业务员':
            continue
        
        df_salesman = df_hz[df_hz.iloc[:, salesman_col_idx] == salesman]
        
        monthly_sum = {}
        for month in month_names:
            if month in col_2025_indices:
                col_idx = col_2025_indices[month]
                if col_idx < df_hz.shape[1]:
                    month_data = pd.to_numeric(df_salesman.iloc[:, col_idx], errors='coerce').fillna(0)
                    monthly_sum[month] = month_data.sum()
                else:
                    monthly_sum[month] = 0
            else:
                monthly_sum[month] = 0
        
        if salesman not in salesman_data:
            salesman_data[salesman] = monthly_sum
        else:
            for month in month_names:
                salesman_data[salesman][month] += monthly_sum.get(month, 0)
        
        total = sum(monthly_sum.values())
        print(f"  业务员 [{salesman}]: 1-9月合计 = {total:.2f}")

# ==================== 处理其他地区工作表（2行表头）====================
other_sheets = ['湖州', '金衢', '嘉兴', '台州', '绍兴', '温丽 ']

for sheet in other_sheets:
    print(f"\n处理【{sheet}】工作表（2行表头）...")
    
    # 读取前2行分析表头
    df_header = pd.read_excel(source_file, sheet_name=sheet, header=None, nrows=2)
    
    # 第0行是字段名，第1行是年份
    row0_fields = df_header.iloc[0]
    row1_years = df_header.iloc[1]
    
    # 找出2025年数据所在的列
    col_2025_indices = {}
    
    current_month = None
    for i in range(len(df_header.columns)):
        field_val = row0_fields.iloc[i]
        
        # 检查是否是月份列
        if pd.notna(field_val) and '月' in str(field_val):
            month_str = str(field_val).strip()
            if month_str in month_names:
                current_month = month_str
        
        # 检查年份
        year_val = row1_years.iloc[i]
        if pd.notna(year_val) and '2025' in str(year_val):
            if current_month and current_month not in col_2025_indices:
                col_2025_indices[current_month] = i
                print(f"  找到: {current_month} -> 列{i} (2025年)")
    
    # 读取实际数据（跳过前2行表头）
    df_region = pd.read_excel(source_file, sheet_name=sheet, skiprows=2, header=None)
    
    # 业务员通常在第7列
    salesman_col_idx = 7
    
    if df_region.shape[1] > salesman_col_idx:
        for salesman in df_region.iloc[:, salesman_col_idx].dropna().unique():
            if pd.isna(salesman) or salesman == '业务员':
                continue
            
            df_salesman = df_region[df_region.iloc[:, salesman_col_idx] == salesman]
            
            monthly_sum = {}
            for month in month_names:
                if month in col_2025_indices:
                    col_idx = col_2025_indices[month]
                    if col_idx < df_salesman.shape[1]:
                        month_data = pd.to_numeric(df_salesman.iloc[:, col_idx], errors='coerce').fillna(0)
                        monthly_sum[month] = month_data.sum()
                    else:
                        monthly_sum[month] = 0
                else:
                    monthly_sum[month] = 0
            
            if salesman not in salesman_data:
                salesman_data[salesman] = monthly_sum
            else:
                for month in month_names:
                    salesman_data[salesman][month] += monthly_sum.get(month, 0)
            
            total = sum(monthly_sum.values())
            print(f"  业务员 [{salesman}]: 1-9月合计 = {total:.2f}")

print("\n" + "=" * 80)
print("步骤3: 生成模板格式数据")
print("=" * 80)

# 创建输出数据列表
output_data = []

for salesman, monthly_data in salesman_data.items():
    # 获取员工信息
    employee_info = df_employee[df_employee['员工姓名'] == salesman]
    
    if len(employee_info) > 0:
        region = employee_info.iloc[0]['所属地区']
        dept = dept_mapping.get(region, region)
    else:
        dept = "销管部"  # 默认部门
    
    # 计算参考总额（1-9月合计）
    total = sum(monthly_data.values())
    
    # 构建数据行
    row = {
        '销售员': salesman,
        '销售组织': sales_org,
        '销售部门': dept,
        '1月': monthly_data.get('1月', 0),
        '2月': monthly_data.get('2月', 0),
        '3月': monthly_data.get('3月', 0),
        '4月': monthly_data.get('4月', 0),
        '5月': monthly_data.get('5月', 0),
        '6月': monthly_data.get('6月', 0),
        '7月': monthly_data.get('7月', 0),
        '8月': monthly_data.get('8月', 0),
        '9月': monthly_data.get('9月', 0),
        '10月': 0,
        '11月': 0,
        '12月': 0,
        '参考总额': total,
        '填写说明': '请将总额分配到各月,确保各月之和等于总额'
    }
    
    output_data.append(row)
    print(f"{salesman} ({dept}): 参考总额 = {total:.2f}")

# 创建DataFrame
df_output = pd.DataFrame(output_data)

# 按参考总额降序排列
df_output = df_output.sort_values('参考总额', ascending=False).reset_index(drop=True)

print("\n" + "=" * 80)
print("步骤4: 保存到Excel文件")
print("=" * 80)

# 保存到Excel
df_output.to_excel(output_file, index=False, engine='openpyxl')

print(f"✓ 成功生成文件: {output_file}")
print(f"✓ 总计业务员数: {len(df_output)}")
print(f"✓ 总回款金额（2025年）: {df_output['参考总额'].sum():.2f}")

print("\n前10名业务员回款情况（2025年数据）：")
print(df_output.head(10)[['销售员', '销售部门', '1月', '2月', '3月', '参考总额']].to_string())

