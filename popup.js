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
