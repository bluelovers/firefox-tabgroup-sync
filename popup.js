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

// 載入群組列表
async function loadGroupsForExport()
{
	const response = await browser.runtime.sendMessage({ action: "getGroupsForExport" });
	const groups = response?.groups || [];

	const exportList = document.getElementById("export-group-list");
	exportList.innerHTML = "";

	if (groups.length === 0)
	{
		exportList.innerHTML = "<div style='color: #666; padding: 5px;'>沒有可匯出的群組</div>";
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

// 匯出 JSON
document.getElementById("export-json").addEventListener("click", async () =>
{
	const checkboxes = document.querySelectorAll("#export-group-list input[type='checkbox']:checked");
	const selectedIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

	if (selectedIds.length === 0)
	{
		alert("請選擇要匯出的群組");
		return;
	}

	const response = await browser.runtime.sendMessage({ action: "exportJson", selectedIds });
	const exportData = response?.data;

	if (!exportData)
	{
		alert("匯出失敗");
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
	URL.revokeObjectURL(url);
});

// 匯入 JSON
document.getElementById("import-json").addEventListener("click", () =>
{
	document.getElementById("import-file").click();
});

document.getElementById("import-file").addEventListener("change", async (e) =>
{
	const file = e.target.files[0];
	if (!file)
		return;

	try
	{
		const text = await file.text();
		const data = JSON.parse(text);

		const response = await browser.runtime.sendMessage({ action: "importJson", data });
		if (response?.success)
		{
			alert("匯入成功！請執行 Pull 操作來載入群組");
			loadGroupsForExport();
		}
		else
		{
			alert("匯入失敗：" + (response?.error || "未知錯誤"));
		}
	}
	catch (err)
	{
		alert("檔案格式錯誤：" + err.message);
	}

	e.target.value = "";
});

// 頁面載入時初始化
loadGroupsForExport();
