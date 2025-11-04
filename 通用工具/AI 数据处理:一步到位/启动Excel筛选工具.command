#!/bin/bash
# Excel筛选工具启动脚本

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 切换到脚本所在目录
cd "$DIR"

# 运行Python程序
python excel_filter_gui.py

