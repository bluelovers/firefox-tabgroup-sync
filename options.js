
/**
 * 加载可供导出的标签群组列表并渲染到页面
 *
 * @async
 * @returns {Promise<void>} 无返回值，但会更新页面中的导出群组列表
 */
async function loadGroupsForExport()
{
	const exportSource = document.querySelector("input[name='export-source']:checked").value;
	const response = await browser.runtime.sendMessage({ action: "getGroupsForExport", source: exportSource });
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

// 匯出來源切換時重新載入群組列表
document.querySelectorAll("input[name='export-source']").forEach(radio =>
{
	radio.addEventListener("change", () =>
	{
		showStatus("正在切換資料來源...");
		loadGroupsForExport().then(() => showStatus("已切換資料來源"));
	});
});

/**
 * 显示导入操作的状态信息
 * 
 * @param {string} message - 要显示的状态消息
 * @param {boolean} [isError=false] - 是否为错误状态，默认为false（成功状态）
 */
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

	const exportSource = document.querySelector("input[name='export-source']:checked").value;
	const response = await browser.runtime.sendMessage({ action: "exportJson", selectedIds, source: exportSource });
	const exportData = response?.data;

	if (!exportData)
	{
		showStatus("匯出失敗", true);
		return;
	}

	// 生成 24 小時制的時間戳格式：YYYY-MM-DD-HHmmss
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");
	const timestamp = `${year}-${month}-${day}-${hours}${minutes}${seconds}`;

	const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `tabgroups-${timestamp}.json`;
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

// 重新讀取群組列表
document.getElementById("refresh-groups").addEventListener("click", async () =>
{
	await loadGroupsForExport();
	showStatus("群組列表已更新");
});

// 頁面載入時初始化
loadGroupsForExport();
