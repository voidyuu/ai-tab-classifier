// Call AI API for classification
const DEFAULT_BASE_URLS = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models'
};

function resolveBaseUrl(provider, endpoint) {
    const trimmedEndpoint = (endpoint || '').trim().replace(/\/+$/, '');

    if (provider === 'openai') {
        const normalized = trimmedEndpoint.replace(/\/chat\/completions$/, '');
        return normalized || DEFAULT_BASE_URLS.openai;
    }

    if (provider === 'anthropic') {
        const normalized = trimmedEndpoint.replace(/\/messages$/, '');
        return normalized || DEFAULT_BASE_URLS.anthropic;
    }

    return trimmedEndpoint || DEFAULT_BASE_URLS[provider] || trimmedEndpoint;
}

function extractAnthropicText(data) {
    if (typeof data?.content === 'string') {
        return data.content;
    }

    if (Array.isArray(data?.content)) {
        const textBlock = data.content.find((block) => typeof block?.text === 'string' && block.text.trim());
        if (textBlock) {
            return textBlock.text;
        }
    }

    return data?.output_text || data?.text || '';
}

async function callAIForClassification(tabs, config) {
    // Resolve the base URL for the current provider
    const endpoint = resolveBaseUrl(config.apiProvider, config.apiEndpoint);

    // Get Chrome's display language
    const uiLanguage = chrome.i18n.getUILanguage(); // e.g., "zh-CN", "en-US", "ja"

    const prompt = `Analyze the following browser tabs and group them by theme. Provide a concise group name for each group. The group name should be as short as possible (no more than 2 words in English or 2 characters in other languages).
Determine the language of the tab group names based on this locale code: ${uiLanguage}

Tab list:
${tabs.map((tab, i) => `${i + 1}. ID: ${tab.id}\n   Title: ${tab.title}\n   URL: ${tab.url}`).join('\n\n')}

Return the result in JSON format as follows:
{
  "groups": [
    {
      "name": "Group Name",
      "tabIds": [Array of tab ID numbers, e.g.: [123, 456, 789]],
      "color": "Color (grey/blue/red/yellow/green/pink/purple/cyan/orange)"
    }
  ]
}

Important notes:
1. tabIds must use the actual ID numbers from the list above
2. Each tab can only belong to one group
3. Group by theme reasonably (e.g.: Shopping, News, Development, Entertainment, etc.)
4. Group names should be concise (2-4 words)
5. Choose appropriate colors to distinguish different themes
6. Return only JSON, no other text

Example: If there are shopping sites with IDs 123 and 456, return:
{
  "groups": [
    {
      "name": "Shopping",
      "tabIds": [123, 456],
      "color": "red"
    }
  ]
}`;

    let response;
    let content;

    if (config.apiProvider === 'anthropic') {
        // Anthropic API
        const url = `${endpoint}/messages`;
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 4096,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });
    } else if (config.apiProvider === 'gemini') {
        // Google Gemini API
        const url = `${endpoint}/${config.model}:generateContent?key=${config.apiKey}`;
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
    } else {
        // OpenAI API
        const url = `${endpoint}/chat/completions`;
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7
            })
        });
    }

    // Extract AI response content
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from AI provider');
    }

    if (config.apiProvider === 'anthropic') {
        content = extractAnthropicText(data);
    } else if (config.apiProvider === 'gemini') {
        content = data.candidates[0].content.parts[0].text;
    } else {
        // OpenAI response format
        content = data.choices[0].message.content;
    }

    if (typeof content !== 'string' || !content.trim()) {
        if (config.apiProvider === 'anthropic' && data.stop_reason === 'max_tokens') {
            throw new Error('Claude response was truncated by max_tokens');
        }

        throw new Error('Invalid response content from AI provider');
    }

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Unable to extract JSON from AI response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.groups;
}