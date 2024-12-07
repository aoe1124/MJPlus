// 加载设置
function loadSettings() {
  chrome.storage.sync.get(null, (data) => {
    // 显示预设句子列表
    const presetList = document.getElementById('presetList');
    presetList.innerHTML = '';
    data.presetSentences.forEach((sentence, index) => {
      const div = document.createElement('div');
      div.className = 'preset-item';
      div.innerHTML = `
        <span>${sentence}</span>
        <button class="delete-preset" data-index="${index}">删除</button>
      `;
      presetList.appendChild(div);
    });
    
    // 设置图片比例
    document.getElementById('aspectRatio').value = data.aspectRatio;
  });
}

// 添加预设句子
document.getElementById('addPreset').addEventListener('click', () => {
  const input = document.getElementById('newPreset');
  const sentence = input.value.trim();
  if (sentence) {
    chrome.storage.sync.get('presetSentences', (data) => {
      const sentences = data.presetSentences || [];
      sentences.push(sentence);
      chrome.storage.sync.set({presetSentences: sentences}, loadSettings);
    });
    input.value = '';
  }
});

// 删除预设句子
document.getElementById('presetList').addEventListener('click', (e) => {
  if (e.target.classList.contains('delete-preset')) {
    const index = parseInt(e.target.dataset.index);
    chrome.storage.sync.get('presetSentences', (data) => {
      const sentences = data.presetSentences;
      sentences.splice(index, 1);
      chrome.storage.sync.set({presetSentences: sentences}, loadSettings);
    });
  }
});

// 更新图片比例
document.getElementById('aspectRatio').addEventListener('change', (e) => {
  chrome.storage.sync.set({aspectRatio: e.target.value});
});

// 初始加载
document.addEventListener('DOMContentLoaded', loadSettings); 