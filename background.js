// 儲存 TabGroup 狀態到 storage.sync
async function saveTabGroups()
{
	const tabs = await chrome.tabs.query({});
	const groups = {};

	for (const tab of tabs)
	{
		if (tab.groupId >= 0)
		{
			if (!groups[tab.groupId])
			{
				const groupInfo = await chrome.tabGroups.get(tab.groupId);
				groups[tab.groupId] = { title: groupInfo.title, color: groupInfo.color, tabs: [] };
			}
			groups[tab.groupId].tabs.push({ url: tab.url, title: tab.title });
		}
	}

	await chrome.storage.sync.set({ tabGroups: groups });
	console.log("TabGroups 已同步到 storage.sync");
}

// 從 storage.sync 載入 TabGroup
async function loadTabGroups()
{
	const data = await chrome.storage.sync.get("tabGroups");
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
				color: group.color || "grey"
			});
		}
	}
	console.log("TabGroups 已從 storage.sync 載入");
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
