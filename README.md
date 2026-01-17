# Firefox TabGroup Sync

Firefox 擴充元件，跨裝置同步 TabGroup，用於同步瀏覽器的標籤頁組 (Tab Groups) 到瀏覽器儲存空間。

## 功能

- **Push**: 將目前的標籤頁組狀態儲存到 `storage.sync` 和 `storage.local`
- **Pull**: 從 `storage.sync` 載入標籤頁組並在瀏覽器中重建
- **Merge**: 合併遠端與本地的標籤頁組數據
- **Export**: 匯出選中的群組為 JSON 檔案
- **Import**: 從 JSON 檔案匯入群組數據並自動同步到瀏覽器

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

### 為何使用 Options 頁面處理匯出/匯入？

在 Firefox/Chrome 的 WebExtensions 中，popup 頁面天生會在失去焦點時自動關閉，這是瀏覽器的設計，無法透過權限或設定直接阻止。

- **Popup 自動關閉問題**: 當用戶點擊檔案選擇器時，popup 會失去焦點並自動關閉，導致事件流程中斷。
- **解決方案**: 使用 Options 頁面來處理需要檔案選擇的操作（如匯出/匯入），確保操作流程不會被中斷。

### 為何使用 browser API 而非 chrome API？

雖然 Firefox 和 Chrome 的 WebExtensions API 語法相似，但某些 API 行為在兩者之間存在差異。特別是在涉及標籤頁組（tabGroups）、標籤頁操作等功能時，使用 `chrome` API 可能會因權限問題導致無法符合期待。

#### API 相容性分析

**可使用 `chrome` API 正常執行的功能：**

- `chrome.runtime.sendMessage()` - 訊息傳遞（僅用於發送訊息，不等待回傳值）
- `chrome.runtime.openOptionsPage()` - 開啟選項頁面（有相容檢查）
- `chrome.runtime.getURL()` - 取得擴充元件內部 URL

**必須使用 `browser` API 的功能：**

- `browser.runtime.sendMessage()` - 訊息傳遞（需要等待回傳值時必須使用）
- `browser.storage` - 儲存 API（sync、local、getKeys 等）
- `browser.tabs` - 標籤頁 API（create、query、group 等）
- `browser.tabGroups` - 標籤頁組 API（get、query、update 等）
- `browser.runtime.onMessage` - 監聽訊息

> **注意**: `chrome.runtime.sendMessage()` 和 `browser.runtime.sendMessage()` 在回傳值處理上存在差異。當需要使用 `await` 等待並取得 `sendResponse` 的回傳值時，必須使用 `browser.runtime.sendMessage()`。

**使用場景說明：**

| API | 使用場景 | 位置 |
|-----|----------|------|
| `chrome.runtime.sendMessage()` | 僅發送指令，不等待回應 | popup.js |
| `browser.runtime.sendMessage()` + `await` | 發送指令並等待回傳結果 | options.js |
| `browser.runtime.onMessage.addListener()` | 接收並處理訊息，回傳資料給發送者 | background.js |

#### 權限問題與解決方案

- **權限問題**: 使用 `chrome` API 操作 tabGroups、storage 時，可能會因權限問題導致無法符合期待。
- **解決方案**: 專案中使用包裝函數作為 API 存取層，該函數返回 `browser || chrome`，確保在 Firefox 環境中優先使用 `browser` API，在 Chrome 環境中回退到 `chrome` API。

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
