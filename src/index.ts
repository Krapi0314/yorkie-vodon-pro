import { app, BrowserWindow, session, protocol, ipcMain } from "electron";

import ffprobe from "@ffprobe-installer/ffprobe";
import ffmpeg from "fluent-ffmpeg";

ffmpeg.setFfprobePath(ffprobe.path);

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: any;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 1024,
    title: "Vodon Pro",
    webPreferences: {
      webSecurity: false,
      devTools: !app.isPackaged,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("app:getVersion", async (event) => {
  return app.getVersion();
});

ipcMain.handle("video:getMetadata", async (event, filePath: string) => {
  const metadata = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, function (err: any, metadata: any) {
      resolve(metadata);
    });
  });

  return metadata;
});

// allow local videos
protocol.registerSchemesAsPrivileged([
  {
    scheme: "file",
    privileges: {
      standard: true,
      bypassCSP: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);
