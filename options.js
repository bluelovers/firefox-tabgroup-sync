// 載入群組列表
async function loadGroupsForExport()
{
	const response = await browser.runtime.sendMessage({ action: "getGroupsForExport" });
	const groups = response?.groups || [];

	const exportList = document.getElementById("export-group-list");
	exportList.innerHTML = "";

	if (groups.length === 0)
	{
		exportList.innerHTML = "<div class='no-data'>沒有可匯出的群組</div>";
		return;
	}

	groups.forEach(group =>
	{
		const item = document.createElement("div");
		item.className = "group-item";

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";
		checkbox.value = group.id;
		checkbox.checked = true;

		const label = document.createElement("label");
		label.textContent = `${group.title || "未命名群組"} (${group.tabs.length} 分頁)`;

		item.appendChild(checkbox);
		item.appendChild(label);
		exportList.appendChild(item);
	});
}

// 全選/取消全選
document.getElementById("select-all-groups").addEventListener("change", (e) =>
{
	const checkboxes = document.querySelectorAll("#export-group-list input[type='checkbox']");
	checkboxes.forEach(cb => cb.checked = e.target.checked);
});

// 顯示狀態訊息
function showStatus(message, isError = false)
{
	const statusDiv = document.getElementById("import-status");
	statusDiv.textContent = message;
	statusDiv.className = "status " + (isError ? "error" : "success");
	statusDiv.style.display = "block";

	// 3 秒後自動隱藏
	setTimeout(() =>
	{
		statusDiv.style.display = "none";
	}, 5000);
}

// 匯出 JSON
document.getElementById("export-json").addEventListener("click", async () =>
{
	const checkboxes = document.querySelectorAll("#export-group-list input[type='checkbox']:checked");
	const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

	if (selectedIds.length === 0)
	{
		showStatus("請選擇要匯出的群組", true);
		return;
	}

	const response = await browser.runtime.sendMessage({ action: "exportJson", selectedIds });
	const exportData = response?.data;

	if (!exportData)
	{
		showStatus("匯出失敗", true);
		return;
	}

	const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `tabgroups-${new Date().toISOString().slice(0, 10)}.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObject(url);

	showStatus("匯出成功");
});

// 匯入 JSON
const importFileInput = document.createElement("input");
importFileInput.type = "file";
importFileInput.accept = ".json";

document.getElementById("import-json").addEventListener("click", () =>
{
	importFileInput.value = "";
	importFileInput.click();
});

importFileInput.addEventListener("change", async (e) =>
{
	const file = e.target.files[0];
	if (!file)
		return;

	try
	{
		const text = await file.text();
		const data = JSON.parse(text);

		showStatus("匯入中...");
		const response = await browser.runtime.sendMessage({ action: "importJson", data });
		if (response?.success)
		{
			showStatus("匯入成功！群組已同步到瀏覽器");
			loadGroupsForExport();
		}
		else
		{
			showStatus("匯入失敗：" + (response?.error || "未知錯誤"), true);
		}
	}
	catch (err)
	{
		showStatus("檔案格式錯誤：" + err.message, true);
	}

	e.target.value = "";
});

// 頁面載入時初始化
loadGroupsForExport();
