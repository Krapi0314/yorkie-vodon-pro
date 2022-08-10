const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('app', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getArgv: () => ipcRenderer.invoke('app:getArgv'),
  saveProject: (filePath: string, project: string) =>
    ipcRenderer.invoke('app:saveProject', filePath, project),
  openBrowser: (url: string) => ipcRenderer.invoke('app:openBrowser', url),
  onNewProjectRequest: (callback: () => void) =>
    ipcRenderer.on('onNewProjectRequest', callback),
  onSaveProjectRequest: (callback: (event: any, filePath: string) => void) =>
    ipcRenderer.on('onSaveProjectRequest', callback),
  onLoadProjectRequest: (callback: (event: any, project: string) => void) =>
    ipcRenderer.on('onLoadProjectRequest', callback),
  onLoadAdditionalVideos: (
    callback: (event: any, argV: Array<string>) => void
  ) => ipcRenderer.on('onLoadAdditionalVideos', callback),
});

contextBridge.exposeInMainWorld('video', {
  exists: (filePath: string) => ipcRenderer.invoke('video:exists', filePath),
  screenshot: (filePath: string, second: number) =>
    ipcRenderer.invoke('video:screenshot', filePath, second),
  getMetadata: (filePath: string) =>
    ipcRenderer.invoke('video:getMetadata', filePath),
});
