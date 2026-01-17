document.getElementById("save").addEventListener("click", () =>
{
	chrome.runtime.sendMessage({ action: "save" });
});

document.getElementById("load").addEventListener("click", () =>
{
	chrome.runtime.sendMessage({ action: "load" });
});
