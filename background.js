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
 * @property {number} [lastAccessed] - 標籤頁的最後訪問時間 (milliseconds since the epoch)
 * @property {number} [groupId] - 標籤頁的標籤頁組ID
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


/**
 * @typedef {Object} TabGroupContext
 *
 * @property {Map<string, ISyncTab>} tabMap - 以 URL 為 key 的 tab Map
 * @property {Map<number, ISyncTab[]>} tabsByGroupId - 以 groupId 為 key 的 tabs Map
 * @property {TabGroup[]} groups - 本地群組陣列
 */

const TAB_GROUP_TITLE_DEFAULT = "";

/**
 * 從瀏覽器存儲獲取 tabGroups 數據
 *
 * @async
 * @returns {Promise<ISyncTabGroupsStorage|null>} 返回 tabGroups 數據，若無效則返回 null
 */
async function loadTabGroupsFromStorage()
{
	const storage = _getBrowserStorage();
	const data = await storage.sync.get("tabGroups");
	const groups = data?.tabGroups;

	if (!isAllowedSettingObject(groups))
	{
		console.warn("TabGroups 資料格式錯誤或不存在", groups);
		return null;
	}

	return groups;
}

/**
 * 查詢瀏覽器當前的 tab 和 group 狀態
 *
 * @async
 * @returns {Promise<TabGroupContext>} 返回包含 tabMap, tabsByGroupId, groups 的上下文
 */
async function getBrowserTabContext()
{
	const tabs = await queryBrowserTabs({});
	const tabMap = new Map(tabs.map(tab => [tab.url, tab]));
	const tabsByGroupId = groupTabsByGroupId(tabs);
	const groups = await queryTabGroup({});

	return { tabMap, tabsByGroupId, groups };
}

/**
 * 保存 tabGroups 到瀏覽器存儲
 *
 * @async
 * @param {ISyncTabGroupsStorage} groups - 要保存的 tabGroups 數據
 * @param {string} [logMessage] - 可選的日誌訊息
 */
async function saveTabGroupsToStorage(groups, logMessage = "TabGroups 已同步到 storage.sync")
{
	const storage = _getBrowserStorage();

	await storage.sync.set({ tabGroups: groups });
	await storage.local.set({ tabGroups: groups });
	console.log(logMessage, groups);

	console.log("storage.sync.getKeys", await storage.sync.getKeys());
	console.log("storage.local.getKeys", await storage.local.getKeys());
}

/**
 * 從 TabGroup 對象構建 ISyncTabGroup 對象
 *
 * @param {TabGroup} group - 瀏覽器 API 返回的 group 對象
 * @param {ISyncTab[]} [tabs] - 該群組下的 tabs（可選）
 * @returns {ISyncTabGroup} 構建好的 ISyncTabGroup 對象
 */
function buildSyncGroupFromBrowserGroup(group, tabs = [])
{
	return {
		id: group.id,
		title: group.title,
		color: group.color,
		collapsed: group.collapsed,
		tabs: tabs.map(tab => ({
			url: tab.url,
			title: tab.title
		}))
	};
}

/**
 * 從 ISyncTab 構建 sync tab 對象
 *
 * @param {ISyncTab} tab - 來源 tab 對象
 * @returns {{url: string, title: string}} 構建好的 sync tab 對象
 */
function buildSyncTab(tab)
{
	return {
		url: tab.url,
		title: tab.title
	};
}

/**
 * 将当前浏览器窗口中的标签页组数据推送到浏览器存储中
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error} 当存储操作失败时抛出
 * @description
 * 1. 查询当前浏览器中所有标签页
 * 2. 遍历标签页，收集属于标签页组的标签页
 * 3. 对于每个标签页组:
 *    - 获取组信息
 *    - 收组内的所有标签页信息
 * 4. 将数据保存到 storage.sync 和 storage.local
 */
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
			if (validTabGroupId(tab.groupId))
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
				groups[tab.groupId].tabs.push(buildSyncTab(tab));
			}
		}
	});

	await saveTabGroupsToStorage(groups, "TabGroups 已同步到 storage.sync");
}

/**
 * 从浏览器存储中拉取标签页组数据并同步到当前浏览器窗口
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} 当存储数据格式错误或同步操作失败时抛出
 * @description 
 * 1. 从浏览器存储中获取保存的标签页组数据
 * 2. 检查数据格式有效性
 * 3. 查询当前浏览器中已存在的标签页和标签页组
 * 4. 对于每个存储中的标签页组:
 *    - 检测是否已存在相同组
 *    - 对于组中的每个标签页:
 *      - 如果标签页已存在但未分组，则加入当前组
 *      - 如果标签页不存在，则新建标签页并加入组
 *    - 根据情况将标签页添加到现有组或创建新组
 */
