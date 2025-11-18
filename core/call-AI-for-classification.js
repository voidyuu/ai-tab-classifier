// Call AI API for classification
async function callAIForClassification(tabs, config) {
    // Normalize endpoint URL (remove trailing slash to avoid double slashes)
    const normalizeEndpoint = (url) => url.replace(/\/+$/, '');
    const endpoint = normalizeEndpoint(config.apiEndpoint);

    // Get Chrome's display language
    const uiLanguage = chrome.i18n.getUILanguage(); // e.g., "zh-CN", "en-US", "ja"

    const prompt = `Analyze the following browser tabs and group them by theme. Provide a concise group name for each group.
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

    if (config.apiProvider === 'gemini-nano') {
        // Chrome built-in Gemini Nano
        try {
            // Check if LanguageModel API is available
            if (typeof LanguageModel === 'undefined') {
                throw new Error('Chrome built-in AI is not available. Please use Chrome 128+ and enable chrome://flags/#prompt-api-for-gemini-nano');
            }

            const availability = await LanguageModel.availability();
            if (availability === 'no') {
                throw new Error('Chrome built-in AI is not available on this device');
            }

            if (availability === 'after-download') {
                throw new Error('Model needs to be downloaded first. Please wait and try again.');
            }

            // Create session with initial prompts
            const session = await LanguageModel.create({
                initialPrompts: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that organizes browser tabs into logical groups.'
                    }
                ]
            });

            // Get response
            content = await session.prompt(prompt);

            // Clean up
            session.destroy();
        } catch (error) {
            throw new Error(`Gemini Nano error: ${error.message}`);
        }
    } else if (config.apiProvider === 'anthropic') {
        // Anthropic API
        response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 2048,
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
        // OpenAI, DeepSeek or custom API (compatible with OpenAI format)
        response = await fetch(endpoint, {
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

    // Extract AI response content (only for API-based providers)
    if (config.apiProvider !== 'gemini-nano') {
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (config.apiProvider === 'anthropic') {
            content = data.content[0].text;
        } else if (config.apiProvider === 'gemini') {
            content = data.candidates[0].content.parts[0].text;
        } else {
            // OpenAI, DeepSeek or custom (OpenAI-compatible)
            content = data.choices[0].message.content;
        }
    }

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Unable to extract JSON from AI response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.groups;
}