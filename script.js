// AI Story Generator JavaScript
class StoryGenerator {
    constructor() {
        this.apiKey = this.getStoredApiKey('AIzaSyBiLSvd0KJNxu8WW4JcxjKLAE84rC6PYGs');
        this.selectedTone = '';
        this.selectedEmotion = '';
        this.storyHistory = JSON.parse(localStorage.getItem('storyHistory') || '[]');
        
        // Properties for story visualization
        this.readingProgress = 0;
        this.totalWords = 0;
        this.currentStoryText = '';
        
        this.init();
        this.initDarkMode();
    }

    init() {
        this.bindEvents();
        this.checkApiKey();
    }

    bindEvents() {
        // Generate button
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateStory();
        });

        // Tone buttons
        document.querySelectorAll('.tone-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTone(e.target.closest('.tone-btn'));
            });
        });

        // Emotion buttons
        document.querySelectorAll('.emotion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectEmotion(e.target.closest('.emotion-btn'));
            });
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // API Key modal events
        document.getElementById('saveApiKey').addEventListener('click', () => {
            this.saveApiKey();
        });

        document.getElementById('cancelApiKey').addEventListener('click', () => {
            this.hideApiKeyModal();
        });

        // Enter key in prompt textarea
        document.getElementById('prompt').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.generateStory();
            }
        });

        // Story control buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'copyBtn') this.copyStory();
            if (e.target.id === 'shareBtn') this.shareStory();
        });
    }

    checkApiKey() {
        if (!this.apiKey) {
            this.showApiKeyModal();
        }
    }

    showApiKeyModal() {
        document.getElementById('apiKeyModal').style.display = 'flex';
    }

    hideApiKeyModal() {
        document.getElementById('apiKeyModal').style.display = 'none';
    }

    getStoredApiKey() {
        // Try multiple storage methods for better compatibility
        try {
            // Try localStorage first
            let apiKey = localStorage.getItem('googleAIApiKey');
            if (apiKey) return apiKey;
            
            // Try sessionStorage as fallback
            apiKey = sessionStorage.getItem('googleAIApiKey');
            if (apiKey) return apiKey;
            
            // Try cookie as last resort
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'googleAIApiKey') {
                    return decodeURIComponent(value);
                }
            }
        } catch (error) {
            console.warn('Storage access error:', error);
        }
        return null;
    }

    saveApiKey() {
        const apiKeyInput = document.getElementById('apiKey');
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            alert('Please enter a valid API key');
            return;
        }

        this.apiKey = apiKey;
        this.storeApiKey(apiKey);
        this.hideApiKeyModal();
        apiKeyInput.value = '';
        
        // Show success message
        this.showNotification('API key saved successfully!');
    }

    storeApiKey(apiKey) {
        try {
            // Try localStorage first
            localStorage.setItem('googleAIApiKey', apiKey);
            console.log('API key saved to localStorage');
        } catch (error) {
            console.warn('localStorage failed, trying sessionStorage:', error);
            try {
                // Fallback to sessionStorage
                sessionStorage.setItem('googleAIApiKey', apiKey);
                console.log('API key saved to sessionStorage');
            } catch (error2) {
                console.warn('sessionStorage failed, trying cookie:', error2);
                try {
                    // Fallback to cookie (expires in 30 days)
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + 30);
                    document.cookie = `googleAIApiKey=${encodeURIComponent(apiKey)}; expires=${expiryDate.toUTCString()}; path=/`;
                    console.log('API key saved to cookie');
                } catch (error3) {
                    console.error('All storage methods failed:', error3);
                    alert('Warning: Unable to save API key. You may need to enter it again next time.');
                }
            }
        }
    }

    initDarkMode() {
        // Check for saved dark mode preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('darkModeToggle').innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        
        // Update toggle icon
        const toggleBtn = document.getElementById('darkModeToggle');
        toggleBtn.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        
        // Save preference
        localStorage.setItem('darkMode', isDarkMode);
    }

    selectTone(button) {
        // Remove active class from all tone buttons
        document.querySelectorAll('.tone-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to selected button
        button.classList.add('active');
        this.selectedTone = button.dataset.tone;
    }

    selectEmotion(button) {
        // Remove active class from all emotion buttons
        document.querySelectorAll('.emotion-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to selected button
        button.classList.add('active');
        this.selectedEmotion = button.dataset.emotion;
    }

    async generateStory() {
        const prompt = document.getElementById('prompt').value.trim();
        const mainCharacter = document.getElementById('mainCharacter').value.trim();
        const storyMode = document.getElementById('storyMode').value;
        const length = document.getElementById('length').value;

        if (!prompt) {
            alert('Please enter a story prompt');
            return;
        }

        if (!this.apiKey) {
            this.showApiKeyModal();
            return;
        }

        this.showLoading();
        
        try {
            const story = await this.callGoogleAI(prompt, mainCharacter, storyMode, this.selectedTone, this.selectedEmotion, length);
            this.displayStory(story);
            this.saveToHistory(story, prompt, mainCharacter, storyMode);
            this.currentStoryText = story;
        } catch (error) {
            console.error('Error generating story:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async callGoogleAI(prompt, mainCharacter, storyMode, tone, emotion, length) {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
        
        // Build the enhanced story generation prompt
        let storyPrompt = `Create an advanced, engaging story with the following specifications:

📖 STORY PROMPT: ${prompt}`;

        if (mainCharacter) {
            storyPrompt += `\n👤 MAIN CHARACTER: ${mainCharacter}`;
        }

        // Add story mode specific instructions
        const storyModeInstructions = {
            'classic': 'Write a traditional narrative story with clear beginning, middle, and end.',
            'thriller': 'Create a suspenseful thriller with plot twists, tension, and unexpected revelations. Include cliffhangers and mysterious elements.',
            'rpg': 'Write an RPG-style adventure with character development, quests, magical elements, and world-building. Include stats, abilities, or game-like elements.',
            'mystery': 'Create a mystery story with clues, red herrings, and a puzzle to solve. Include investigative elements and logical deduction.',
            'roleswap': 'Write a story where characters swap roles, perspectives, or identities. Explore how this change affects the narrative.',
            'interactive': 'Create an interactive world-building story with rich descriptions of the environment, cultures, and societies. Make the world feel alive and immersive.'
        };
        
        if (storyMode && storyModeInstructions[storyMode]) {
            storyPrompt += `\n🎮 STORY MODE: ${storyModeInstructions[storyMode]}`;
        }

        if (tone) {
            storyPrompt += `\n🎨 TONE/STYLE: ${tone}`;
        }

        // Add emotion-based plot instructions
        const emotionInstructions = {
            'hope': 'Center the story around themes of hope, optimism, and overcoming adversity. Show characters finding light in darkness.',
            'fear': 'Build a story around fear, anxiety, and suspense. Create tension and explore what frightens the characters.',
            'love': 'Focus on love, relationships, and emotional connections. Explore different types of love (romantic, familial, friendship).',
            'betrayal': 'Create a story involving betrayal, broken trust, and its consequences. Show the impact on relationships.',
            'discovery': 'Build the plot around discovery, revelation, and uncovering hidden truths. Include moments of realization.',
            'revenge': 'Center the story on revenge, justice, and the consequences of seeking vengeance.'
        };
        
        if (emotion && emotionInstructions[emotion]) {
            storyPrompt += `\n💭 EMOTIONAL CORE: ${emotionInstructions[emotion]}`;
        }

        // Add length requirements
        const lengthMap = {
            'short': '100-200 words',
            'medium': '300-500 words',
            'long': '600-800 words'
        };
        storyPrompt += `\n📏 LENGTH: ${lengthMap[length] || '300-500 words'}`;

        storyPrompt += `\n\n✨ SPECIAL REQUIREMENTS:
- Write a complete, well-structured story with clear beginning, middle, and end
- Include engaging dialogue where appropriate
- Format with proper paragraphs
- End with a clear MORAL OF THE STORY section
- Make the story creative, unique, and emotionally engaging
- If mystery/thriller mode: include clues and revelations
- If RPG mode: include adventure elements and character growth
- Ensure the main character (if provided) is central to the plot

📝 FORMAT YOUR RESPONSE AS:
[STORY TITLE]

[MAIN STORY CONTENT]

🎯 MORAL OF THE STORY:
[Clear moral or lesson learned from the story]`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: storyPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.9,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        let retries = 0;
        const maxRetries = 3;
        
        while (retries <= maxRetries) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
                    
                    // Check if it's a retryable error
                    const isOverloaded = errorMessage.toLowerCase().includes('overloaded') || 
                                       errorMessage.toLowerCase().includes('rate limit') ||
                                       response.status === 429 || response.status === 503;
                    
                    if (isOverloaded && retries < maxRetries) {
                        retries++;
                        const delay = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff, max 10s
                        console.log(`API overloaded, retrying in ${delay/1000}s... (attempt ${retries}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    
                    throw new Error(this.getFriendlyErrorMessage(errorMessage, response.status));
                }

                const data = await response.json();
                
                if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                    throw new Error('No story was generated. Please try again with a different prompt.');
                }
                
                return data.candidates[0].content.parts[0].text;
                
            } catch (error) {
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    if (retries < maxRetries) {
                        retries++;
                        const delay = 2000;
                        console.log(`Network error, retrying in ${delay/1000}s... (attempt ${retries}/${maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }
                    throw new Error('Network connection failed. Please check your internet connection and try again.');
                }
                
                // If it's not a network error and we've exhausted retries, throw the error
                if (retries >= maxRetries) {
                    throw error;
                }
                
                retries++;
                const delay = 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error('Failed to generate story after multiple attempts. Please try again later.');
    }

    saveToHistory(story, prompt, mainCharacter, storyMode) {
        const storyEntry = {
            id: Date.now(),
            story: story,
            prompt: prompt,
            mainCharacter: mainCharacter || 'Unnamed',
            storyMode: storyMode || 'classic',
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString()
        };
        
        this.storyHistory.unshift(storyEntry);
        
        // Keep only last 50 stories
        if (this.storyHistory.length > 50) {
            this.storyHistory = this.storyHistory.slice(0, 50);
        }
        
        localStorage.setItem('storyHistory', JSON.stringify(this.storyHistory));
    }

    displayStory(story) {
        const storyContainer = document.getElementById('storyContainer');
        const storyControls = document.getElementById('storyControls');
        
        // Parse and format the story
        const formattedStory = this.parseStoryContent(story);
        
        storyContainer.innerHTML = `
            <div class="story-content">
                <div class="story-header">
                    <h3><i class="fas fa-book-open"></i> Your Generated Story</h3>
                    <div class="story-meta">
                        <span class="story-timestamp">Generated on ${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="story-text" id="storyText">
                    ${formattedStory}
                </div>
            </div>
        `;
        
        // Show the story controls
        if (storyControls) {
            storyControls.style.display = 'block';
        }
        
        // Store the current story text for audio and cover art generation
        this.currentStoryText = this.extractPlainText(formattedStory);
        
        // Calculate and show reading statistics
        this.updateReadingStats();
    }

    parseStoryContent(story) {
        const lines = story.split('\n').filter(line => line.trim());
        let title = '';
        let content = [];
        let moral = '';
        let inMoral = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for moral section
            if (line.includes('MORAL OF THE STORY') || line.includes('🎯')) {
                inMoral = true;
                continue;
            }
            
            if (inMoral) {
                moral += line + ' ';
            } else if (i === 0 && !line.includes('📖') && !line.includes('STORY')) {
                // First line might be title
                title = line;
            } else if (!line.includes('📖') && !line.includes('👤') && !line.includes('🎭')) {
                // Regular story content
                content.push(line);
            }
        }
        
        return `
            ${title ? `<h2>${title}</h2>` : ''}
            ${content.join('\n')}
            ${moral ? `<p class="story-moral">${moral.trim()}</p>` : ''}
        `;
    }

    extractPlainText(htmlContent) {
        // Create a temporary div to extract plain text from HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    updateReadingStats() {
        const words = this.currentStoryText.split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        const avgReadingSpeed = 200; // words per minute
        const estimatedMinutes = Math.ceil(wordCount / avgReadingSpeed);
        
        // Update reading time display
        document.getElementById('readingTime').textContent = `Est. reading time: ${estimatedMinutes} min`;
        
        // Show word count in progress stats initially
        document.getElementById('progressStats').textContent = `0% • 0 of ${wordCount} words read`;
    }

    copyStory() {
        const storyText = document.querySelector('.story-text');
        if (storyText) {
            const text = storyText.innerText;
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Story copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showNotification('Story copied to clipboard!');
            });
        }
    }

    shareStory() {
        const storyText = document.querySelector('.story-text');
        if (storyText && navigator.share) {
            navigator.share({
                title: 'My AI-Generated Story',
                text: storyText.innerText,
                url: window.location.href
            });
        } else {
            this.copyStory();
        }
    }

    regenerateStory() {
        this.generateStory();
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
        document.getElementById('generateBtn').disabled = true;
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('generateBtn').disabled = false;
    }

    showError(message) {
        const storyContainer = document.getElementById('storyContainer');
        storyContainer.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #e53e3e; margin-bottom: 15px;"></i>
                <h3 style="color: #e53e3e; margin-bottom: 10px;">Error Generating Story</h3>
                <p style="color: #718096; margin-bottom: 20px;">${message}</p>
                <button class="btn-secondary" onclick="storyGenerator.generateStory()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1002;
            font-weight: 500;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    downloadStory() {
        const storyText = document.querySelector('.story-text');
        if (storyText) {
            const text = storyText.innerText;
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'my-story.txt';
            a.click();
            URL.revokeObjectURL(url);
            this.showNotification('Story downloaded successfully!');
        }
    }

    rateStory() {
        const rating = prompt('Please rate this story (1-5 stars):');
        if (rating && rating >= 1 && rating <= 5) {
            this.showNotification(`Thank you for rating the story ${rating}/5 stars!`);
        } else if (rating) {
            this.showNotification('Please enter a rating between 1 and 5.');
        }
    }

    getFriendlyErrorMessage(errorMessage, statusCode) {
        const message = errorMessage.toLowerCase();
        
        if (message.includes('overloaded') || message.includes('rate limit') || statusCode === 429) {
            return 'The AI service is currently busy. We\'ll automatically retry in a moment...';
        }
        
        if (message.includes('quota') || message.includes('billing')) {
            return 'API quota exceeded. Please check your Google AI billing settings.';
        }
        
        if (message.includes('invalid') && message.includes('key')) {
            return 'Invalid API key. Please check your Google AI API key in the settings.';
        }
        
        if (message.includes('permission') || statusCode === 403) {
            return 'Permission denied. Please verify your API key has the correct permissions.';
        }
        
        if (statusCode === 400) {
            return 'Invalid request. Please try a different story prompt.';
        }
        
        if (statusCode >= 500) {
            return 'Google AI service is temporarily unavailable. Please try again in a few minutes.';
        }
        
        // Default fallback
        return `Error: ${errorMessage}. Please try again or check your settings.`;
    }
}

// Initialize the story generator when the page loads
let storyGenerator;
document.addEventListener('DOMContentLoaded', () => {
    storyGenerator = new StoryGenerator();
});

// Add some example prompts for inspiration
const examplePrompts = [
    "A time traveler accidentally changes a small detail in the past and returns to find the world completely different.",
    "A librarian discovers that the books in their library come to life after midnight.",
    "Two rival coffee shop owners are forced to work together when their shops are the only ones left on a street being demolished.",
    "A detective who can see the last 24 hours of a deceased person's life by touching objects they owned.",
    "A world where people's emotions are visible as colored auras around them.",
    "A young artist finds a paintbrush that makes whatever they paint become real.",
    "The last human on Earth receives a message from space.",
    "A chef discovers their food can heal people's emotional wounds.",
    "A small town where everyone's dreams are connected.",
    "A person who can communicate with plants discovers they have urgent news about the future."
];

// Function to get random example prompt
function getRandomPrompt() {
    return examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
}

// Add example prompt button functionality
document.addEventListener('DOMContentLoaded', () => {
    // Add example button to the form
    const promptGroup = document.querySelector('.input-group');
    const exampleBtn = document.createElement('button');
    exampleBtn.type = 'button';
    exampleBtn.className = 'btn-secondary';
    exampleBtn.style.cssText = 'margin-top: 8px; padding: 8px 12px; font-size: 0.9rem;';
    exampleBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Get Example Prompt';
    exampleBtn.onclick = () => {
        document.getElementById('prompt').value = getRandomPrompt();
    };
    promptGroup.appendChild(exampleBtn);
});
