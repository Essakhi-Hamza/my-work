const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('luxrentDesktop', {
  isElectron: true,
})
