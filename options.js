// Get DOM elements
const apiProviderSelect = document.getElementById('apiProvider');
const apiKeyInput = document.getElementById('apiKey');
const apiEndpointInput = document.getElementById('apiEndpoint');
const modelInput = document.getElementById('model');
const saveConfigBtn = document.getElementById('saveConfig');
const configStatus = document.getElementById('configStatus');
const customEndpointGroup = document.getElementById('customEndpointGroup');

// Preset API configurations
const API_CONFIGS = {
    openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        defaultModel: 'gpt-4o-mini'
    },
    anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        defaultModel: 'claude-3-5-haiku-20241022'
    },
    deepseek: {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        defaultModel: 'deepseek-chat'
    },
    gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
        defaultModel: 'gemini-2.0-flash-exp'
    },
    custom: {
        endpoint: '',
        defaultModel: ''
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    setupEventListeners();
});

// Load saved configuration
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

// Setup event listeners
function setupEventListeners() {
    apiProviderSelect.addEventListener('change', handleProviderChange);
    saveConfigBtn.addEventListener('click', saveConfig);
}

// Handle API provider changes
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

// Save configuration
async function saveConfig() {
    const apiProvider = apiProviderSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const apiEndpoint = apiProvider === 'custom' ? apiEndpointInput.value.trim() : API_CONFIGS[apiProvider].endpoint;
    const model = modelInput.value.trim();

    if (!apiKey) {
        showStatus('error', 'Please enter API Key');
        return;
    }

    if (!apiEndpoint) {
        showStatus('error', 'Please enter API endpoint');
        return;
    }

    if (!model) {
        showStatus('error', 'Please enter model name');
        return;
    }

    await chrome.storage.sync.set({
        apiProvider,
        apiKey,
        apiEndpoint,
        model
    });

    showStatus('success', '✓ Configuration saved successfully!');
}

// Display status message
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