async function pullTabGroupsStorage()
{
	const groups = await loadTabGroupsFromStorage();

	if (!groups)
	{
		return;
	}

	const { tabMap, tabsByGroupId, groups: existingGroups } = await getBrowserTabContext();

	for (const groupId in groups)
	{
		const group = groups[groupId];
		const tabsToAdd = [];

		// 檢測 group 是否已存在
		const existingGroupId = findExistingGroupId(group, existingGroups, tabsByGroupId);

		console.log(existingGroupId ? "Group already exists" : "Group does not exist", existingGroupId, group);

		for (const tab of group.tabs)
		{
			const existingTab = tabMap.get(tab.url);

			if (existingTab)
			{
				// 如果 tab 不屬於任何 group，將其加入
				if (!validTabGroupId(existingTab.groupId))
				{
					tabsToAdd.push(existingTab.id);
				}
				else
				{
					// 如果 tab 已在目標 group 中，則跳過
					console.log("Tab already exists in group", tab, existingTab.groupId, existingTab.id);
				}
			}
			else
			{
				// tab 不存在，建立新 tab
				const newTab = await chrome.tabs.create({ url: tab.url });
				tabsToAdd.push(newTab.id);
				tabMap.set(tab.url, newTab);

				console.log("Tab does not exist", tab, newTab);
			}
		}

		if (tabsToAdd.length > 0)
		{
			// 如果 group 已存在，將 tab 加入現有 group
			if (existingGroupId !== null)
			{
				console.log("Add tabs to exists group", existingGroupId, tabsToAdd);
				await createTabGroup({
					groupId: existingGroupId,
					tabIds: tabsToAdd
				});
			}
			else
			{
				console.log("Add tabs to new group", {
					groupId: group.id,
					tabIds: tabsToAdd,
					updateProperties: group,
				});
				// 否則建立新 group
				await createTabGroup({
					groupId: group.id,
					tabIds: tabsToAdd,
					updateProperties: group,
				});
			}
		}
	}
	console.log("TabGroups 已從 storage.sync 載入");
}

/**
 * 合併遠端與本地的標籤頁組數據
 *
 * @async
 * @returns {Promise<void>}
 * @throws {Error}當存儲數據格式錯誤或同步操作失敗時拋出
 * @description
 * 1. 從瀏覽器存儲中獲取保存的標籤頁組數據（遠端）
 * 2. 查詢當前瀏覽器中已存在的標籤頁和標籤頁組（本地）
 * 3. 構建本地的數據結構
 * 4. 合併遠端與本地數據:
 *    - 對於每個遠端群組:
 *      - 檢測本地是否已存在相同群組
 *      - 對於群組中的每個標籤頁:
 *        - 如果本地存在且未分組，則加入當前組
 *        - 如果本地不存在，則新建標籤頁並加入組
 * 5. 保存合併後的數據到存儲
 */
