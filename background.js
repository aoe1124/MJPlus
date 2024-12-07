// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  // 初始化默认设置
  chrome.storage.sync.set({
    presetSentences: [],
    aspectRatio: "3:4",
    removeParams: ["--chaos", "--stylize", "--personalize", "--v", "--sref"]
  });
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getSettings") {
    chrome.storage.sync.get(null, (data) => {
      sendResponse(data);
    });
    return true;
  }
}); 