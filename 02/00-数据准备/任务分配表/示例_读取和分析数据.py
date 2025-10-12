"""
任务分配表 - 示例读取和分析程序
展示如何读取和分析整理后的数据
"""

import pandas as pd
import numpy as np

# 设置pandas显示选项
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)
pd.set_option('display.unicode.east_asian_width', True)

print("="*80)
print("任务分配表数据分析示例")
print("="*80)

# ==================== 示例1: 读取单个地区数据 ====================
print("\n【示例1】读取杭州地区明细数据")
print("-"*80)
df_hz = pd.read_csv('CSV数据/杭州_明细数据.csv')
print(f"数据形状: {df_hz.shape}")
print(f"\n前3行数据:")
print(df_hz[['负责人', '区域', 'Q1', 'Q2', 'Q3', 'Q4', '全年合计', '24年完成率']].head(3))

# ==================== 示例2: 读取全部地区合并数据 ====================
print("\n\n【示例2】读取全部地区合并数据")
print("-"*80)
df_all = pd.read_csv('CSV数据/全部地区合并数据.csv')
print(f"数据形状: {df_all.shape}")
print(f"地区分布:\n{df_all['地区'].value_counts()}")
print(f"\n负责人总数: {df_all['负责人'].nunique()}")

# ==================== 示例3: 统计分析 ====================
print("\n\n【示例3】各地区任务量统计")
print("-"*80)
region_stats = df_all.groupby('地区').agg({
    '全年合计': ['sum', 'mean', 'count'],
    'Q1': 'sum',
    'Q2': 'sum',
    'Q3': 'sum',
    'Q4': 'sum'
}).round(2)
print(region_stats)

# ==================== 示例4: 完成率分析 ====================
print("\n\n【示例4】2024年完成率TOP5负责人")
print("-"*80)
# 过滤掉缺失值
df_with_rate = df_all[df_all['24年完成率'].notna()].copy()
top5 = df_with_rate.nlargest(5, '24年完成率')[['地区', '负责人', '区域', '24年任务', '24年实际完成', '24年完成率']]
# 将完成率转换为百分比显示
top5_display = top5.copy()
top5_display['24年完成率'] = (top5_display['24年完成率'] * 100).round(2).astype(str) + '%'
print(top5_display.to_string(index=False))

# ==================== 示例5: 季度任务分布 ====================
print("\n\n【示例5】各季度任务量占比")
print("-"*80)
quarter_total = df_all[['Q1', 'Q2', 'Q3', 'Q4']].sum()
quarter_percent = (quarter_total / quarter_total.sum() * 100).round(2)
quarter_df = pd.DataFrame({
    '季度': ['Q1', 'Q2', 'Q3', 'Q4'],
    '任务量': quarter_total.values,
    '占比': quarter_percent.values.astype(str) + '%'
})
print(quarter_df.to_string(index=False))

# ==================== 示例6: 月度趋势分析 ====================
print("\n\n【示例6】全年月度任务量趋势")
print("-"*80)
months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
monthly_total = df_all[months].sum()
monthly_df = pd.DataFrame({
    '月份': months,
    '任务量': monthly_total.values.round(2)
})
print(monthly_df.to_string(index=False))

# 计算月度平均值和峰值
print(f"\n月度平均任务量: {monthly_total.mean():.2f} 万元")
print(f"月度最高任务量: {monthly_total.max():.2f} 万元 ({monthly_total.idxmax()})")
print(f"月度最低任务量: {monthly_total.min():.2f} 万元 ({monthly_total.idxmin()})")

# ==================== 示例7: 任务增长率分析 ====================
print("\n\n【示例7】任务增长率分析")
print("-"*80)
df_with_growth = df_all[df_all['任务增长率'].notna()].copy()
if len(df_with_growth) > 0:
    print(f"平均任务增长率: {(df_with_growth['任务增长率'].mean() * 100):.2f}%")
    print(f"最高增长率: {(df_with_growth['任务增长率'].max() * 100):.2f}% ({df_with_growth.loc[df_with_growth['任务增长率'].idxmax(), '负责人']})")
    print(f"最低增长率: {(df_with_growth['任务增长率'].min() * 100):.2f}% ({df_with_growth.loc[df_with_growth['任务增长率'].idxmin(), '负责人']})")

# ==================== 示例8: 数据筛选和导出 ====================
print("\n\n【示例8】筛选高绩效负责人（24年完成率>80%）")
print("-"*80)
high_performers = df_all[df_all['24年完成率'] > 0.8][['地区', '负责人', '区域', '全年合计', '24年完成率']]
if len(high_performers) > 0:
    high_performers_display = high_performers.copy()
    high_performers_display['24年完成率'] = (high_performers_display['24年完成率'] * 100).round(2).astype(str) + '%'
    print(high_performers_display.to_string(index=False))
    print(f"\n共{len(high_performers)}位负责人完成率超过80%")
else:
    print("没有负责人完成率超过80%")

# ==================== 示例9: 按区域统计 ====================
print("\n\n【示例9】各区域类型任务量统计")
print("-"*80)
# 过滤掉空值
df_with_area = df_all[df_all['区域'].notna()].copy()
area_stats = df_with_area.groupby('区域').agg({
    '全年合计': 'sum',
    '负责人': 'count'
}).round(2)
area_stats.columns = ['总任务量', '负责人数']
area_stats = area_stats.sort_values('总任务量', ascending=False)
print(area_stats.head(10))

print("\n" + "="*80)
print("数据分析完成！")
print("="*80)

