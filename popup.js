// 監聽 push/pull/merge 按鈕
document.getElementById("push").addEventListener("click", () =>
{
	chrome.runtime.sendMessage({ action: "push" });
});

document.getElementById("pull").addEventListener("click", () =>
{
	chrome.runtime.sendMessage({ action: "pull" });
});

document.getElementById("merge").addEventListener("click", () =>
{
	chrome.runtime.sendMessage({ action: "merge" });
});

// 開啟設定頁面
document.getElementById("open-options").addEventListener("click", (e) =>
{
	e.preventDefault();
	if (browser.runtime.openOptionsPage)
	{
		browser.runtime.openOptionsPage();
	}
	else
	{
		window.open(browser.runtime.getURL("options.html"));
	}
});

