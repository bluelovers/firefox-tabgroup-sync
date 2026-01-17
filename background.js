/**
 *
 * about:debugging#/runtime/this-firefox
 * https://addons.mozilla.org/en-US/developers/addon/tabgroup-sync/edit
 *
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group
 *
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json
 */

/**
 * @typedef {Object} ISyncTab
 * 
 * @property {string} url - 標籤頁的 URL
 * @property {string} title - 標籤頁的標題
 */

/**
 * @typedef {Object} ISyncTabGroup
 * 
 * @property {number} id - 標籤頁組的 ID
 * @property {string} [title] - 標籤頁組的標題
 * @property {string} [color] - 標籤頁組的顏色
 * @property {boolean} [collapsed] - 標籤頁組是否折疊
 * @property {ISyncTab[]} tabs - 標籤頁組中的標籤頁列表
 */

/**
 * @typedef {Record<number|string, ISyncTabGroup>} ISyncTabGroupsStorage
 */

/**
 * @typedef {Object} TabGroup
 * 
 * @property {number} id - 標籤頁組的 ID
 * @property {string} title - 標籤頁組的標題
 * @property {string} color - 標籤頁組的顏色
 * @property {boolean} collapsed - 標籤頁組是否折疊
 * @property {number} windowId
 */

// 儲存 TabGroup 狀態到 storage.sync
async function pushTabGroupsStorage()
{
	/**
	 * 存储标签页组数据的对象
	 * @type {ISyncTabGroupsStorage}
	 */
	const groups = {};

	await queryBrowserTabs({}, async (tabs) =>
	{
		if (!tabs)
		{
			console.error("tabs 查詢失敗");
			return;
		}
		for (const tab of tabs)
		{
			if (isTabGroup(tab.groupId))
			{
				if (!groups[tab.groupId])
				{
					let groupInfo = await getTabGroup(tab.groupId);
					if (groupInfo)
					{
						console.log(groupInfo.title, tab.groupId, groupInfo.color);
					} 
					else
					{
						groupInfo = {
							id: tab.groupId
						}
						console.warn("群組不存在或已刪除", tab.groupId);
					}

					groups[tab.groupId] = { 
						id: tab.groupId,
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

	const storage = _getBrowserStorage();

	await storage.sync.set({ tabGroups: groups });
	await storage.local.set({ tabGroups: groups });
	console.log("TabGroups 已同步到 storage.sync", groups);

	console.log("storage.sync.getKeys", await storage.sync.getKeys())
	console.log("storage.local.getKeys", await storage.local.getKeys())
}

// 從 storage.sync 載入 TabGroup
async function pullTabGroupsStorage()
{
	const storage = _getBrowserStorage();

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
			await createTabGroup({
				tabIds: createdTabs,
				updateProperties: group,
			});
		}
	}
	console.log("TabGroups 已從 storage.sync 載入", data);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) =>
{
	if (msg.action === "push")
	{
		pushTabGroupsStorage();
	}
	else if (msg.action === "pull")
	{
		pullTabGroupsStorage();
	}
});

/**
 * 创建并配置一个新的标签页组
 *
 * @param {Object} options - 创建标签页组的配置选项
 * @param {number|number[]} options.tabIds - 要包含在组中的标签页ID或ID数组
 * @param {Partial<TabGroup>} [options.updateProperties] - 可选的要更新的组属性
 * @param {Partial<TabGroup>} [options.createProperties] - 可选的要创建的组属性
 * @returns {Promise<number>} 新创建的标签页组的ID
 * @throws {TypeError} 当options.tabIds不是数字或数字数组时抛出
 *
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/group
 */
async function createTabGroup(options)
{
	if (!(typeof options.tabIds === "number" || Array.isArray(options.tabIds)))
	{
		console.error("options.tabIds 必須是數字或數字陣列", options);
		throw new TypeError("options.tabIds 必須是數字或數字陣列");
	}
	
	console.log("createTabGroup", options);
	let groupId = await browser.tabs.group(options);

	let updateProperties = options.updateProperties || options.createProperties;

	if (isAllowedSettingObject(updateProperties))
	{
		updateProperties = handleUpdateProperties(updateProperties);

		if (isAllowedSettingObject(updateProperties))
		{
			await updateTabGroup(groupId, updateProperties);
		}
	}

	return groupId
}

/**
 * 更新指定标签页组的属性
 *
 * @param {number|Partial<TabGroup>} groupId - 标签页组的ID，或者包含id/groupId属性的对象
 * @param {Partial<TabGroup>} [updateProperties] - 要更新的属性对象，当groupId为数字时此参数必填
 * @returns {Promise<TabGroup>} 返回浏览器API调用结果的Promise
 * @throws {TypeError} 当updateProperties不是非空对象时抛出
 *
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups/update
 */
async function updateTabGroup(groupId, updateProperties)
{
	if (typeof groupId !== "number")
	{
		updateProperties = groupId;
		groupId = updateProperties.id || updateProperties.groupId;
	}

	if (!isAllowedSettingObject(updateProperties))
	{
		throw new TypeError("updateProperties 必須是非空物件");
	}

	updateProperties = handleUpdateProperties(updateProperties);

	return browser.tabGroups.update(
		groupId,
		updateProperties
	);
}

/**
 * @param {Partial<TabGroup | ISyncTabGroup>} updateProperties
 * @returns {Partial<TabGroup>}
 */
function handleUpdateProperties(updateProperties)
{
	updateProperties = {
		...updateProperties,
	};

	delete updateProperties.windowId;

	delete updateProperties.id;
	delete updateProperties.groupId;
	
	delete updateProperties.tabs;

	return updateProperties
}

/**
 * 检查传入的对象是否为有效的非空对象
 * 
 * @param {Object} obj - 需要检查的对象
 * @returns {boolean} 如果是有效的非空对象则返回true，否则返回false
 */
function isAllowedSettingObject(obj)
{
	return typeof obj === "object" && obj !== null && Object.getOwnPropertyNames(obj).length > 0
}

function isTabGroup(groupId)
{
	return typeof groupId === "number" && groupId > 0
}

/**
 * 更新指定标签页组的属性
 *
 * @param {number} groupId - 标签页组的ID
 * @returns {Promise<TabGroup>} 返回浏览器API调用结果的Promise
 *
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups/get
 */
async function getTabGroup(groupId)
{
	return browser.tabGroups.get(groupId)
}

async function queryTabGroup(queryInfo)
{
	return browser.tabGroups.query(queryInfo)
}

function _getBrowserStorage()
{
	return browser.storage || chrome.storage;
}

function _getBrowserTabs()
{
	return browser.tabs || chrome.tabs;
}

/**
 * 
 * @returns {Promise<ISyncTab[]>}
 */
async function queryBrowserTabs(queryInfo, fn)
{
	const tabs = await _getBrowserTabs().query(queryInfo || {});
	
	if (typeof fn !== "undefined")
	{
		await fn(tabs);
	}

	return tabs
}
