const { app, BrowserWindow } = require('electron');
const path = require('path');

// 开发模式判断
const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '人力排期管理',
    icon: path.join(__dirname, 'public/favicon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // 隐藏菜单栏
    autoHideMenuBar: true,
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // 开发模式打开 DevTools
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // 窗口关闭时退出应用
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用准备就绪
app.whenReady().then(createWindow);

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS 点击 dock 图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
