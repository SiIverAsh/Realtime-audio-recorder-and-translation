const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

// 禁用硬件加速以确保透明窗口在 Windows 下正常工作
app.disableHardwareAcceleration();

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 150,
    x: (width - 800) / 2,
    y: height - 180,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs') // 加载预加载脚本
    },
  });

  mainWindow.setBackgroundColor('#00000000');

  // 处理鼠标穿透指令
  ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  });

  // 处理窗口大小调整
  ipcMain.on('resize-window', (event, { width, height }) => {
    mainWindow.setSize(width, height);
  });

  // 处理关闭指令
  ipcMain.on('close-window', () => {
    app.quit();
  });

  const loadURL = () => {
    mainWindow.loadURL('http://127.0.0.1:5173').catch(() => {
      console.log("前端尚未就绪，1秒后重试...");
      setTimeout(loadURL, 1000);
    });
  };

  loadURL();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});