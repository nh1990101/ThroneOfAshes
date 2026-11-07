#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TexturePacker 图集打包工具
简化序列帧图集的批量打包流程
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import subprocess
import os
import json
import shutil
import threading
from pathlib import Path
from datetime import datetime


class AtlasPackerGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("图集打包工具 - TexturePacker")
        self.root.geometry("800x650")
        self.root.resizable(True, True)

        # 配置文件路径
        self.config_file = Path(__file__).parent / "atlas_packer_config.json"
        self.config = self.load_config()

        # TexturePacker 可执行文件路径
        self.tp_executable = self.config.get("texturePacker_path", "TexturePacker")

        self.setup_ui()
        self.load_recent_paths()

    def setup_ui(self):
        """创建界面"""
        # 主容器
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # 配置网格权重
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)

        # ===== 输入目录 =====
        ttk.Label(main_frame, text="原图目录:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.input_path_var = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.input_path_var).grid(
            row=0, column=1, sticky=(tk.W, tk.E), padx=5, pady=5
        )
        ttk.Button(main_frame, text="浏览...", command=self.browse_input).grid(
            row=0, column=2, padx=5, pady=5
        )

        # ===== 输出目录 =====
        ttk.Label(main_frame, text="输出目录:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.output_path_var = tk.StringVar()
        ttk.Entry(main_frame, textvariable=self.output_path_var).grid(
            row=1, column=1, sticky=(tk.W, tk.E), padx=5, pady=5
        )
        ttk.Button(main_frame, text="浏览...", command=self.browse_output).grid(
            row=1, column=2, padx=5, pady=5
        )

        # ===== 图集名称 =====
        ttk.Label(main_frame, text="图集名称:").grid(row=2, column=0, sticky=tk.W, pady=5)
        self.atlas_name_var = tk.StringVar(value="atlas")
        ttk.Entry(main_frame, textvariable=self.atlas_name_var).grid(
            row=2, column=1, sticky=(tk.W, tk.E), padx=5, pady=5
        )
        ttk.Label(main_frame, text="(不含扩展名)", font=("", 8)).grid(
            row=2, column=2, sticky=tk.W, padx=5
        )

        # ===== 参数设置 =====
        params_frame = ttk.LabelFrame(main_frame, text="打包参数", padding="10")
        params_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        params_frame.columnconfigure(1, weight=1)
        params_frame.columnconfigure(3, weight=1)

        # 格式
        ttk.Label(params_frame, text="格式:").grid(row=0, column=0, sticky=tk.W, padx=5)
        self.format_var = tk.StringVar(value="cocos2d")
        format_combo = ttk.Combobox(
            params_frame, textvariable=self.format_var, state="readonly", width=15
        )
        format_combo['values'] = ("cocos2d", "unity", "json", "phaser", "spine")
        format_combo.grid(row=0, column=1, sticky=tk.W, padx=5)

        # 最大尺寸
        ttk.Label(params_frame, text="最大尺寸:").grid(row=0, column=2, sticky=tk.W, padx=5)
        self.max_size_var = tk.StringVar(value="2048")
        max_size_combo = ttk.Combobox(
            params_frame, textvariable=self.max_size_var, state="readonly", width=10
        )
        max_size_combo['values'] = ("512", "1024", "2048", "4096")
        max_size_combo.grid(row=0, column=3, sticky=tk.W, padx=5)

        # 算法
        ttk.Label(params_frame, text="打包算法:").grid(row=1, column=0, sticky=tk.W, padx=5, pady=5)
        self.algorithm_var = tk.StringVar(value="MaxRects")
        algorithm_combo = ttk.Combobox(
            params_frame, textvariable=self.algorithm_var, state="readonly", width=15
        )
        algorithm_combo['values'] = ("MaxRects", "Basic", "Polygon")
        algorithm_combo.grid(row=1, column=1, sticky=tk.W, padx=5, pady=5)

        # 缩放
        ttk.Label(params_frame, text="缩放比例:").grid(row=1, column=2, sticky=tk.W, padx=5, pady=5)
        self.scale_var = tk.StringVar(value="1")
        scale_entry = ttk.Entry(params_frame, textvariable=self.scale_var, width=10)
        scale_entry.grid(row=1, column=3, sticky=tk.W, padx=5, pady=5)

        # 选项
        options_frame = ttk.Frame(params_frame)
        options_frame.grid(row=2, column=0, columnspan=4, sticky=tk.W, pady=5)

        self.trim_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(options_frame, text="自动裁剪透明边", variable=self.trim_var).pack(side=tk.LEFT, padx=5)

        self.rotate_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(options_frame, text="允许旋转", variable=self.rotate_var).pack(side=tk.LEFT, padx=5)

        self.premultiply_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(options_frame, text="预乘Alpha", variable=self.premultiply_var).pack(side=tk.LEFT, padx=5)

        # ===== 批量处理选项 =====
        batch_frame = ttk.LabelFrame(main_frame, text="批量处理", padding="10")
        batch_frame.grid(row=4, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)

        self.batch_mode_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            batch_frame,
            text="批量处理子文件夹（将每个子文件夹打包为独立图集）",
            variable=self.batch_mode_var,
            command=self.toggle_batch_mode
        ).pack(side=tk.LEFT)

        # ===== 操作按钮 =====
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=5, column=0, columnspan=3, pady=10)

        self.pack_button = ttk.Button(
            button_frame, text="开始打包", command=self.start_packing, width=15
        )
        self.pack_button.pack(side=tk.LEFT, padx=5)

        ttk.Button(button_frame, text="清空日志", command=self.clear_log, width=15).pack(side=tk.LEFT, padx=5)

        ttk.Button(button_frame, text="设置 TexturePacker", command=self.set_tp_path, width=18).pack(side=tk.LEFT, padx=5)

        # ===== 日志输出 =====
        log_frame = ttk.LabelFrame(main_frame, text="输出日志", padding="5")
        log_frame.grid(row=6, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)
        main_frame.rowconfigure(6, weight=1)

        self.log_text = scrolledtext.ScrolledText(
            log_frame, height=15, wrap=tk.WORD, state=tk.DISABLED
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # ===== 状态栏 =====
        self.status_var = tk.StringVar(value="就绪")
        status_bar = ttk.Label(
            main_frame, textvariable=self.status_var, relief=tk.SUNKEN, anchor=tk.W
        )
        status_bar.grid(row=7, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)

    def toggle_batch_mode(self):
        """切换批量模式时的提示"""
        if self.batch_mode_var.get():
            self.atlas_name_var.set("")
            self.log("批量模式：将使用子文件夹名称作为图集名称")
        else:
            self.atlas_name_var.set("atlas")

    def browse_input(self):
        """浏览输入目录"""
        directory = filedialog.askdirectory(title="选择原图目录")
        if directory:
            self.input_path_var.set(directory)
            # 自动设置图集名称为文件夹名
            if not self.batch_mode_var.get():
                folder_name = Path(directory).name
                self.atlas_name_var.set(folder_name)

    def browse_output(self):
        """浏览输出目录"""
        directory = filedialog.askdirectory(title="选择输出目录")
        if directory:
            self.output_path_var.set(directory)

    def set_tp_path(self):
        """设置 TexturePacker 可执行文件路径"""
        file_path = filedialog.askopenfilename(
            title="选择 TexturePacker 可执行文件",
            filetypes=[("可执行文件", "*.exe"), ("所有文件", "*.*")]
        )
        if file_path:
            self.tp_executable = file_path
            self.config["texturePacker_path"] = file_path
            self.save_config()
            self.log(f"TexturePacker 路径已设置: {file_path}")

    def log(self, message):
        """输出日志"""
        self.log_text.configure(state=tk.NORMAL)
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.log_text.configure(state=tk.DISABLED)
        self.root.update_idletasks()

    def clear_log(self):
        """清空日志"""
        self.log_text.configure(state=tk.NORMAL)
        self.log_text.delete(1.0, tk.END)
        self.log_text.configure(state=tk.DISABLED)

    def validate_inputs(self):
        """验证输入"""
        input_path = self.input_path_var.get()
        output_path = self.output_path_var.get()

        if not input_path:
            messagebox.showerror("错误", "请选择原图目录")
            return False

        if not os.path.exists(input_path):
            messagebox.showerror("错误", "原图目录不存在")
            return False

        if not output_path:
            messagebox.showerror("错误", "请选择输出目录")
            return False

        if not self.batch_mode_var.get() and not self.atlas_name_var.get():
            messagebox.showerror("错误", "请输入图集名称")
            return False

        return True

    def build_command(self, input_dir, output_dir, atlas_name):
        """构建 TexturePacker 命令"""
        executable = self.tp_executable
        executable_path = Path(executable)

        # GUI 程序不接受命令行打包参数，自动改用同目录的 CLI 程序。
        if executable_path.name.lower() == "texturepackergui.exe":
            executable = str(executable_path.with_name("TexturePacker.exe"))

        cmd = [executable]

        # 基本参数
        cmd.extend([
            "--format", self.format_var.get(),
            "--data", os.path.join(output_dir, f"{atlas_name}.plist"),
            "--sheet", os.path.join(output_dir, f"{atlas_name}.png"),
            "--max-size", self.max_size_var.get(),
            "--algorithm", self.algorithm_var.get(),
            "--scale", self.scale_var.get(),
        ])

        # 可选参数
        if self.trim_var.get():
            cmd.append("--trim-mode")
            cmd.append("Trim")

        if self.rotate_var.get():
            cmd.append("--enable-rotation")

        if self.premultiply_var.get():
            cmd.append("--premultiply-alpha")

        # 输入文件
        cmd.append(input_dir)

        return cmd

    def repair_unity_exporter(self):
        """补齐部分 TexturePacker 版本必须读取的 Unity 导出器字段"""
        executable_path = Path(shutil.which(self.tp_executable) or self.tp_executable)
        if not executable_path.is_absolute():
            return True

        exporter_file = executable_path.parent / "exporters" / "unity" / "exporter.xml"
        if not exporter_file.is_file():
            return True

        try:
            # 保留原始换行格式，避免无关内容发生变化。
            with open(exporter_file, "r", encoding="utf-8-sig", newline="") as f:
                content = f.read()

            if "<rotationDirection>" in content or "<rotationDirection " in content:
                return True

            closing_tag = "</supportsRotation>"
            if closing_tag not in content:
                return True

            newline = "\r\n" if "\r\n" in content else "\n"
            addition = (
                f"{closing_tag}{newline}{newline}"
                f"    <!-- rotated sprites direction (cw/ccw) -->{newline}"
                f"    <rotationDirection>cw</rotationDirection>"
            )
            updated_content = content.replace(closing_tag, addition, 1)

            backup_file = exporter_file.with_suffix(".xml.before-rotation-direction.bak")
            if not backup_file.exists():
                shutil.copy2(exporter_file, backup_file)

            with open(exporter_file, "w", encoding="utf-8", newline="") as f:
                f.write(updated_content)

            self.log(f"已修复 Unity 导出器配置: {exporter_file}")
            self.log(f"原配置已备份: {backup_file}")
            return True
        except (OSError, UnicodeError) as e:
            self.log(f"错误: 无法修复 Unity 导出器配置: {e}")
            self.log(f"请手动检查文件: {exporter_file}")
            return False

    def pack_single(self, input_dir, output_dir, atlas_name):
        """打包单个图集"""
        try:
            if not self.repair_unity_exporter():
                return False

            cmd = self.build_command(input_dir, output_dir, atlas_name)

            self.log(f"正在打包: {atlas_name}")
            self.log(f"命令: {' '.join(cmd)}")

            # 执行命令
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )

            if result.returncode == 0:
                self.log(f"✓ 成功: {atlas_name}")
                return True
            else:
                self.log(f"✗ 失败: {atlas_name}")
                if result.stderr:
                    self.log(f"错误信息: {result.stderr}")
                return False

        except FileNotFoundError:
            self.log("错误: 找不到 TexturePacker 可执行文件")
            self.log("请点击 '设置 TexturePacker' 按钮设置正确的路径")
            return False
        except Exception as e:
            self.log(f"错误: {str(e)}")
            return False

    def start_packing(self):
        """开始打包"""
        if not self.validate_inputs():
            return

        # 禁用打包按钮
        self.pack_button.configure(state=tk.DISABLED)
        self.status_var.set("打包中...")

        # 在新线程中执行打包
        thread = threading.Thread(target=self.pack_thread)
        thread.daemon = True
        thread.start()

    def pack_thread(self):
        """打包线程"""
        input_path = self.input_path_var.get()
        output_path = self.output_path_var.get()

        # 确保输出目录存在
        os.makedirs(output_path, exist_ok=True)

        success_count = 0
        fail_count = 0

        try:
            if self.batch_mode_var.get():
                # 批量模式：处理所有子文件夹
                self.log("=" * 60)
                self.log("批量打包模式")
                self.log("=" * 60)

                subdirs = [d for d in Path(input_path).iterdir() if d.is_dir()]
                total = len(subdirs)

                if total == 0:
                    self.log("警告: 未找到子文件夹")
                else:
                    self.log(f"找到 {total} 个子文件夹")

                    for idx, subdir in enumerate(subdirs, 1):
                        atlas_name = subdir.name
                        self.log(f"\n[{idx}/{total}] 处理: {atlas_name}")

                        if self.pack_single(str(subdir), output_path, atlas_name):
                            success_count += 1
                        else:
                            fail_count += 1
            else:
                # 单个打包模式
                self.log("=" * 60)
                self.log("单个打包模式")
                self.log("=" * 60)

                atlas_name = self.atlas_name_var.get()
                if self.pack_single(input_path, output_path, atlas_name):
                    success_count += 1
                else:
                    fail_count += 1

            # 输出统计
            self.log("\n" + "=" * 60)
            self.log(f"打包完成! 成功: {success_count}, 失败: {fail_count}")
            self.log("=" * 60)

            # 保存最近使用的路径
            self.save_recent_paths()

        except Exception as e:
            self.log(f"发生错误: {str(e)}")

        finally:
            # 恢复界面状态
            self.root.after(0, lambda: self.pack_button.configure(state=tk.NORMAL))
            self.root.after(0, lambda: self.status_var.set("就绪"))

    def load_config(self):
        """加载配置"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        return {}

    def save_config(self):
        """保存配置"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存配置失败: {e}")

    def load_recent_paths(self):
        """加载最近使用的路径"""
        if "recent_input" in self.config:
            self.input_path_var.set(self.config["recent_input"])
        if "recent_output" in self.config:
            self.output_path_var.set(self.config["recent_output"])
        if "format" in self.config:
            # 如果配置文件中是旧的 cocos2d-x，自动转换为 cocos2d
            format_value = self.config["format"]
            if format_value == "cocos2d-x":
                format_value = "cocos2d"
            self.format_var.set(format_value)

    def save_recent_paths(self):
        """保存最近使用的路径"""
        self.config["recent_input"] = self.input_path_var.get()
        self.config["recent_output"] = self.output_path_var.get()
        self.config["format"] = self.format_var.get()
        self.save_config()


def main():
    root = tk.Tk()
    app = AtlasPackerGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
