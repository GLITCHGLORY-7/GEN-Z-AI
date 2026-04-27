document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const micBtn = document.getElementById('mic-btn');
    const stopBtn = document.getElementById('stop-btn');
    const voiceOrb = document.querySelector('.voice-orb');
    const stateText = document.querySelector('.state-text');
    const stateSubtext = document.querySelector('.state-subtext');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const clearChatBtn = document.getElementById('clear-chat');
    
    const themeBtn = document.getElementById('theme-btn');
    
    // Quick Actions
    const actionCards = document.querySelectorAll('.action-card');
    
    // State Variables
    let isListening = false;
    let recognition = null;
    let synth = window.speechSynthesis;
    let chatMessages = []; // For LocalStorage

    // Load Theme and Chat History from LocalStorage
    initFeatures();

    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            updateState('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            handleUserMessage(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            updateState('idle');
            if (event.error === 'no-speech') {
                stateSubtext.textContent = "Didn't catch that. Please try again.";
            }
        };

        recognition.onend = () => {
            if (isListening && stateText.textContent === 'Listening...') {
                updateState('processing');
            }
        };
    } else {
        alert("Your browser does not support Web Speech API. Voice features won't work completely. Use text instead.");
    }

    // Initialize LocalStorage elements
    function initFeatures() {
        // Theme
        const savedTheme = localStorage.getItem('zenk_theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
            themeBtn.innerHTML = '<i class="fa-regular fa-moon" aria-hidden="true"></i>';
            themeBtn.setAttribute('aria-label', 'Toggle Dark Theme');
        } else {
            themeBtn.setAttribute('aria-label', 'Toggle Light Theme');
        }

        // Chat History
        const savedChat = localStorage.getItem('zenk_chat_history');
        if (savedChat) {
            try {
                chatMessages = JSON.parse(savedChat);
                // Re-render
                chatMessages.forEach(msg => {
                    renderChatElement(msg.role, msg.message, msg.actionObj, msg.timeStr);
                });
                scrollToBottom();
            } catch(e) {
                console.error("Could not parse chat history", e);
            }
        }
    }

    // Theme Toggle Handler
    themeBtn.addEventListener('click', toggleTheme);
    function toggleTheme() {
        if (document.body.classList.contains('light-theme')) {
            document.body.classList.remove('light-theme');
            themeBtn.innerHTML = '<i class="fa-regular fa-sun" aria-hidden="true"></i>';
            themeBtn.setAttribute('aria-label', 'Toggle Light Theme');
            localStorage.setItem('zenk_theme', 'dark');
        } else {
            document.body.classList.add('light-theme');
            themeBtn.innerHTML = '<i class="fa-regular fa-moon" aria-hidden="true"></i>';
            themeBtn.setAttribute('aria-label', 'Toggle Dark Theme');
            localStorage.setItem('zenk_theme', 'light');
        }
    }

    // State Management
    function updateState(newState) {
        // Reset classes
        voiceOrb.classList.remove('idle', 'listening', 'processing');
        
        switch(newState) {
            case 'idle':
                isListening = false;
                voiceOrb.classList.add('idle');
                stateText.textContent = "Hi, I'm ZEN K";
                stateSubtext.textContent = 'Say "Hey ZEN K" to start or click the mic';
                statusDot.style.backgroundColor = 'var(--text-muted)';
                statusDot.style.boxShadow = 'none';
                statusText.textContent = 'Idle';
                statusText.style.color = 'var(--text-muted)';
                micBtn.innerHTML = '<i class="fa-solid fa-microphone" aria-hidden="true"></i>';
                break;
            case 'listening':
                isListening = true;
                voiceOrb.classList.add('listening');
                stateText.textContent = "Listening...";
                stateSubtext.textContent = 'Speak your command clearly...';
                statusDot.style.backgroundColor = 'var(--accent-green)';
                statusDot.style.boxShadow = '0 0 10px var(--accent-green)';
                statusText.textContent = 'Listening...';
                statusText.style.color = 'var(--accent-green)';
                micBtn.innerHTML = '<i class="fa-solid fa-microphone-lines" aria-hidden="true"></i>';
                break;
            case 'processing':
                isListening = false;
                voiceOrb.classList.add('processing');
                stateText.textContent = "Processing...";
                stateSubtext.textContent = 'Hold on a second...';
                statusDot.style.backgroundColor = 'var(--accent-purple)';
                statusDot.style.boxShadow = '0 0 10px var(--accent-purple)';
                statusText.textContent = 'Processing...';
                statusText.style.color = 'var(--accent-purple)';
                break;
            case 'speaking':
                voiceOrb.classList.add('listening'); // Use listening visual for pulsing
                stateText.textContent = "Speaking...";
                statusDot.style.backgroundColor = 'var(--accent-blue)';
                statusDot.style.boxShadow = '0 0 10px var(--accent-blue)';
                statusText.textContent = 'Speaking...';
                statusText.style.color = 'var(--accent-blue)';
                break;
        }
    }

    // Action execution
    function handleUserMessage(text) {
        // Append user text
        appendChat('user', text);
        updateState('processing');
        
        // Parse command with small delay for visual feedback
        setTimeout(() => {
            parseCommand(text.toLowerCase());
        }, 1000);
    }
    
    function parseCommand(cmd) {
        let response = { text: "I'm not sure how to help with that right now.", actionDetails: null };
        
        if (cmd.includes('youtube')) {
            response.text = 'Opening YouTube...';
            response.actionDetails = {
                iconClass: 'fa-youtube', iconColor: '#ff0000',
                title: 'YouTube', subtitle: 'youtube.com', url: 'https://www.youtube.com'
            };
        }
        else if (cmd.includes('whatsapp')) {
            response.text = 'Opening WhatsApp...';
            response.actionDetails = {
                iconClass: 'fa-whatsapp', iconColor: '#25d366',
                title: 'WhatsApp Web', subtitle: 'web.whatsapp.com', url: 'https://web.whatsapp.com'
            };
        }
        else if (cmd.includes('search') || cmd.includes('google')) {
            let query = cmd.replace('search for', '').replace('search', '').replace('google', '').trim();
            if (query.startsWith('for ')) query = query.substring(4);
            const searchUrl = query ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : 'https://www.google.com';
            response.text = `Searching Google for ${query || 'something'}...`;
            response.actionDetails = {
                iconClass: 'fa-google', iconColor: '#4285f4',
                title: 'Google Search', subtitle: query || 'google.com', url: searchUrl
            };
        }
        else if (cmd.includes('time') || cmd.includes('clock')) {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            response.text = `The current time is ${timeString}.`;
        }
        else if (cmd.includes('weather')) {
            response.text = "It's 28°C and partial sunny today."; 
            response.actionDetails = {
                iconClass: 'fa-sun', iconColor: '#ffb300',
                title: '28°C', subtitle: 'Sunny'
            };
        }
        else if (cmd.includes('joke')) {
            const jokes = [
                "Why do programmers prefer dark mode? Because light attracts bugs.",
                "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
                "Why did the computer show up at work late? Because it had a hard drive.",
                "I would tell you a joke about UDP, but you might not get it."
            ];
            const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
            response.text = randomJoke;
            response.actionDetails = {
                iconClass: 'fa-face-laugh-squint', iconColor: 'var(--accent-purple)',
                title: 'Joke API', subtitle: 'Ha. Ha. Ha.'
            };
        }
        else if (cmd.includes('hello') || cmd.includes('hi') || cmd.includes('hey')) {
            response.text = "Hello! I'm ZEN K AI. How can I assist you today?";
        }
        
        // Output response
        respondToUser(response);
    }

    function respondToUser(responseObj) {
        updateState('speaking');
        
        // Add chat bubble
        appendChat('ai', responseObj.text, responseObj.actionDetails);
        
        // Speak using TTS
        speak(responseObj.text, () => {
            updateState('idle');
            // Execute action if it has a URL
            if (responseObj.actionDetails && responseObj.actionDetails.url) {
                window.open(responseObj.actionDetails.url, '_blank');
            }
        });
    }

    function speak(text, callback) {
        if (synth.speaking) {
            console.error('speechSynthesis.speaking');
            synth.cancel();
        }

        if (text !== '') {
            const utterThis = new SpeechSynthesisUtterance(text);
            stateSubtext.textContent = `"${text}"`;
            
            utterThis.onend = function (event) {
                if (callback) callback();
            };

            utterThis.onerror = function (event) {
                console.error('SpeechSynthesisUtterance.onerror');
                if (callback) callback();
            };

            const voices = synth.getVoices();
            const engVoices = voices.filter(v => v.lang.startsWith('en'));
            if(engVoices.length > 0) {
                 utterThis.voice = engVoices[0]; 
            }

            utterThis.pitch = 1;
            utterThis.rate = 1;
            synth.speak(utterThis);
        } else {
            if (callback) callback();
        }
    }

    // Chat UI Functions
    function appendChat(role, message, actionObj = null) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Cache to LocalStorage
        chatMessages.push({ role, message, actionObj, timeStr });
        if(chatMessages.length > 50) chatMessages.shift(); // Keep last 50
        localStorage.setItem('zenk_chat_history', JSON.stringify(chatMessages));

        renderChatElement(role, message, actionObj, timeStr);
        scrollToBottom();
    }

    function renderChatElement(role, message, actionObj, timeStr) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role}`;
        
        let htmlContent = '';
        
        if (role === 'ai') {
            htmlContent += `
                <div class="ai-icon-small" aria-hidden="true"><i class="fa-solid fa-brain"></i></div>
                <div class="msg-header">
                    <span>ZEN K AI</span>
                    <span>${timeStr}</span>
                </div>
                <div class="msg-bubble">
                    <p>${message}</p>
            `;
            
            if (actionObj) {
                htmlContent += `
                    <div class="action-embed" aria-label="Action Card: ${actionObj.title}">
                        <div class="embed-icon" style="background: rgba(128,128,128,0.1); color: ${actionObj.iconColor}" aria-hidden="true">
                            <i class="fa-brands ${actionObj.iconClass} fa-solid"></i>
                        </div>
                        <div class="details">
                            <h4>${actionObj.title}</h4>
                            <p>${actionObj.subtitle || ''}</p>
                        </div>
                        <i class="fa-solid fa-check status-check" aria-hidden="true"></i>
                    </div>
                `;
            }
            
            htmlContent += `</div>`;
        } else {
            // User role
            htmlContent += `
                <div class="msg-header">
                    <span>You</span>
                    <span>${timeStr}</span>
                </div>
                <div class="msg-bubble">${message}</div>
            `;
        }
        
        msgDiv.innerHTML = htmlContent;
        chatHistory.appendChild(msgDiv);
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Event Listeners
    micBtn.addEventListener('click', toggleMic);
    function toggleMic() {
        if (isListening) {
            if(recognition) recognition.stop();
            updateState('idle');
        } else {
            if(recognition) {
                try {
                    recognition.start();
                } catch(e) {
                    console.error("Recognition couldn't start", e);
                    recognition.stop();
                    setTimeout(() => recognition.start(), 300);
                }
            }
        }
    }

    stopBtn.addEventListener('click', stopAll);
    function stopAll() {
        if (recognition) recognition.stop();
        if (synth.speaking) synth.cancel();
        updateState('idle');
    }

    // Text Input Handling
    sendBtn.addEventListener('click', submitChat);
    function submitChat() {
        const text = chatInput.value.trim();
        if (text) {
            handleUserMessage(text);
            chatInput.value = '';
        }
    }

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitChat();
        }
    });

    clearChatBtn.addEventListener('click', clearHistory);
    function clearHistory() {
        chatHistory.innerHTML = '';
        chatMessages = [];
        localStorage.removeItem('zenk_chat_history');
    }

    // Quick Actions
    actionCards.forEach(card => {
        card.addEventListener('click', () => handleActionCard(card));
        
        // Accessibility for keyboard on action cards
        card.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleActionCard(card);
            }
        });
    });

    function handleActionCard(card) {
        const action = card.getAttribute('data-action');
        if (action) {
            let textCmd = '';
            if(action === 'youtube') textCmd = 'Open YouTube';
            else if(action === 'whatsapp') textCmd = 'Open WhatsApp';
            else if(action === 'google') textCmd = 'Search Google';
            else if(action === 'time') textCmd = 'What time is it?';
            else if(action === 'joke') textCmd = 'Tell me a joke';
            else if(action === 'reminder') textCmd = 'Set a reminder';
            
            if (textCmd) {
                handleUserMessage(textCmd);
            }
        }
    }

    // Load voices
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
          synth.getVoices();
      };
    }

    // Initial state
    updateState('idle');
});
