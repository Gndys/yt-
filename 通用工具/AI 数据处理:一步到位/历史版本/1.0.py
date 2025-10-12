#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
大型Excel表格处理工具 - 图形界面版
功能：读取大型Excel文件，筛选指定列，并保存结果
新增：AI 智能筛选（DeepSeek Chat）- 根据自然语言自动生成筛选列与条件
"""

import pandas as pd
import numpy as np
import os
import sys
import gc
import json
from tqdm import tqdm
from PyQt5.QtWidgets import (QApplication, QMainWindow, QPushButton, QLabel, 
                            QFileDialog, QComboBox, QLineEdit, QVBoxLayout, 
                            QHBoxLayout, QWidget, QTableWidget, QTableWidgetItem,
                            QCheckBox, QListWidget, QMessageBox, QProgressBar,
                            QGroupBox, QFormLayout, QSpinBox, QListWidgetItem,
                            QSplitter, QTabWidget, QTextEdit)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QIcon

# 导入原始功能函数
def memory_usage(pandas_obj):
    """
    计算pandas对象的内存使用量
    """
    if isinstance(pandas_obj, pd.DataFrame):
        usage_bytes = pandas_obj.memory_usage(deep=True).sum()
    else:  # Series
        usage_bytes = pandas_obj.memory_usage(deep=True)
    usage_mb = usage_bytes / 1024 / 1024
    return f"{usage_mb:.2f} MB"

def optimize_dataframe(df):
    """
    优化DataFrame的内存使用
    """
    start_mem = df.memory_usage(deep=True).sum() / 1024 / 1024
    
    # 优化数值类型列
    for col in df.columns:
        col_type = df[col].dtype
        
        if col_type != object:  # 数值类型
            c_min = df[col].min()
            c_max = df[col].max()
            
            # 整数类型优化
            if str(col_type)[:3] == 'int':
                if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                    df[col] = df[col].astype(np.int8)
                elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                    df[col] = df[col].astype(np.int16)
                elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                    df[col] = df[col].astype(np.int32)
                elif c_min > np.iinfo(np.int64).min and c_max < np.iinfo(np.int64).max:
                    df[col] = df[col].astype(np.int64)
            
            # 浮点类型优化
            elif str(col_type)[:5] == 'float':
                if c_min > np.finfo(np.float32).min and c_max < np.finfo(np.float32).max:
                    df[col] = df[col].astype(np.float32)
                else:
                    df[col] = df[col].astype(np.float64)
        
        # 字符串类型优化
        elif col_type == object:
            # 尝试转换为分类型
            if df[col].nunique() / len(df[col]) < 0.5:  # 如果唯一值比例小于50%
                df[col] = df[col].astype('category')
    
    end_mem = df.memory_usage(deep=True).sum() / 1024 / 1024
    reduction = 100 * (start_mem - end_mem) / start_mem
    
    return df, start_mem, end_mem, reduction

def filter_rows(df, filter_conditions):
    """
    根据条件筛选行
    条件格式: "列名,操作符,值" (例如: "年龄,>,18")
    支持的操作符: >, <, >=, <=, ==, !=, contains
    """
    if not filter_conditions:
        return df
    
    filtered_df = df.copy()
    
    for condition in filter_conditions:
        parts = condition.split(',', 2)
        if len(parts) != 3:
            continue
        
        column, operator, value = parts
        column = column.strip()
        operator = operator.strip()
        value = value.strip()
        
        if column not in filtered_df.columns:
            continue
        
        try:
            # 尝试将值转换为数值类型
            if filtered_df[column].dtype.kind in 'ifc':  # 整数、浮点数或复数
                try:
                    value = float(value) if '.' in value else int(value)
                except ValueError:
                    pass
            
            # 应用筛选条件
            if operator == '>':
                filtered_df = filtered_df[filtered_df[column] > value]
            elif operator == '<':
                filtered_df = filtered_df[filtered_df[column] < value]
            elif operator == '>=':
                filtered_df = filtered_df[filtered_df[column] >= value]
            elif operator == '<=':
                filtered_df = filtered_df[filtered_df[column] <= value]
            elif operator == '==':
                filtered_df = filtered_df[filtered_df[column] == value]
            elif operator == '!=':
                filtered_df = filtered_df[filtered_df[column] != value]
            elif operator.lower() == 'contains':
                filtered_df = filtered_df[filtered_df[column].astype(str).str.contains(value, na=False)]
        except Exception:
            pass
    
    return filtered_df

# 工作线程类，用于后台处理Excel文件
class ExcelWorker(QThread):
    progress_signal = pyqtSignal(int)
    status_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(pd.DataFrame)
    error_signal = pyqtSignal(str)
    columns_signal = pyqtSignal(list)
    
    def __init__(self, file_path, sheet_name=0, chunksize=100000, columns_only=False):
        super().__init__()
        self.file_path = file_path
        self.sheet_name = sheet_name
        self.chunksize = chunksize
        self.columns_only = columns_only
        
    def run(self):
        try:
            if self.columns_only:
                self.status_signal.emit("正在读取列名...")
                df_header = pd.read_excel(self.file_path, sheet_name=self.sheet_name, nrows=0)
                self.columns_signal.emit(df_header.columns.tolist())
                return
                
            self.status_signal.emit(f"正在读取文件: {self.file_path}")
            
            # 首先读取列名
            df_header = pd.read_excel(self.file_path, sheet_name=self.sheet_name, nrows=0)
            columns = df_header.columns.tolist()
            
            # 使用openpyxl引擎读取Excel
            excel_file = pd.ExcelFile(self.file_path, engine='openpyxl')
            sheet = excel_file.book[excel_file.sheet_names[self.sheet_name if isinstance(self.sheet_name, int) else excel_file.sheet_names.index(self.sheet_name)]]
            
            # 获取总行数
            total_rows = sheet.max_row - 1  # 减去标题行
            
            # 创建一个空的DataFrame用于存储所有数据
            all_data = pd.DataFrame(columns=columns)
            
            # 分块读取数据
            for i in range(0, total_rows, self.chunksize):
                end_row = min(i + self.chunksize, total_rows)
                chunk = pd.read_excel(self.file_path, sheet_name=self.sheet_name, skiprows=range(1, i+1), nrows=end_row-i)
                all_data = pd.concat([all_data, chunk], ignore_index=True)
                
                # 更新进度
                progress = int(100 * end_row / total_rows)
                self.progress_signal.emit(progress)
                self.status_signal.emit(f"读取进度: {progress}% ({end_row}/{total_rows}行)")
                
                # 手动触发垃圾回收
                gc.collect()
            
            self.status_signal.emit(f"成功读取数据: {len(all_data)} 行 x {len(all_data.columns)} 列")
            self.finished_signal.emit(all_data)
            
        except Exception as e:
            self.error_signal.emit(f"读取过程中出错: {str(e)}")

# 筛选工作线程
class FilterWorker(QThread):
    progress_signal = pyqtSignal(int)
    status_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(pd.DataFrame)
    error_signal = pyqtSignal(str)
    
    def __init__(self, df, columns_to_keep=None, filter_conditions=None, optimize=False):
        super().__init__()
        self.df = df
        self.columns_to_keep = columns_to_keep
        self.filter_conditions = filter_conditions
        self.optimize = optimize
        
    def run(self):
        try:
            result_df = self.df.copy()
            
            # 优化内存使用
            if self.optimize:
                self.status_signal.emit("正在优化内存使用...")
                result_df, start_mem, end_mem, reduction = optimize_dataframe(result_df)
                self.status_signal.emit(f"内存使用优化: {start_mem:.2f} MB -> {end_mem:.2f} MB (减少 {reduction:.2f}%)")
            
            # 筛选列
            if self.columns_to_keep:
                self.status_signal.emit(f"正在筛选列...")
                # 检查所有请求的列是否存在
                all_columns = result_df.columns.tolist()
                valid_columns = [col for col in self.columns_to_keep if col in all_columns]
                
                if not valid_columns:
                    self.error_signal.emit("错误: 没有有效的列可以筛选")
                    return
                
                result_df = result_df[valid_columns]
                self.status_signal.emit(f"列筛选完成: 保留了 {len(valid_columns)} 列")
            
            # 筛选行
            if self.filter_conditions:
                self.status_signal.emit(f"正在应用筛选条件...")
                original_rows = len(result_df)
                result_df = filter_rows(result_df, self.filter_conditions)
                self.status_signal.emit(f"行筛选完成: {original_rows} -> {len(result_df)} 行")
            
            self.finished_signal.emit(result_df)
            
        except Exception as e:
            self.error_signal.emit(f"筛选过程中出错: {str(e)}")

# 保存工作线程
class SaveWorker(QThread):
    progress_signal = pyqtSignal(int)
    status_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(bool)
    error_signal = pyqtSignal(str)
    
    def __init__(self, df, output_path):
        super().__init__()
        self.df = df
        self.output_path = output_path
        
    def run(self):
        try:
            self.status_signal.emit(f"正在保存到: {self.output_path}")
            
            # 根据文件扩展名决定保存格式
            if self.output_path.endswith('.xlsx'):
                self.df.to_excel(self.output_path, index=False)
            elif self.output_path.endswith('.csv'):
                self.df.to_csv(self.output_path, index=False)
            else:
                self.df.to_excel(self.output_path, index=False)
                
            self.status_signal.emit("保存完成!")
            self.finished_signal.emit(True)
            
        except Exception as e:
            self.error_signal.emit(f"保存过程中出错: {str(e)}")

# AI 智能筛选工作线程
class AIWorker(QThread):
    status_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(dict)
    error_signal = pyqtSignal(str)

    def __init__(self, df, columns, base_url, model, api_key, user_prompt, sample_rows=200):
        super().__init__()
        self.df = df
        self.columns = columns or []
        self.base_url = (base_url or "").strip()
        self.model = (model or "").strip()
        self.api_key = (api_key or "").strip()
        self.user_prompt = (user_prompt or "").strip()
        self.sample_rows = sample_rows

    def build_metadata(self):
        meta = []
        if self.df is None or len(self.columns) == 0:
            return meta
        sample_df = self.df.head(self.sample_rows)
        for col in self.columns:
            try:
                s = sample_df[col]
            except Exception:
                continue
            dtype = str(s.dtype)
            info = {"name": col, "dtype": dtype}
            try:
                vals = s.dropna().astype(str).unique()[:8]
                info["examples"] = vals.tolist() if hasattr(vals, "tolist") else list(vals)
            except Exception:
                info["examples"] = []
            try:
                if s.dtype.kind in "iuf":
                    s_num = pd.to_numeric(s, errors="coerce")
                    info["min"] = None if s_num.isna().all() else float(s_num.min())
                    info["max"] = None if s_num.isna().all() else float(s_num.max())
            except Exception:
                pass
            meta.append(info)
        return meta

    def build_prompt(self, meta):
        instruction = (
            "你是一个表格筛选助手。根据用户的中文需求，结合提供的列清单与示例值，生成筛选方案。\n"
            "必须严格输出 JSON，且只有 JSON，不要包含额外文字或注释。\n"
            "JSON Schema:\n"
            "{\n"
            '  "columns_to_keep": [字符串列名...],\n'
            '  "filters": [ {"column": 列名, "operator": 仅限 ">", "<", ">=", "<=", "==", "!=", "contains", "value": 字符串或数字} ]\n'
            "}\n"
            "规范说明:\n"
            "- 仅使用提供的列名；若需求含别名/口语，请映射到最相近的真实列名。\n"
            "- 对日期/月份等可用 contains 搭配字符串片段，如 contains=2024-06。\n"
            "- 若筛选值为字符串，请原样作为字符串；若为数字请输出数字类型。\n"
            "- 不要输出任何无法由过滤逻辑实现的表达式。\n"
        )
        return f"{instruction}\n可用列及示例:\n{json.dumps(meta, ensure_ascii=False)}\n用户需求:\n{self.user_prompt}"

    def call_llm(self, prompt):
        import requests
        url = self.base_url.rstrip("/") + "/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant specialized in generating JSON-only outputs for data filtering."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        if resp.status_code >= 300:
            raise RuntimeError(f"LLM API 错误: {resp.status_code} {resp.text}")
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return content

    def parse_json(self, content):
        import re
        txt = (content or "").strip()
        # 直接解析
        try:
            return json.loads(txt)
        except Exception:
            pass
        # 提取代码块
        for pattern in [r"```json\s*(\{.*?\})\s*```", r"```\s*(\{.*?\})\s*```"]:
            m = re.search(pattern, txt, re.S)
            if m:
                try:
                    return json.loads(m.group(1))
                except Exception:
                    continue
        # 大括号截取
        start = txt.find("{")
        end = txt.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(txt[start:end+1])
        raise ValueError("AI 返回内容非 JSON")

    def run(self):
        try:
            if not self.base_url or not self.model or not self.api_key or not self.user_prompt:
                raise ValueError("参数不完整：Base URL / Model / API Key / 需求描述 均不能为空")
            self.status_signal.emit("AI: 正在生成元数据并构建提示词...")
            meta = self.build_metadata()
            prompt = self.build_prompt(meta)
            self.status_signal.emit("AI: 正在调用模型解析需求...")
            content = self.call_llm(prompt)
            self.status_signal.emit("AI: 正在解析模型返回...")
            result = self.parse_json(content)
            if not isinstance(result, dict):
                raise ValueError("AI 返回不是对象")
            cols = result.get("columns_to_keep", []) or []
            flt = result.get("filters", []) or []
            self.finished_signal.emit({"columns_to_keep": cols, "filters": flt})
        except ModuleNotFoundError:
            self.error_signal.emit("未安装 requests 库，请先安装: pip install requests")
        except Exception as e:
            self.error_signal.emit(f"AI 解析失败: {str(e)}")

# 主窗口类
class ExcelFilterApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.df = None
        self.filtered_df = None
        self.available_columns = []
        self.initUI()
        
    def initUI(self):
        self.setWindowTitle('Excel表格筛选工具')
        self.setGeometry(100, 100, 1200, 800)
        
        # 创建中央部件和主布局
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # 创建选项卡
        tabs = QTabWidget()
        main_layout.addWidget(tabs)
        
        # 第一个选项卡: 数据加载
        load_tab = QWidget()
        load_layout = QVBoxLayout(load_tab)
        
        # 文件选择部分
        file_group = QGroupBox("文件选择")
        file_layout = QFormLayout()
        
        self.file_path_edit = QLineEdit()
        self.file_path_edit.setReadOnly(True)
        browse_button = QPushButton("浏览...")
        browse_button.clicked.connect(self.browse_file)
        
        file_path_layout = QHBoxLayout()
        file_path_layout.addWidget(self.file_path_edit)
        file_path_layout.addWidget(browse_button)
        
        file_layout.addRow("Excel文件:", file_path_layout)
        
        # 工作表选择
        self.sheet_combo = QComboBox()
        self.sheet_combo.setEnabled(False)
        file_layout.addRow("工作表:", self.sheet_combo)
        
        # 分块大小设置
        self.chunk_size_spin = QSpinBox()
        self.chunk_size_spin.setRange(1000, 1000000)
        self.chunk_size_spin.setSingleStep(10000)
        self.chunk_size_spin.setValue(100000)
        file_layout.addRow("分块大小:", self.chunk_size_spin)
        
        # 优化内存选项
        self.optimize_check = QCheckBox("优化内存使用")
        self.optimize_check.setChecked(True)
        file_layout.addRow("", self.optimize_check)
        
        file_group.setLayout(file_layout)
        load_layout.addWidget(file_group)
        
        # 加载按钮
        self.load_button = QPushButton("加载数据")
        self.load_button.clicked.connect(self.load_data)
        self.load_button.setEnabled(False)
        load_layout.addWidget(self.load_button)
        
        # 进度条
        self.progress_bar = QProgressBar()
        load_layout.addWidget(self.progress_bar)
        
        # 状态信息
        self.status_label = QLabel("准备就绪")
        load_layout.addWidget(self.status_label)
        
        tabs.addTab(load_tab, "1. 加载数据")
        
        # 第二个选项卡: 数据筛选
        filter_tab = QWidget()
        filter_layout = QVBoxLayout(filter_tab)
        
        # 创建分割器
        splitter = QSplitter(Qt.Horizontal)
        filter_layout.addWidget(splitter)
        
        # 左侧: 筛选选项
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        
        # 列选择
        columns_group = QGroupBox("列选择")
        columns_layout = QVBoxLayout()
        
        # 添加搜索框
        search_layout = QHBoxLayout()
        search_layout.addWidget(QLabel("搜索列:"))
        self.column_search_edit = QLineEdit()
        self.column_search_edit.setPlaceholderText("输入列名进行搜索...")
        self.column_search_edit.textChanged.connect(self.filter_columns_list)
        search_layout.addWidget(self.column_search_edit)
        columns_layout.addLayout(search_layout)
        
        self.all_columns_list = QListWidget()
        self.all_columns_list.setSelectionMode(QListWidget.MultiSelection)
        columns_layout.addWidget(QLabel("可用列:"))
        columns_layout.addWidget(self.all_columns_list)
        
        self.selected_columns_list = QListWidget()
        columns_layout.addWidget(QLabel("已选择列:"))
        columns_layout.addWidget(self.selected_columns_list)
        
        columns_buttons_layout = QHBoxLayout()
        add_column_button = QPushButton("添加 →")
        add_column_button.clicked.connect(self.add_selected_columns)
        remove_column_button = QPushButton("← 移除")
        remove_column_button.clicked.connect(self.remove_selected_columns)
        columns_buttons_layout.addWidget(add_column_button)
        columns_buttons_layout.addWidget(remove_column_button)
        columns_layout.addLayout(columns_buttons_layout)
        
        columns_group.setLayout(columns_layout)
        left_layout.addWidget(columns_group)
        
        # 筛选条件
        filter_group = QGroupBox("筛选条件")
        filter_layout_inner = QVBoxLayout()
        
        self.filter_list = QListWidget()
        filter_layout_inner.addWidget(self.filter_list)
        
        # 添加筛选条件列搜索
        filter_search_layout = QHBoxLayout()
        filter_search_layout.addWidget(QLabel("搜索列:"))
        self.filter_search_edit = QLineEdit()
        self.filter_search_edit.setPlaceholderText("输入列名进行搜索...")
        self.filter_search_edit.textChanged.connect(self.filter_condition_columns)
        filter_search_layout.addWidget(self.filter_search_edit)
        filter_layout_inner.addLayout(filter_search_layout)
        
        filter_input_layout = QHBoxLayout()
        self.filter_column_combo = QComboBox()
        self.filter_column_combo.setEditable(True)
        self.filter_column_combo.setInsertPolicy(QComboBox.NoInsert)
        self.filter_operator_combo = QComboBox()
        self.filter_operator_combo.addItems(['>', '<', '>=', '<=', '==', '!=', 'contains'])
        self.filter_value_edit = QLineEdit()
        
        filter_input_layout.addWidget(self.filter_column_combo)
        filter_input_layout.addWidget(self.filter_operator_combo)
        filter_input_layout.addWidget(self.filter_value_edit)
        
        filter_layout_inner.addLayout(filter_input_layout)
        
        filter_buttons_layout = QHBoxLayout()
        add_filter_button = QPushButton("添加条件")
        add_filter_button.clicked.connect(self.add_filter_condition)
        remove_filter_button = QPushButton("移除条件")
        remove_filter_button.clicked.connect(self.remove_filter_condition)
        filter_buttons_layout.addWidget(add_filter_button)
        filter_buttons_layout.addWidget(remove_filter_button)
        
        filter_layout_inner.addLayout(filter_buttons_layout)
        filter_group.setLayout(filter_layout_inner)
        left_layout.addWidget(filter_group)

        # AI 智能筛选
        ai_group = QGroupBox("AI 智能筛选")
        ai_form = QFormLayout()
        self.ai_base_url_edit = QLineEdit()
        self.ai_base_url_edit.setText("https://api.deepseek.com/v1")
        self.ai_model_edit = QLineEdit()
        self.ai_model_edit.setText("deepseek-chat")
        self.ai_api_key_edit = QLineEdit()
        default_key = os.environ.get("DEEPSEEK_API_KEY", "sk-96f5d6bd84e2470592d84d85e82ffb92")
        self.ai_api_key_edit.setText(default_key)
        self.ai_api_key_edit.setEchoMode(QLineEdit.Password)
        self.ai_prompt_edit = QTextEdit()
        self.ai_prompt_edit.setPlaceholderText("示例：只要上海 2024 年 6 月的销售订单，保留订单号、客户名、金额列，金额>1000")
        self.ai_parse_button = QPushButton("AI 解析需求")
        self.ai_parse_button.clicked.connect(self.ai_parse)
        ai_form.addRow("Base URL:", self.ai_base_url_edit)
        ai_form.addRow("Model:", self.ai_model_edit)
        ai_form.addRow("API Key:", self.ai_api_key_edit)
        ai_form.addRow("需求描述:", self.ai_prompt_edit)
        ai_form.addRow(self.ai_parse_button)
        ai_group.setLayout(ai_form)
        left_layout.addWidget(ai_group)
        
        # 应用筛选按钮
        self.apply_filter_button = QPushButton("应用筛选")
        self.apply_filter_button.clicked.connect(self.apply_filters)
        self.apply_filter_button.setEnabled(False)
        left_layout.addWidget(self.apply_filter_button)
        
        splitter.addWidget(left_widget)
        
        # 右侧: 数据预览
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        
        self.data_info_label = QLabel("数据信息: 未加载")
        right_layout.addWidget(self.data_info_label)
        
        self.preview_table = QTableWidget()
        right_layout.addWidget(self.preview_table)
        
        splitter.addWidget(right_widget)
        
        # 设置分割器的初始大小
        splitter.setSizes([400, 800])
        
        tabs.addTab(filter_tab, "2. 筛选数据")
        
        # 第三个选项卡: 保存结果
        save_tab = QWidget()
        save_layout = QVBoxLayout(save_tab)
        
        save_group = QGroupBox("保存选项")
        save_inner_layout = QFormLayout()
        
        self.save_path_edit = QLineEdit()
        self.save_path_edit.setReadOnly(True)
        save_browse_button = QPushButton("浏览...")
        save_browse_button.clicked.connect(self.browse_save_location)
        
        save_path_layout = QHBoxLayout()
        save_path_layout.addWidget(self.save_path_edit)
        save_path_layout.addWidget(save_browse_button)
        
        save_inner_layout.addRow("保存位置:", save_path_layout)
        
        save_group.setLayout(save_inner_layout)
        save_layout.addWidget(save_group)
        
        # 保存按钮
        self.save_button = QPushButton("保存结果")
        self.save_button.clicked.connect(self.save_results)
        self.save_button.setEnabled(False)
        save_layout.addWidget(self.save_button)
        
        # 日志区域
        log_group = QGroupBox("处理日志")
        log_layout = QVBoxLayout()
        
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        log_layout.addWidget(self.log_text)
        
        log_group.setLayout(log_layout)
        save_layout.addWidget(log_group)
        
        tabs.addTab(save_tab, "3. 保存结果")
        
    def browse_file(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "选择Excel文件", "", "Excel文件 (*.xlsx *.xls)")
        if file_path:
            self.file_path_edit.setText(file_path)
            self.load_button.setEnabled(True)
            
            # 加载工作表名称
            try:
                excel_file = pd.ExcelFile(file_path)
                self.sheet_combo.clear()
                self.sheet_combo.addItems(excel_file.sheet_names)
                self.sheet_combo.setEnabled(True)
            except Exception as e:
                QMessageBox.warning(self, "错误", f"读取工作表名称时出错: {str(e)}")
    
    def load_data(self):
        file_path = self.file_path_edit.text()
        if not file_path:
            return
            
        sheet_name = self.sheet_combo.currentText()
        chunk_size = self.chunk_size_spin.value()
        
        # 首先只加载列名
        self.columns_worker = ExcelWorker(file_path, sheet_name, chunk_size, columns_only=True)
        self.columns_worker.status_signal.connect(self.update_status)
        self.columns_worker.columns_signal.connect(self.update_columns)
        self.columns_worker.error_signal.connect(self.show_error)
        self.columns_worker.start()
        
        # 然后加载完整数据
        self.excel_worker = ExcelWorker(file_path, sheet_name, chunk_size)
        self.excel_worker.progress_signal.connect(self.update_progress)
        self.excel_worker.status_signal.connect(self.update_status)
        self.excel_worker.finished_signal.connect(self.data_loaded)
        self.excel_worker.error_signal.connect(self.show_error)
        self.excel_worker.start()
        
        self.load_button.setEnabled(False)
        self.log_message(f"开始加载文件: {file_path}, 工作表: {sheet_name}")
    
    def update_columns(self, columns):
        self.available_columns = columns
        
        # 更新列列表，并根据当前的搜索文本进行过滤
        current_search = self.column_search_edit.text()
        self.filter_columns_list(current_search)
        
        # 更新筛选条件中的列下拉框，并根据当前的搜索文本进行过滤
        current_filter_search = self.filter_search_edit.text()
        self.filter_condition_columns(current_filter_search)
            
        self.log_message(f"已加载 {len(columns)} 个列名")
    
    def update_progress(self, value):
        self.progress_bar.setValue(value)
    
    def update_status(self, message):
        self.status_label.setText(message)
        self.log_message(message)
    
    def show_error(self, message):
        QMessageBox.critical(self, "错误", message)
        self.log_message(f"错误: {message}")
        self.load_button.setEnabled(True)
        # 若是 AI 相关错误，也恢复按钮
        if hasattr(self, "ai_parse_button"):
            self.ai_parse_button.setEnabled(True)
    
    def data_loaded(self, df):
        self.df = df
        self.filtered_df = df.copy()
        self.apply_filter_button.setEnabled(True)
        self.update_data_preview()
        self.log_message(f"数据加载完成: {len(df)} 行 x {len(df.columns)} 列")
    
    def update_data_preview(self):
        if self.filtered_df is None:
            return
            
        df_to_show = self.filtered_df
        
        # 更新数据信息标签
        memory_info = memory_usage(df_to_show)
        self.data_info_label.setText(f"数据信息: {len(df_to_show)} 行 x {len(df_to_show.columns)} 列, 内存使用: {memory_info}")
        
        # 更新表格预览 (只显示前100行)
        preview_df = df_to_show.head(100)
        self.preview_table.setRowCount(len(preview_df))
        self.preview_table.setColumnCount(len(preview_df.columns))
        self.preview_table.setHorizontalHeaderLabels(preview_df.columns)
        
        # 填充数据
        for i in range(len(preview_df)):
            for j in range(len(preview_df.columns)):
                value = str(preview_df.iloc[i, j])
                item = QTableWidgetItem(value)
                self.preview_table.setItem(i, j, item)
        
        # 调整列宽
        self.preview_table.resizeColumnsToContents()
    
    def add_selected_columns(self):
        selected_items = self.all_columns_list.selectedItems()
        for item in selected_items:
            col_name = item.text()
            # 检查是否已经在已选择列表中
            existing_items = self.selected_columns_list.findItems(col_name, Qt.MatchExactly)
            if not existing_items:
                self.selected_columns_list.addItem(col_name)
    
    def remove_selected_columns(self):
        selected_items = self.selected_columns_list.selectedItems()
        for item in selected_items:
            row = self.selected_columns_list.row(item)
            self.selected_columns_list.takeItem(row)
    
    def add_filter_condition(self):
        column = self.filter_column_combo.currentText()
        operator = self.filter_operator_combo.currentText()
        value = self.filter_value_edit.text()
        
        if not column or not value:
            return
            
        condition = f"{column},{operator},{value}"
        self.filter_list.addItem(condition)
        self.filter_value_edit.clear()
    
    def remove_filter_condition(self):
        selected_items = self.filter_list.selectedItems()
        for item in selected_items:
            row = self.filter_list.row(item)
            self.filter_list.takeItem(row)

    # ========== AI 智能筛选 ==========
    def ai_parse(self):
        if self.df is None or not self.available_columns:
            QMessageBox.warning(self, "提示", "请先加载数据后再使用 AI 智能筛选。")
            return
        base = (self.ai_base_url_edit.text() or "").strip() or "https://api.deepseek.com/v1"
        model = (self.ai_model_edit.text() or "").strip() or "deepseek-chat"
        key = (self.ai_api_key_edit.text() or "").strip()
        if not key:
            QMessageBox.warning(self, "提示", "请填写 API Key。")
            return
        prompt = (self.ai_prompt_edit.toPlainText() or "").strip()
        if not prompt:
            QMessageBox.warning(self, "提示", "请输入需求描述。")
            return
        self.ai_parse_button.setEnabled(False)
        self.update_status("AI: 开始解析自然语言需求...")
        self.ai_worker = AIWorker(self.df, self.available_columns, base, model, key, prompt)
        self.ai_worker.status_signal.connect(self.update_status)
        self.ai_worker.finished_signal.connect(self.ai_result_received)
        self.ai_worker.error_signal.connect(self.show_error)
        self.ai_worker.start()

    def ai_result_received(self, result):
        # 回填列
        cols = result.get("columns_to_keep", []) or []
        self.selected_columns_list.clear()
        valid_cols = [c for c in cols if c in self.available_columns]
        for c in valid_cols:
            self.selected_columns_list.addItem(c)
        # 回填条件
        self.filter_list.clear()
        allowed_ops = {'>', '<', '>=', '<=', '==', '!=', 'contains'}
        flts = result.get("filters", []) or []
        for f in flts:
            try:
                col = f.get("column", "")
                op = f.get("operator", "")
                val = f.get("value", "")
                if col in self.available_columns and op in allowed_ops:
                    self.filter_list.addItem(f"{col},{op},{val}")
            except Exception:
                continue
        self.update_status(f"AI: 已回填列 {len(valid_cols)} 个，筛选条件 {self.filter_list.count()} 条")
        self.ai_parse_button.setEnabled(True)
        if self.df is not None:
            self.apply_filter_button.setEnabled(True)
    # ========== AI 智能筛选 结束 ==========

    def apply_filters(self):
        if self.df is None:
            return
            
        # 获取选择的列
        columns_to_keep = []
        for i in range(self.selected_columns_list.count()):
            columns_to_keep.append(self.selected_columns_list.item(i).text())
            
        # 获取筛选条件
        filter_conditions = []
        for i in range(self.filter_list.count()):
            filter_conditions.append(self.filter_list.item(i).text())
            
        # 应用筛选
        optimize = self.optimize_check.isChecked()
        
        self.filter_worker = FilterWorker(self.df, columns_to_keep, filter_conditions, optimize)
        self.filter_worker.progress_signal.connect(self.update_progress)
        self.filter_worker.status_signal.connect(self.update_status)
        self.filter_worker.finished_signal.connect(self.filters_applied)
        self.filter_worker.error_signal.connect(self.show_error)
        self.filter_worker.start()
        
        self.apply_filter_button.setEnabled(False)
        self.log_message("开始应用筛选...")
    
    def filters_applied(self, filtered_df):
        self.filtered_df = filtered_df
        self.update_data_preview()
        self.apply_filter_button.setEnabled(True)
        self.save_button.setEnabled(True)
        self.log_message(f"筛选完成: {len(filtered_df)} 行 x {len(filtered_df.columns)} 列")
    
    def browse_save_location(self):
        file_path, _ = QFileDialog.getSaveFileName(self, "保存文件", "", "Excel文件 (*.xlsx);;CSV文件 (*.csv)")
        if file_path:
            self.save_path_edit.setText(file_path)
    
    def save_results(self):
        if self.filtered_df is None:
            return
            
        save_path = self.save_path_edit.text()
        if not save_path:
            QMessageBox.warning(self, "警告", "请选择保存位置")
            return
            
        self.save_worker = SaveWorker(self.filtered_df, save_path)
        self.save_worker.progress_signal.connect(self.update_progress)
        self.save_worker.status_signal.connect(self.update_status)
        self.save_worker.finished_signal.connect(self.save_completed)
        self.save_worker.error_signal.connect(self.show_error)
        self.save_worker.start()
        
        self.save_button.setEnabled(False)
        self.log_message(f"开始保存到: {save_path}")
    
    def save_completed(self, success):
        if success:
            QMessageBox.information(self, "成功", "文件保存成功!")
        self.save_button.setEnabled(True)
    
    def filter_columns_list(self, search_text):
        """
        根据搜索文本过滤可用列列表
        """
        if not self.available_columns:
            return
            
        self.all_columns_list.clear()
        
        if not search_text.strip():
            # 如果没有搜索文本，显示所有列
            for col in self.available_columns:
                self.all_columns_list.addItem(col)
        else:
            # 根据搜索文本过滤列
            search_lower = search_text.lower()
            for col in self.available_columns:
                if search_lower in col.lower():
                    self.all_columns_list.addItem(col)
    
    def filter_condition_columns(self, search_text):
        """
        根据搜索文本过滤筛选条件中的列选择下拉框
        """
        if not self.available_columns:
            return
            
        current_text = self.filter_column_combo.currentText()
        self.filter_column_combo.clear()
        
        if not search_text.strip():
            # 如果没有搜索文本，显示所有列
            for col in self.available_columns:
                self.filter_column_combo.addItem(col)
        else:
            # 根据搜索文本过滤列
            search_lower = search_text.lower()
            for col in self.available_columns:
                if search_lower in col.lower():
                    self.filter_column_combo.addItem(col)
        
        # 尝试恢复之前的选中项
        index = self.filter_column_combo.findText(current_text)
        if index >= 0:
            self.filter_column_combo.setCurrentIndex(index)
    
    def log_message(self, message):
        self.log_text.append(message)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = ExcelFilterApp()
    window.show()
    sys.exit(app.exec_())
