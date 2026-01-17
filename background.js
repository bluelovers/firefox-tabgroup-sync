/**
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json
 */

// 儲存 TabGroup 狀態到 storage.sync
async function saveTabGroups()
{
	const groups = {};

	await chrome.tabs.query({}, async (tabs) =>
	{
		if (!tabs)
		{
			console.error("tabs 查詢失敗");
			return;
		}
		for (const tab of tabs)
		{
			if (tab.groupId >= 0)
			{
				if (!groups[tab.groupId])
				{
					let groupInfo = await chrome.tabGroups.get(tab.groupId);
					if (groupInfo)
					{
						console.log(groupInfo.title, tab.groupId, groupInfo.color);
					} else
					{
						groupInfo = {
							id: tab.groupId
						}
						console.log("群組不存在或已刪除", tab.groupId);
					}

					groups[tab.groupId] = { 
						title: groupInfo.title, 
						color: groupInfo.color, 
						collapsed: groupInfo.collapsed, 
						tabs: [] 
					};

					console.log(tab.groupId, groupInfo, groups[tab.groupId]);
				}
				groups[tab.groupId].tabs.push({ 
					url: tab.url, 
					title: tab.title 
				});
			}
		}
	});

	const storage = browser.storage || chrome.storage;

	await storage.sync.set({ tabGroups: groups });
	await storage.local.set({ tabGroups: groups });
	console.log("TabGroups 已同步到 storage.sync", groups);

	console.log("storage.sync.getKeys", await storage.sync.getKeys())
	console.log("storage.local.getKeys", await storage.local.getKeys())
}

// 從 storage.sync 載入 TabGroup
async function loadTabGroups()
{
	const storage = browser.storage || chrome.storage;

	const data = await storage.sync.get("tabGroups");
	const groups = data.tabGroups || {};

	for (const groupId in groups)
	{
		const group = groups[groupId];
		const createdTabs = [];

		for (const tab of group.tabs)
		{
			const newTab = await chrome.tabs.create({ url: tab.url });
			createdTabs.push(newTab.id);
		}

		if (createdTabs.length > 0)
		{
			await chrome.tabGroups.create({
				tabIds: createdTabs,
				title: group.title || "Synced Group",
				color: group.color
			});
		}
	}
	console.log("TabGroups 已從 storage.sync 載入", data);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) =>
{
	if (msg.action === "save")
	{
		saveTabGroups();
	} else if (msg.action === "load")
	{
		loadTabGroups();
	}
});
