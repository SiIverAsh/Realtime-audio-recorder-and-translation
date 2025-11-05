# 一个实时语音识别项目

##主要特性：
1. 实时识别目前你电脑里播放的人声并且打印在控制台上
2. 可以通过LLMapi进行实时翻译
3. 语音活动检测是VAD，语音识别是Whisper
4. 可自定义语音识别参数（缓存区，敏感度等）

##文件结构：
- core/: 核心
  - audio_manager.py: 音频管理模块，负责处理音频输入输出
  - vad_engine.py: 语音活动检测模块
  - whisper_init.py: 初始化whisper引擎（如果没有GPU可以用int8）
  - translator.py: 翻译模块，利用LLMapi进行实时翻译
  - config.py: 配置文件，包含项目参数和常量
- main.py: 主程序

##如何使用

1、首先在电脑上新建一个文件夹，克隆到本地，请打开运行以下命令：
```
git clone https://github.com/SiIverAsh/Realtime-audio-recorder-and-translation.git
```

2、然后创建一个虚拟环境（本项目用的python3.10.10，下载链接https://www.python.org/downloads/release/python-31010/，最下面的installer）

```
python -m venv .venv #创建虚拟环境

.venv\Scripts\activate #激活虚拟环境
```

3、然后安装所需依赖

```
pip install -r requirements.txt
```

4、然后在hugging face上将下载whisper模型（视硬盘空间大小决定，建议下载medium，）
https://huggingface.co/openai/whisper-medium

然后在config.py中修改LLMapi-key为你自己的key
```
LLMapi_key = "sk-xxxx"
```

最后运行main.py即可
```
python main.py
```

##注意事项
1、确保安装了依赖、配置好了虚拟环境（python --version确定环境，pip list确定已安装的依赖包）
2、确保下载或缓存whisper模型
3、确保指定好了自己的LLMapi-key（如果没有指定那就是一个实时的系统语音识别工具）
4、本项目可以在看非翻译视频、听非翻译且无字幕语音的时候使用，但是无法进行听歌识别歌词
5、如果觉得本项目对你日常有帮助，欢迎点个star支持一下，谢谢！
