// Get DOM elements
const apiProviderSelect = document.getElementById('apiProvider');
const apiKeyInput = document.getElementById('apiKey');
const apiEndpointInput = document.getElementById('apiEndpoint');
const modelInput = document.getElementById('model');
const saveConfigBtn = document.getElementById('saveConfig');
const configStatus = document.getElementById('configStatus');

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
    gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        defaultModel: 'gemini-2.5-flash-lite'
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    setupEventListeners();
});

// Load saved configuration
async function loadConfig() {
    const config = await chrome.storage.sync.get(['apiProvider']);

    if (config.apiProvider && API_CONFIGS[config.apiProvider]) {
        apiProviderSelect.value = config.apiProvider;
    } else {
        apiProviderSelect.value = 'openai';
    }

    // Always trigger handleProviderChange to update UI
    await handleProviderChange();
}

// Setup event listeners
function setupEventListeners() {
    apiProviderSelect.addEventListener('change', handleProviderChange);
    saveConfigBtn.addEventListener('click', saveConfig);
}

// Handle API provider changes
async function handleProviderChange() {
    const provider = API_CONFIGS[apiProviderSelect.value] ? apiProviderSelect.value : 'openai';

    if (apiProviderSelect.value !== provider) {
        apiProviderSelect.value = provider;
    }

    // Load saved config for this provider
    const storageKey = `config_${provider}`;
    const savedConfig = await chrome.storage.sync.get([storageKey]);
    const providerConfig = savedConfig[storageKey] || {};

    // Load saved API key and model, or use defaults
    apiKeyInput.value = providerConfig.apiKey || '';
    modelInput.value = providerConfig.model || API_CONFIGS[provider].defaultModel;

    // Show API key field
    const apiKeyGroup = document.querySelector('.form-group:has(#apiKey)');
    apiKeyGroup.style.display = 'block';
}

// Save configuration
async function saveConfig() {
    const apiProvider = apiProviderSelect.value;
    const apiKey = apiKeyInput.value.trim();
    const model = modelInput.value.trim();

    if (!apiKey) {
        showStatus('error', 'Please enter API Key');
        return;
    }

    if (!model) {
        showStatus('error', 'Please enter model name');
        return;
    }

    // Save current provider
    await chrome.storage.sync.set({ apiProvider });

    // Save provider-specific config
    const storageKey = `config_${apiProvider}`;
    await chrome.storage.sync.set({
        [storageKey]: {
            apiKey,
            apiEndpoint: API_CONFIGS[apiProvider].endpoint,
            model
        }
    });

    // Also save as default config for backward compatibility
    await chrome.storage.sync.set({
        apiKey,
        apiEndpoint: API_CONFIGS[apiProvider].endpoint,
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
