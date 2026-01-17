// 監聽 push/pull/merge 按鈕
document.getElementById("push").addEventListener("click", () =>
{
	chrome.runtime.sendMessage({ action: "push" }, (response) =>
	{
		if (chrome.runtime.lastError)
		{
			showStatus("Push 失敗：" + chrome.runtime.lastError.message, true);
		}
		else if (response?.success)
		{
			showStatus("Push 完成");
		}
		else
		{
			showStatus("Push 失敗：" + (response?.error || "未知錯誤"), true);
		}
	});
});

document.getElementById("pull").addEventListener("click", () =>
{
	chrome.runtime.sendMessage({ action: "pull" }, (response) =>
	{
		if (chrome.runtime.lastError)
		{
			showStatus("Pull 失敗：" + chrome.runtime.lastError.message, true);
		}
		else if (response?.success)
		{
			showStatus("Pull 完成");
		}
		else
		{
			showStatus("Pull 失敗：" + (response?.error || "未知錯誤"), true);
		}
	});
});

document.getElementById("merge").addEventListener("click", () =>
{
	chrome.runtime.sendMessage({ action: "merge" }, (response) =>
	{
		if (chrome.runtime.lastError)
		{
			showStatus("Merge 失敗：" + chrome.runtime.lastError.message, true);
		}
		else if (response?.success)
		{
			showStatus("Merge 完成");
		}
		else
		{
			showStatus("Merge 失敗：" + (response?.error || "未知錯誤"), true);
		}
	});
});

// 開啟設定頁面
document.getElementById("open-options").addEventListener("click", (e) =>
{
	e.preventDefault();
	if (chrome.runtime.openOptionsPage)
	{
		chrome.runtime.openOptionsPage();
	}
	else
	{
		window.open(chrome.runtime.getURL("options.html"));
	}
});

// 顯示操作狀態
function showStatus(message, isError = false)
{
	const statusDiv = document.getElementById("status");
	statusDiv.textContent = message;
	statusDiv.className = "status " + (isError ? "error" : "success");
	statusDiv.style.display = "block";

	// 3 秒後自動隱藏
	setTimeout(() =>
	{
		statusDiv.style.display = "none";
	}, 3000);
}

