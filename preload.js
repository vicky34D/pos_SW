const { contextBridge } = require('electron');
const fs = require('fs');
const path = require('path');

function readDesktopConfig() {
  const configPath = path.join(__dirname, 'desktop.config.json');

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

contextBridge.exposeInMainWorld('streetwokConfig', readDesktopConfig());