async function mergeTabGroupsStorage()
{
	const remoteGroups = await loadTabGroupsFromStorage();

	if (!remoteGroups)
	{
		return;
	}

	const { tabMap, tabsByGroupId, groups: localGroups } = await getBrowserTabContext();

	/**
	 * 合併後的數據結構
	 * @type {ISyncTabGroupsStorage}
	 */
	const mergedGroups = {};
	const addedTabUrls = new Set();

	// 1. 先將所有本地群組加入合併結果
	for (const localGroup of localGroups)
	{
		if (validTabGroupId(localGroup.id))
		{
			const groupTabs = tabsByGroupId.get(localGroup.id) || [];
			mergedGroups[localGroup.id] = buildSyncGroupFromBrowserGroup(localGroup, groupTabs);

			// 記錄已處理的標籤頁 URL
			for (const tab of mergedGroups[localGroup.id].tabs)
			{
				addedTabUrls.add(tab.url);
			}
		}
	}

	// 2. 合併遠端數據
	for (const remoteGroupId in remoteGroups)
	{
		const remoteGroup = remoteGroups[remoteGroupId];
		let targetGroupId = null;

		// 檢測 group 是否已存在
		const existingGroupId = findExistingGroupId(remoteGroup, localGroups, tabsByGroupId);

		// 如果存在相同群組，合併標籤頁
		if (existingGroupId !== null)
		{
			targetGroupId = existingGroupId;
			console.log("合併到現有群組", existingGroupId, remoteGroup);
		}
		// 否則創建新群組（使用遠端 ID）
		else
		{
			targetGroupId = parseInt(remoteGroupId);
			mergedGroups[targetGroupId] = {
				id: targetGroupId,
				title: remoteGroup.title,
				color: remoteGroup.color,
				collapsed: remoteGroup.collapsed,
				tabs: []
			};
			console.log("創建新群組", targetGroupId, remoteGroup);
		}

		// 處理標籤頁
		for (const remoteTab of remoteGroup.tabs)
		{
			// 檢查標籤頁是否已被處理過（避免重複）
			if (!addedTabUrls.has(remoteTab.url))
			{
				const localTab = tabMap.get(remoteTab.url);

				if (localTab)
				{
					// 本地存在但未分組，加入當前組
					if (!validTabGroupId(localTab.groupId))
					{
						mergedGroups[targetGroupId].tabs.push({
							url: remoteTab.url,
							title: remoteTab.title || localTab.title
						});
						addedTabUrls.add(remoteTab.url);
						console.log("加入本地未分組標籤頁", remoteTab.url);
					}
					// 本地已分組，跳過（避免恢復已被刪除的關係）
					else
					{
						console.log("跳過已分組的本地標籤頁", remoteTab.url, localTab.groupId);
					}
				}
				else
				{
					// 本地不存在，創建新標籤頁
					mergedGroups[targetGroupId].tabs.push({
						url: remoteTab.url,
						title: remoteTab.title
					});
					addedTabUrls.add(remoteTab.url);
					console.log("創建新標籤頁", remoteTab.url);
				}
			}
		}

		// 如果標籤頁為空，移除群組
		if (mergedGroups[targetGroupId].tabs.length === 0)
		{
			delete mergedGroups[targetGroupId];
			console.log("移除空群組", targetGroupId);
		}
	}

	await saveTabGroupsToStorage(mergedGroups, "TabGroups 合併完成");
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
	else if (msg.action === "merge")
	{
		mergeTabGroupsStorage();
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

/**
 * 验证给定的 tab group ID 是否有效
 * 
 * @param {number} groupId - 待验证的 tab group ID
 * @returns {boolean} 如果 ID 是正数则返回 true，否则返回 false
 */
function validTabGroupId(groupId)
{
	return typeof groupId === "number" && groupId > 0
}

/**
 * 將 tabs 依照 groupId 分組
 *
 * @param {ISyncTab[]} tabs - 標籤頁陣列
 * @returns {Map<number, ISyncTab[]>} 以 groupId 為 key 的 Map，value 為該 group 下的 tabs 陣列
 */
function groupTabsByGroupId(tabs)
{
	const grouped = new Map();

	for (const tab of tabs)
	{
		const groupId = tab.groupId;
		if (!grouped.has(groupId))
		{
			grouped.set(groupId, []);
		}
		grouped.get(groupId).push(tab);
	}

	return grouped;
}

/**
 * 檢測 tabgroup 是否已存在
 *
 * @param {ISyncTabGroup} group - 要檢測的同步群組
 * @param {TabGroup[]} existingGroups - 現有的群組陣列
 * @param {Map<number, ISyncTab[]>} existingTabsByGroupId - 依照 groupId 分組的 tabs Map
 * @returns {number|null} 返回存在的群組 ID，若不存在則返回 null
 */
function findExistingGroupId(group, existingGroups, existingTabsByGroupId)
{
	const groupTitle = group.title || TAB_GROUP_TITLE_DEFAULT;

	// 1. 先以 id 判斷 group 是否已存在
	const groupById = existingGroups.find(g => g.id === group.id);
	if (validTabGroupId(groupById?.id))
	{
		return groupById.id;
	}

	// 2. 找出標題符合的群組
	const groupsByTitle = existingGroups.filter(g => g.title === groupTitle);

	if (groupsByTitle.length === 1)
	{
		// 只有一個符合標題的群組，直接使用
		let groupId = groupsByTitle[0].id;

		if (validTabGroupId(groupId))
		{
			return groupId;
		}
	}
	else if (groupsByTitle.length > 1 && group.tabs.length)
	{
		// 3. 存在多個同標題群組，以網址判定
		for (const candidateGroup of groupsByTitle)
		{
			// 取得該群組下的所有 tab
			for (const tab of existingTabsByGroupId.get(candidateGroup.id))
			{
				if (group.tabs.find(t => t.url === tab.url))
				{
					return candidateGroup.id;
				}
			}
		}
	}

	// 沒有找到符合的群組
	return null;
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
 * 查询浏览器标签页并可选地对结果进行处理
 * 
 * @param {object} [queryInfo] - 查询参数对象，默认为空对象
 * @param {boolean} [queryInfo.pinned=false] - 是否查询固定标签页
 * @param {function} [fn] - 可选的处理函数，接收查询结果作为参数
 * @returns {Promise<ISyncTab[]>} 查询到的标签页数组
 */
async function queryBrowserTabs(queryInfo, fn)
{
	queryInfo ??= {};
	queryInfo.pinned ??= false;

	const tabs = await _getBrowserTabs().query(queryInfo);
	
	if (typeof fn !== "undefined")
	{
		await fn(tabs);
	}

	return tabs
}
