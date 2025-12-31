# 基于Whisper的实时语音识别和翻译

## 主要特性：
1. 实时识别目前你电脑里播放的人声并且打印在控制台上（不支持乐曲里的人声，当前可以识别例如动漫、影视、游戏里的人声）
2. 可以通过LLMapi、Google Transtale进行实时翻译
3. 界面友好，部署之后可以直接在网页端使用（后续会做成一个较为轻量化的桌面应用）


## 项目结构：
  -server/: 服务器端代码
    - core/: 后端核心文件
      - audio_capture.py: 
      - audio_manager.py: 
      - config.py: 配置文件
      - connect_utils.py:
      - service_logic.py: 
      - vad_engine.py: 语音活动检测模块
      - whisper_init.py: 
      - translator.py: 翻译模块，利用LLMapi进行实时翻译
    - server.py: 服务器端主程序，负责处理前端请求和后端逻辑
  -web/: 前端代码
    - public/: 前端静态资源文件
    - src/: 前端源代码文件
      - App.js: 主应用文件
      - index.js: 入口文件
      - components/: 前端组件文件夹
        - AudioPlayer.js: 音频播放组件
        - ConfigPanel.js: 配置面板组件
        - TranslationDisplay.js: 翻译显示组件
      - styles/: 前端样式文件夹
        - App.css: 主应用样式
        - index.css: 入口样式

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
1、确保安装了依赖、配置好了虚拟环境（python --version确定环境，pip list确定已安装的依赖包）
2、确保下载或缓存whisper模型
3、确保指定好了自己的LLMapi-key（如果没有指定那就默认是Google_Translate）
4、本项目可以在看无字幕与翻译的视频、语音的时候使用，但是无法进行听歌识别歌词
5、如果觉得本项目对你日常有帮助，欢迎点个star支持一下，谢谢！
