// Get DOM elements
const apiKeyInput = document.getElementById('apiKey');
const apiEndpointInput = document.getElementById('apiEndpoint');
const apiEndpointGroup = document.getElementById('apiEndpointGroup');
const modelInput = document.getElementById('model');
const configStatus = document.getElementById('configStatus');
const apiProviderTabs = Array.from(document.querySelectorAll('.provider-tab'));

let activeProvider = 'openai';
let saveTimerId = null;

// Preset API configurations
const API_CONFIGS = {
    openai: {
        endpoint: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini'
    },
    anthropic: {
        endpoint: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-5-haiku-20241022'
    },
    gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
        defaultModel: 'gemini-2.5-flash-lite'
    }
};

function getBaseUrlPlaceholder(provider) {
    return API_CONFIGS[provider].endpoint;
}

function normalizeProviderEndpoint(provider, endpoint) {
    const trimmedEndpoint = (endpoint || '').trim().replace(/\/+$/, '');

    if (!trimmedEndpoint) {
        return '';
    }

    if (provider === 'openai') {
        const normalized = trimmedEndpoint.replace(/\/chat\/completions$/, '');
        return normalized === API_CONFIGS.openai.endpoint ? '' : normalized;
    }

    if (provider === 'anthropic') {
        const normalized = trimmedEndpoint.replace(/\/messages$/, '');
        return normalized === API_CONFIGS.anthropic.endpoint ? '' : normalized;
    }

    return trimmedEndpoint;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    setupEventListeners();
});

// Load saved configuration
async function loadConfig() {
    const config = await chrome.storage.sync.get(['apiProvider']);

    if (config.apiProvider && API_CONFIGS[config.apiProvider]) {
        activeProvider = config.apiProvider;
    } else {
        activeProvider = 'openai';
    }

    await handleProviderChange();
}

// Setup event listeners
function setupEventListeners() {
    apiProviderTabs.forEach((tab) => {
        tab.addEventListener('click', async () => {
            activeProvider = tab.dataset.provider;
            if (saveTimerId) {
                clearTimeout(saveTimerId);
                saveTimerId = null;
            }
            await chrome.storage.sync.set({ apiProvider: activeProvider });
            await handleProviderChange();
        });
    });

    [apiKeyInput, apiEndpointInput, modelInput].forEach((input) => {
        input.addEventListener('input', scheduleAutosave);
        input.addEventListener('change', scheduleAutosave);
    });
}

// Handle API provider changes
async function handleProviderChange() {
    const provider = API_CONFIGS[activeProvider] ? activeProvider : 'openai';
    activeProvider = provider;

    apiProviderTabs.forEach((tab) => {
        const isActive = tab.dataset.provider === provider;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
    });

    // Load saved config for this provider
    const storageKey = `config_${provider}`;
    const savedConfig = await chrome.storage.sync.get([storageKey]);
    const providerConfig = savedConfig[storageKey] || {};

    // Load saved API key and model, or use defaults
    apiKeyInput.value = providerConfig.apiKey || '';
    modelInput.value = providerConfig.model || API_CONFIGS[provider].defaultModel;

    if (provider === 'openai' || provider === 'anthropic') {
        apiEndpointGroup.style.display = 'block';
        apiEndpointInput.placeholder = getBaseUrlPlaceholder(provider);
        apiEndpointInput.value = normalizeProviderEndpoint(provider, providerConfig.apiEndpoint || '');
    } else {
        apiEndpointGroup.style.display = 'none';
        apiEndpointInput.value = '';
    }

    // Show API key field
    const apiKeyGroup = document.querySelector('.form-group:has(#apiKey)');
    apiKeyGroup.style.display = 'block';
}

function scheduleAutosave() {
    if (saveTimerId) {
        clearTimeout(saveTimerId);
    }

    saveTimerId = setTimeout(() => {
        saveTimerId = null;
        saveConfig().catch((error) => {
            showStatus('error', `Save failed: ${error.message}`);
        });
    }, 250);
}

// Save configuration
async function saveConfig() {
    try {
        const apiProvider = activeProvider;
        const apiKey = apiKeyInput.value.trim();
        const apiEndpoint = normalizeProviderEndpoint(apiProvider, apiEndpointInput.value);
        const model = modelInput.value.trim();

        // Save current provider
        await chrome.storage.sync.set({ apiProvider });

        // Save provider-specific config
        const storageKey = `config_${apiProvider}`;
        await chrome.storage.sync.set({
            [storageKey]: {
                apiKey,
                apiEndpoint: apiProvider === 'openai' || apiProvider === 'anthropic'
                    ? apiEndpoint
                    : API_CONFIGS[apiProvider].endpoint,
                model
            }
        });

        // Also save as default config for backward compatibility
        await chrome.storage.sync.set({
            apiKey,
            apiEndpoint: apiProvider === 'openai' || apiProvider === 'anthropic'
                ? apiEndpoint
                : API_CONFIGS[apiProvider].endpoint,
            model
        });

    } catch (error) {
        showStatus('error', `Save failed: ${error.message}`);
    }
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
