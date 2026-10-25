const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectStorageFolder: () => ipcRenderer.invoke('dialog:openDirectory')
});