// 清理提示词文本的函数
function cleanPromptText(text) {
  return text
    .replace(/\+\s*use\s*text/gi, '') // 移除 "+ use text"
    .replace(/\+\s*style\s*raw/gi, '') // 移除 "+ style raw"
    .replace(/\+\s*/g, '') // 移除其他以"+"开头的文本
    .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
    .trim(); // 去除首尾空格
}

// 优化提示词的主要函数
function optimizePrompt(originalPrompt, settings) {
  let optimizedPrompt = originalPrompt;
  
  // 1. 添加预设句子
  if (settings.presetSentences.length > 0) {
    optimizedPrompt = settings.presetSentences[0] + ", " + optimizedPrompt;
  }
  
  // 2. 删除不需要的参数
  settings.removeParams.forEach(param => {
    const regex = new RegExp(`${param}\\s+[\\w.:]+\\s*`, 'g');
    optimizedPrompt = optimizedPrompt.replace(regex, '');
  });
  
  // 3. 调整图片比例
  const aspectRegex = /--ar\s+[\d.:]+/g;
  if (aspectRegex.test(optimizedPrompt)) {
    optimizedPrompt = optimizedPrompt.replace(aspectRegex, ` --ar ${settings.aspectRatio}`);
  } else {
    optimizedPrompt += ` --ar ${settings.aspectRatio}`;
  }
  
  // 4. 确保所有参数前面有空格
  optimizedPrompt = optimizedPrompt
    // 先移除参数前的多余空格
    .replace(/\s+--/g, ' --')
    // 确保参数前有空格（如果不是在开头的话）
    .replace(/([^\s])--/g, '$1 --')
    // 处理可能出现的多余空格
    .replace(/\s+/g, ' ')
    .trim();
  
  return optimizedPrompt;
}

// 在页面中注入优化后的提示词
function injectOptimizedPrompt(promptContainer, originalPrompt) {
  // 如果已经处理过，直接返回
  if (promptContainer.dataset.mjplusProcessed === 'true' || 
      promptContainer.querySelector('.mjplus-optimized') || 
      promptContainer.closest('.mjplus-optimized')) {
    return;
  }
  
  // 标记为已处理
  promptContainer.dataset.mjplusProcessed = 'true';
  
  // 获取设置并优化提示词
  chrome.runtime.sendMessage({type: "getSettings"}, (settings) => {
    const optimizedPrompt = optimizePrompt(originalPrompt, settings);
    
    // 创建优化后的提示词显示区域
    const optimizedDiv = document.createElement('div');
    optimizedDiv.className = 'mjplus-optimized';
    optimizedDiv.innerHTML = `
      <div class="mjplus-label">优化后的提示词：</div>
      <div class="mjplus-content">${optimizedPrompt}</div>
      <button class="mjplus-copy">复制</button>
    `;
    
    // 插入到提示词容器后面（而不是内部）
    promptContainer.parentNode.insertBefore(optimizedDiv, promptContainer.nextSibling);
    
    // 添加复制功能
    const copyButton = optimizedDiv.querySelector('.mjplus-copy');
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(optimizedPrompt);
      copyButton.textContent = '已复制';
      setTimeout(() => {
        copyButton.textContent = '复制';
      }, 2000);
    });
  });
}

// 查找并处理提示词元素
function findAndProcessPrompt() {
  // 使用多个选择器策略来查找提示词元素
  const selectors = [
    // 1. 查找包含特定参数的元素
    "//div[contains(text(), '--ar') or contains(text(), '--v') or contains(text(), 'chaos') or contains(text(), 'stylize')]",
    // 2. 查找包含图片描述的元素
    "//div[contains(@class, 'prompt') or contains(@class, 'description')]",
    // 3. 查找在图片右侧包含长文本的元素
    "//div[string-length(text()) > 50 and contains(text(), ' ')]"
  ];

  let promptElement = null;
  
  // 尝试每个选择器直到找到元素
  for (const selector of selectors) {
    const element = document.evaluate(
      selector,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    if (element) {
      const text = cleanPromptText(element.textContent.trim());
      // 验证文本是否包含提示词特征，并确保不是已处理的元素
      if (text.includes(' ') && 
          text.length > 20 && 
          !text.includes('优化后的提示词') &&
          !element.closest('.mjplus-optimized') &&
          !element.querySelector('.mjplus-optimized')) {
        promptElement = element;
        break;
      }
    }
  }

  // 如果找到提示词元素且未处理过
  if (promptElement && 
      !promptElement.dataset.mjplusProcessed && 
      !promptElement.closest('.mjplus-optimized')) {
    const originalPrompt = cleanPromptText(promptElement.textContent.trim());
    if (originalPrompt) {
      injectOptimizedPrompt(promptElement, originalPrompt);
    }
  }
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 使用防抖处理的查找函数
const debouncedFindPrompt = debounce(findAndProcessPrompt, 500);

// 监听页面变化
const observer = new MutationObserver((mutations) => {
  // 检查是否有相关变化
  const hasRelevantChanges = mutations.some(mutation => {
    return Array.from(mutation.addedNodes).some(node => {
      return node.nodeType === 1 && (
        node.textContent.includes('--ar') ||
        node.textContent.includes('chaos') ||
        node.textContent.includes('stylize')
      );
    });
  });

  if (hasRelevantChanges) {
    debouncedFindPrompt();
  }
});

// 开始观察页面变化
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// 页面加载完成后执行一次
document.addEventListener('DOMContentLoaded', debouncedFindPrompt);

// 为了确保动态加载的页面上也能工作，添加额外的触发点
window.addEventListener('load', debouncedFindPrompt);
setTimeout(debouncedFindPrompt, 2000); // 2秒后再次尝试 