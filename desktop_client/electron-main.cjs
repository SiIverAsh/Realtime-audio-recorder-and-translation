const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron');
const path = require('path');

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // 确保坐标不为负数 (防止小屏幕下窗口溢出左边界)
  const winX = Math.max(0, Math.floor((width - 800) / 2));
  const winY = Math.max(0, Math.floor(height - 210));

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 180,
    minHeight: 180, // Prevent shrinking below the default compact size
    x: winX,
    y: winY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 处理鼠标穿透指令
  ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
    if (mainWindow.isDestroyed()) return;
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  });

  // 处理窗口大小调整
  ipcMain.on('resize-window', (event, { width, height, center }) => {
    if (!mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        // 使用 setBounds 替代 setSize，在 Windows 上对无边框窗口更稳定
        mainWindow.setBounds({ x: bounds.x, y: bounds.y, width: width, height: height });
        
        // 如果需要居中 (Reset 按钮会传 true)
        if (center) {
            const display = screen.getDisplayMatching(bounds);
            // 保持 Y 轴不变，只居中 X 轴
            const x = display.workArea.x + Math.floor((display.workArea.width - width) / 2);
            mainWindow.setPosition(x, bounds.y);
        }
    }
  });

  // 处理关闭指令
  ipcMain.on('close-window', () => {
    app.quit();
  });

  const loadURL = () => {
    mainWindow.loadURL('http://127.0.0.1:5173').catch(() => {
      setTimeout(loadURL, 1000);
    });
  };

  loadURL();
}

// 禁用硬件加速 (解决部分显卡导致的白屏/透明失效问题)
app.disableHardwareAcceleration();

app.whenReady().then(() => {
  createWindow();
  
  // 注册全局快捷键: Ctrl + Shift + R -> 强制居中窗口
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      const win = wins[0];
      if (!win.isDestroyed()) {
        win.center(); // 移动到屏幕中央
        win.show();
        win.focus();
        // 确保取消鼠标穿透，否则可能无法点击
        win.setIgnoreMouseEvents(false);
      }
    }
  });
});

app.on('will-quit', () => {
  // 注销所有快捷键
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
