import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  notes: {
    list:   ()             => ipcRenderer.invoke('notes:list'),
    save:   (note: unknown) => ipcRenderer.invoke('notes:save', note),
    delete: (id: string)   => ipcRenderer.invoke('notes:delete', id),
  },
})
