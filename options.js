// 获取DOM元素
const apiProviderSelect = document.getElementById('apiProvider');
const apiKeyInput = document.getElementById('apiKey');
const apiEndpointInput = document.getElementById('apiEndpoint');
const modelInput = document.getElementById('model');
const saveConfigBtn = document.getElementById('saveConfig');
const configStatus = document.getElementById('configStatus');
const customEndpointGroup = document.getElementById('customEndpointGroup');

// 预设的API配置
const API_CONFIGS = {
    openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        defaultModel: 'gpt-3.5-turbo'
    },
    anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        defaultModel: 'claude-3-haiku-20240307'
    },
    deepseek: {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        defaultModel: 'deepseek-chat'
    },
    gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
        defaultModel: 'gemini-2.5-flash-lite'
    },
    custom: {
        endpoint: '',
        defaultModel: ''
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    setupEventListeners();
});

// 加载保存的配置
async function loadConfig() {
    const config = await chrome.storage.sync.get(['apiProvider', 'apiKey', 'apiEndpoint', 'model']);

    if (config.apiProvider) {
        apiProviderSelect.value = config.apiProvider;
        handleProviderChange();
    }
    if (config.apiKey) {
        apiKeyInput.value = config.apiKey;
    }
    if (config.apiEndpoint) {
        apiEndpointInput.value = config.apiEndpoint;
    }
    if (config.model) {
        modelInput.value = config.model;
    }
}

// 设置事件监听
function setupEventListeners() {
    apiProviderSelect.addEventListener('change', handleProviderChange);
    saveConfigBtn.addEventListener('click', saveConfig);
}

// 处理API提供商变化
function handleProviderChange() {
    const provider = apiProviderSelect.value;

    if (provider === 'custom') {
        customEndpointGroup.style.display = 'block';
    } else {
        customEndpointGroup.style.display = 'none';
        apiEndpointInput.value = API_CONFIGS[provider].endpoint;
        if (!modelInput.value) {
            modelInput.value = API_CONFIGS[provider].defaultModel;
        }
    }
}

// 保存配置
async function saveConfig() {
    const apiProvider = apiProviderSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const apiEndpoint = apiProvider === 'custom' ? apiEndpointInput.value.trim() : API_CONFIGS[apiProvider].endpoint;
    const model = modelInput.value.trim();

    if (!apiKey) {
        showStatus('error', '请输入API Key');
        return;
    }

    if (!apiEndpoint) {
        showStatus('error', '请输入API端点');
        return;
    }

    if (!model) {
        showStatus('error', '请输入模型名称');
        return;
    }

    await chrome.storage.sync.set({
        apiProvider,
        apiKey,
        apiEndpoint,
        model
    });

    showStatus('success', '✓ 配置保存成功！');
}

// 显示状态消息
function showStatus(type, message) {
    configStatus.className = `status ${type}`;
    configStatus.textContent = message;
    configStatus.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            configStatus.style.display = 'none';
        }, 3000);
    }
}
