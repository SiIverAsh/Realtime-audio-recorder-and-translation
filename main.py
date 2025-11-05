import signal
from core.manager import AudioManager
import warnings
from soundcard import SoundcardRuntimeWarning

warnings.filterwarnings("ignore", category=SoundcardRuntimeWarning)

def handle_interrupt(sig, frame):
    manager.audio_stop()

if __name__ == "__main__":
    signal.signal(signal.SIGINT, handle_interrupt)
    manager = AudioManager()
    manager.audio_process()
