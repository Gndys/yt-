import pandas as pd
import os

# 输入文件
input_file = '/Users/gndys/Documents/编程开发/#开发中ind/可行性 MVP/02/9.29 新/00-数据准备/任务分配表/任务分配表_整理后.xlsx'
output_dir = '/Users/gndys/Documents/编程开发/#开发中ind/可行性 MVP/02/9.29 新/00-数据准备/任务分配表/CSV数据'

# 创建输出目录
os.makedirs(output_dir, exist_ok=True)

# 读取所有工作表并导出为CSV
sheet_names = ['杭州', '金华', '湖州']

print("正在导出CSV文件...")
for sheet_name in sheet_names:
    df = pd.read_excel(input_file, sheet_name=sheet_name)
    
    # 清理数据：移除汇总行
    df_clean = df[~df['负责人'].isin(['杭州汇总', '汇总'])].copy()
    df_clean = df[~df['区域'].isin(['季度占比', '年度占比'])].copy()
    
    # 导出完整数据
    output_file = os.path.join(output_dir, f'{sheet_name}_完整数据.csv')
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"✓ 已导出: {output_file}")
    print(f"  行数: {len(df)}")
    
    # 导出清理后的数据（去除汇总行）
    output_file_clean = os.path.join(output_dir, f'{sheet_name}_明细数据.csv')
    df_clean.to_csv(output_file_clean, index=False, encoding='utf-8-sig')
    print(f"✓ 已导出: {output_file_clean}")
    print(f"  行数: {len(df_clean)}\n")

# 合并所有地区数据
print("正在合并所有地区数据...")
all_data = []
for sheet_name in sheet_names:
    df = pd.read_excel(input_file, sheet_name=sheet_name)
    # 添加地区列
    df.insert(0, '地区', sheet_name)
    # 移除汇总行
    df_clean = df[~df['负责人'].isin(['杭州汇总', '汇总'])].copy()
    df_clean = df_clean[~df_clean['区域'].isin(['季度占比', '年度占比'])].copy()
    all_data.append(df_clean)

# 合并所有数据
merged_df = pd.concat(all_data, ignore_index=True)
merged_file = os.path.join(output_dir, '全部地区合并数据.csv')
merged_df.to_csv(merged_file, index=False, encoding='utf-8-sig')
print(f"✓ 已导出合并数据: {merged_file}")
print(f"  总行数: {len(merged_df)}")
print(f"  总负责人数: {merged_df['负责人'].nunique()}")

print("\n" + "="*60)
print("CSV导出完成！")
print("="*60)

