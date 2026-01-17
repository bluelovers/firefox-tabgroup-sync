# Firefox TabGroup Sync

Firefox 擴充元件，跨裝置同步 TabGroup，用於同步瀏覽器的標籤頁組 (Tab Groups) 到瀏覽器儲存空間。

## 功能

- **Push**: 將目前的標籤頁組狀態儲存到 `storage.sync` 和 `storage.local`
- **Pull**: 從 `storage.sync` 載入標籤頁組並在瀏覽器中重建
- **Merge**: 合併遠端與本地的標籤頁組數據
- **Export**: 匯出選中的群組為 JSON 檔案
- **Import**: 從 JSON 檔案匯入群組數據

## 載入擴充元件

1. 在 Firefox 網址列輸入 `about:debugging#/runtime/this-firefox`
2. 點擊「載入暫存的附加元件」按鈕
3. 選擇專案中的 `manifest.json` 檔案
4. 擴充元件即會安裝並出現在瀏覽器工具列

## 使用方式

1. 點擊瀏覽器工具列中的「TabGroup Sync」圖示
2. **Push TabGroup**: 將目前的標籤頁組同步到雲端
3. **Pull TabGroup**: 從雲端載入標籤頁組
4. **Merge TabGroup**: 合併遠端與本地標籤頁組
5. **Options**: 進入設定頁面進行匯出/匯入操作

## 開發

- `background.js`: 背景腳本，處理標籤頁組的同步邏輯
- `popup.html` / `popup.js`: 彈出視窗介面
- `options.html` / `options.js`: 選項頁面，用於匯出/匯入操作
- `manifest.json`: 擴充元件配置檔

## 連結

- [Firefox Add-ons 頁面](https://addons.mozilla.org/zh-TW/firefox/addon/tabgroup-sync/)
- [GitHub 儲存庫](https://github.com/bluelovers/firefox-tabgroup-sync)

## 相關資源

- [Firefox WebExtensions API - tabGroups](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups)
- [Firefox WebExtensions API - storage.sync](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync)
- [Firefox WebExtensions API - tabs.group](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group)
- [Firefox WebExtensions API - manifest.json](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
- [Firefox WebExtensions API - tabGroups.update](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups/update)
- [Firefox WebExtensions API - tabGroups.get](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups/get)
