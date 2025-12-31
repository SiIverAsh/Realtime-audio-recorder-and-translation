# 基于Whisper的实时语音识别和翻译

## 主要特性：
1. 实时识别目前你电脑里播放的人声并且打印在控制台上（不支持乐曲里的人声，当前可以识别例如动漫、影视、游戏里的人声）
2. 可以通过LLMapi、Google Transtale进行实时翻译
3. 界面友好，部署之后可以直接在网页端使用（后续会做成一个较为轻量化的桌面应用）


## 项目结构

```
text
├── server/                    # 服务器端
│   ├── core/                  # 后端核心文件
│   │   ├── audio_capture.py   # 录音模块
│   │   ├── audio_manager.py   # 音频管理
│   │   └── vad_engine.py      # 语音活动检测模块 (VAD)
│   ├── config.py              # 配置文件
│   ├── connect_utils.py       # 连接工具类
│   ├── service_logic.py       # 业务逻辑
│   ├── whisper_init.py        # Whisper 模型初始化
│   ├── translator.py          # 翻译模块
│   └── server.py              # 服务器主程序 (处理前后端请求)
└── web/                       # 前端
    ├── public/                # 静态资源文件
    └── src/                   # 源代码文件
        ├── assets/             # 静态资源文件
        ├── App.tsx             # 主应用
        ├── index.css          
        ├── index.tsx          
        └── main.tsx           

```

## 如何使用

 1.首先在电脑上新建一个文件夹，将本项目克隆到本地，请打开运行以下命令：

```
git clone https://github.com/SiIverAsh/Realtime-audio-recorder-and-translation.git
```

 2.然后创建一个虚拟环境（本项目用的python3.10.10，下载链接https://www.python.org/downloads/release/python-31010/，最下面的installer）

```
python -m venv .venv #创建虚拟环境

.venv\Scripts\activate #激活虚拟环境
```

 3.然后安装所需依赖

```
pip install -r requirements.txt
```

 4.按顺序输入以下命令打开前端界面，默认打开http://localhost:5173

```
cd web
npm install
npm run dev
```

 5.然后输入以下命令运行后端，默认在8000端口运行

```
cd server
python server.py
```

6.在前端界面中，点击“开始识别”按钮，即可开始识别并且翻译，在“设置”选项中可以选择使用LLMapi还是Google Translate进行翻译，目前LLMapi支持的模型有：



## 运行演示：


![运行演示](.gif)


## 注意事项

* 环境检查：确保已安装依赖并配置虚拟环境。
  * 验证环境：`python --version`
  * 验证包：`pip list`
* 模型准备：请确保已预先下载或缓存 **Whisper** 模型。
* API 配置：需指定 `LLMapi-key`；若未指定，系统将默认调用 `Google Translate`。
* 适用场景：本项目适用于无字幕视频、实时语音翻译。*注意：暂不支持歌词识别。*
* 支持作者：如果这个项目对你有帮助，欢迎点个Star，谢谢！
