document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const themeToggle = document.getElementById('theme-toggle');
    const micBtn = document.getElementById('mic-btn');
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    const chatHistory = document.getElementById('chat-history');
    
    // Right Sidebar Elements
    const statusTitle = document.getElementById('status-title');
    const statusText = document.getElementById('status-text');
    const statusDot = document.querySelector('.status-dot');
    const avatarContainer = document.querySelector('.avatar-container');
    const memoryContent = document.getElementById('memory-content');
    
    // Buttons
    const suggestionBtns = document.querySelectorAll('.suggestion-btn');
    const actionBtns = document.querySelectorAll('.action-btn');
    const controlBtns = document.querySelectorAll('.control-btn');
    const menuItems = document.querySelectorAll('.menu-item');

    // --- State Variables ---
    let isListening = false;
    let recognition = null;
    let synth = window.speechSynthesis;
    let isProcessing = false;

    // --- Theme Management ---
    const currentTheme = localStorage.getItem('zenk_theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.replace('light-theme', 'dark-theme');
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    themeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('light-theme')) {
            document.body.classList.replace('light-theme', 'dark-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            localStorage.setItem('zenk_theme', 'dark');
        } else {
            document.body.classList.replace('dark-theme', 'light-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('zenk_theme', 'light');
        }
    });

    // --- Memory Initialization ---
    function loadMemories() {
        const savedMemory = localStorage.getItem('zenk_memory');
        if (savedMemory) {
            memoryContent.innerHTML = `<div class="memory-item">${savedMemory}</div>`;
        } else {
            memoryContent.innerHTML = `<p class="empty-text">No memories stored yet.</p>`;
        }
    }
    loadMemories();

    // --- App Management Initialization ---
    let availableApps = [
        { iconClass: 'fa-youtube', title: 'YouTube', subtitle: 'Video Platform', url: 'https://www.youtube.com' },
        { iconClass: 'fa-chrome', title: 'Browser', subtitle: 'Web Search', url: 'https://www.google.com' },
        { iconClass: 'fa-code', title: 'VS Code', subtitle: 'Code Editor', url: 'https://vscode.dev' },
        { iconClass: 'fa-note-sticky', title: 'Notepad', subtitle: 'Text Editor', actionType: 'note' }
    ];

    function loadApps() {
        const savedApps = localStorage.getItem('zenk_apps');
        if (savedApps) {
            availableApps = JSON.parse(savedApps);
        } else {
            saveApps();
        }
    }
    
    function saveApps() {
        localStorage.setItem('zenk_apps', JSON.stringify(availableApps));
    }
    loadApps();

    const appsModal = document.getElementById('apps-modal');
    const closeAppsModalBtn = document.getElementById('close-apps-modal');
    const appsListContainer = document.getElementById('apps-list-container');
    const addAppBtn = document.getElementById('add-app-btn');
    const newAppTitle = document.getElementById('new-app-title');
    const newAppUrl = document.getElementById('new-app-url');

    window.openAppsModal = () => {
        appsModal.classList.add('active');
        renderAppsList();
    };

    closeAppsModalBtn.addEventListener('click', () => {
        appsModal.classList.remove('active');
    });

    function renderAppsList() {
        appsListContainer.innerHTML = '';
        availableApps.forEach((app, index) => {
            const div = document.createElement('div');
            div.className = 'app-edit-item';
            div.innerHTML = `
                <div class="app-edit-item-info">
                    <span>${app.title}</span>
                    <small>${app.url || app.subtitle}</small>
                </div>
                <button onclick="window.removeApp(${index})"><i class="fa-solid fa-trash"></i></button>
            `;
            appsListContainer.appendChild(div);
        });
    }

    window.removeApp = (index) => {
        availableApps.splice(index, 1);
        saveApps();
        renderAppsList();
    };

    addAppBtn.addEventListener('click', () => {
        const title = newAppTitle.value.trim();
        const url = newAppUrl.value.trim();
        if (title && url) {
            // Add a smart icon detection or default to globe
            let icon = 'fa-globe';
            if (url.includes('youtube')) icon = 'fa-youtube';
            else if (url.includes('google')) icon = 'fa-google';
            else if (url.includes('github')) icon = 'fa-github';
            
            availableApps.push({
                iconClass: icon,
                title: title,
                subtitle: 'Web App',
                url: url
            });
            saveApps();
            renderAppsList();
            newAppTitle.value = '';
            newAppUrl.value = '';
        }
    });

    // --- Boot Sequence ---
    setTimeout(() => {
        appendChat('ai', "Hello, I am ZEN K AI. How can I assist you today?");
    }, 500);

    // --- Speech Recognition ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => updateState('listening');
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            handleUserMessage(transcript);
        };

        recognition.onerror = (event) => {
            updateState('idle');
            if (event.error === 'no-speech') {
                statusText.textContent = "Didn't hear anything. Try again.";
            } else {
                statusText.textContent = "Voice recognition error.";
            }
        };

        recognition.onend = () => {
            if (isListening && !isProcessing) {
                updateState('idle');
            }
        };
    } else {
        micBtn.style.display = 'none';
        console.warn("Speech recognition not supported in this browser.");
    }

    // --- State Management ---
    function updateState(newState) {
        // Reset classes
        statusDot.className = 'status-dot';
        avatarContainer.classList.remove('listening');
        micBtn.classList.remove('listening');
        isListening = false;
        isProcessing = false;
        
        switch(newState) {
            case 'idle':
                statusTitle.textContent = "Ready";
                statusText.textContent = "Ready to assist you";
                statusDot.classList.add('online');
                break;
            case 'listening':
                isListening = true;
                statusTitle.textContent = "Listening";
                statusText.textContent = "Waiting for audio...";
                statusDot.classList.add('listening');
                avatarContainer.classList.add('listening');
                micBtn.classList.add('listening');
                break;
            case 'processing':
                isProcessing = true;
                statusTitle.textContent = "Processing";
                statusText.textContent = "Thinking about that...";
                statusDot.classList.add('processing');
                break;
            case 'speaking':
                statusTitle.textContent = "Responding";
                statusText.textContent = "Speaking...";
                statusDot.classList.add('online');
                avatarContainer.classList.add('listening');
                break;
        }
    }

    // --- Interactions ---
    function handleUserMessage(text) {
        if (!text.trim()) return;
        
        appendChat('user', text);
        chatInput.value = '';
        updateState('processing');
        
        // Simulate thinking delay
        setTimeout(() => parseCommand(text.toLowerCase()), 800);
    }
    
    function parseCommand(cmd) {
        let response = { text: "I'm not sure how to respond to that.", actionDetails: null };
        
        if (cmd.includes('app') || cmd.includes('application')) {
            response.text = "Here are your available applications. Click to open:";
            response.actionDetails = [
                ...availableApps,
                { iconClass: 'fa-plus', title: 'Manage Apps', subtitle: 'Add or remove apps', actionType: 'manageApps' }
            ];
        }
        else if (cmd.includes('setting') || cmd.includes('option')) {
            response.text = "Here are your settings options:";
            response.actionDetails = [
                { iconClass: 'fa-moon', title: 'Toggle Theme', subtitle: 'Switch Light/Dark mode', actionType: 'theme' },
                { iconClass: 'fa-trash', title: 'Clear Memory', subtitle: 'Erase all saved memories', actionType: 'clearMemory' }
            ];
        }
        else if (cmd.includes('youtube')) {
            response.text = 'Opening YouTube...';
            response.actionDetails = { iconClass: 'fa-youtube', title: 'YouTube', subtitle: 'Video Platform', url: 'https://www.youtube.com' };
        }
        else if (cmd.includes('search')) {
            const query = cmd.replace('search for', '').replace('search', '').trim();
            if (query) {
                response.text = `Searching for "${query}"...`;
                response.actionDetails = { iconClass: 'fa-google', title: 'Google Search', subtitle: query, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` };
            } else {
                response.text = "What would you like me to search for?";
            }
        }
        else if (cmd.includes('chrome') || cmd.includes('browser') || cmd.includes('google')) {
            response.text = 'Opening browser...';
            response.actionDetails = { iconClass: 'fa-chrome', title: 'Browser', subtitle: 'New Tab', url: 'https://www.google.com' };
        }
        else if (cmd.includes('vs code') || cmd.includes('vscode')) {
            response.text = 'Opening VS Code...';
            response.actionDetails = { iconClass: 'fa-code', title: 'VS Code', subtitle: 'Editor' };
        }
        else if (cmd.includes('notepad') || cmd.includes('note')) {
            response.text = 'Opening Notes...';
            response.actionDetails = { iconClass: 'fa-note-sticky', title: 'Notepad', subtitle: 'Text Editor' };
        }
        else if (cmd.includes('time') || cmd.includes('clock')) {
            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            response.text = `The current time is ${timeString}.`;
        }
        else if (cmd.includes('date')) {
            const dateString = new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            response.text = `Today is ${dateString}.`;
        }
        else if (cmd.includes('weather')) {
            response.text = "It's currently 24°C and partly cloudy."; 
        }
        else if (cmd.includes('system')) {
            response.text = "All systems operational. CPU load is 12%, Memory usage is 45%."; 
        }
        else if (cmd.includes('remind')) {
            response.text = "I've set a reminder for you."; 
        }
        else if (cmd.includes('joke')) {
            const jokes = [
                "Why do programmers prefer dark mode? Because light attracts bugs.",
                "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
                "There are 10 types of people in the world: those who understand binary, and those who don't."
            ];
            response.text = jokes[Math.floor(Math.random() * jokes.length)];
        }
        else if (cmd.includes('news')) {
            response.text = "Here are the top headlines for today. AI continues to evolve rapidly, and space exploration hits new milestones.";
        }
        else if (cmd.includes('motivate')) {
            response.text = "You are doing great! Keep pushing forward. Small steps every day lead to massive results.";
        }
        else if (cmd.includes('can you do')) {
            response.text = "I can chat, search the web, open apps, check the time and weather, remember things, and tell jokes. Just ask!";
        }
        else if (cmd.includes('remember')) {
            let memoryQuery = cmd.replace('remember that', '').replace('remember', '').trim();
            if (memoryQuery) {
                localStorage.setItem('zenk_memory', memoryQuery);
                loadMemories(); // Update right panel immediately
                response.text = "Got it. I'll remember that.";
            } else {
                response.text = "What would you like me to remember?";
            }
        }
        else if (cmd.includes('what did i say') || cmd.includes('what do you remember')) {
            const savedMemory = localStorage.getItem('zenk_memory');
            if (savedMemory) {
                response.text = `You asked me to remember: ${savedMemory}.`;
            } else {
                response.text = "I don't have anything saved in my memory right now.";
            }
        }
        else if (cmd.includes('hello') || cmd.includes('hi') || cmd.includes('hey')) {
            response.text = "Hello! How can I help you today?";
        }
        else if (cmd.includes('thank')) {
            response.text = "You're welcome! Let me know if you need anything else.";
        }
        
        respondToUser(response);
    }

    function respondToUser(responseObj) {
        updateState('speaking');
        appendChat('ai', responseObj.text, responseObj.actionDetails);
        
        speak(responseObj.text, () => {
            updateState('idle');
        });
    }

    function speak(text, callback) {
        if (synth.speaking) synth.cancel();

        if (text !== '') {
            const utterThis = new SpeechSynthesisUtterance(text);
            
            utterThis.onend = () => { if (callback) callback(); };
            utterThis.onerror = () => { if (callback) callback(); };

            const voices = synth.getVoices();
            const engVoices = voices.filter(v => v.lang.startsWith('en'));
            
            const preferredVoice = engVoices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Female'));
            if (preferredVoice) {
                utterThis.voice = preferredVoice;
            } else if (engVoices.length > 0) {
                utterThis.voice = engVoices[0];
            }

            utterThis.pitch = 1.0;
            utterThis.rate = 1.0;
            synth.speak(utterThis);
        } else {
            if (callback) callback();
        }
    }

    // --- Chat UI ---
    function appendChat(role, message, actionObj = null) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${role}`;
        
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let htmlContent = `
            <div class="msg-bubble">${message}</div>
            <div class="msg-time">${timeString}</div>
        `;
        
        if (role === 'ai' && actionObj) {
            let embedsHtml = '';
            const actions = Array.isArray(actionObj) ? actionObj : [actionObj];
            
            actions.forEach(act => {
                let clickAction = '';
                if (act.url) {
                    clickAction = `if('${act.url}') window.open('${act.url}', '_blank')`;
                } else if (act.actionType === 'theme') {
                    clickAction = `document.getElementById('theme-toggle').click()`;
                } else if (act.actionType === 'clearMemory') {
                    clickAction = `localStorage.removeItem('zenk_memory'); document.getElementById('memory-content').innerHTML = '<p class=\\'empty-text\\'>No memories stored yet.</p>';`;
                } else if (act.actionType === 'note') {
                    clickAction = `alert('Notepad opened')`;
                } else if (act.actionType === 'manageApps') {
                    clickAction = `window.openAppsModal()`;
                }
                
                // Allow using both fa-brands and fa-solid depending on the icon
                const iconPrefix = (act.iconClass === 'fa-youtube' || act.iconClass === 'fa-chrome' || act.iconClass === 'fa-google' || act.iconClass === 'fa-github') ? 'fa-brands' : 'fa-solid';
                
                embedsHtml += `
                    <div class="action-embed" onclick="${clickAction}">
                        <div class="embed-icon"><i class="${iconPrefix} ${act.iconClass}"></i></div>
                        <div class="details">
                            <h4>${act.title}</h4>
                            <p>${act.subtitle || ''}</p>
                        </div>
                    </div>
                `;
            });
            
            htmlContent = `
                <div class="msg-bubble">
                    ${message}
                    ${embedsHtml}
                </div>
                <div class="msg-time">${timeString}</div>
            `;
        }
        
        msgDiv.innerHTML = htmlContent;
        chatHistory.appendChild(msgDiv);
        chatHistory.parentElement.scrollTop = chatHistory.parentElement.scrollHeight;
    }

    // --- Event Listeners ---
    micBtn.addEventListener('click', () => {
        if (isListening) {
            if(recognition) recognition.stop();
            updateState('idle');
        } else {
            if(recognition) {
                try { 
                    recognition.start(); 
                } catch(e) { 
                    recognition.stop(); 
                    setTimeout(() => recognition.start(), 300); 
                }
            }
        }
    });

    sendBtn.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (text) {
            handleUserMessage(text);
        }
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });

    // Suggestion & Action Buttons
    const handleButtonClick = (e) => {
        const query = e.currentTarget.getAttribute('data-query');
        if (query) {
            handleUserMessage(query);
        }
    };

    suggestionBtns.forEach(btn => btn.addEventListener('click', handleButtonClick));
    actionBtns.forEach(btn => btn.addEventListener('click', handleButtonClick));

    // System Control Buttons
    controlBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.currentTarget.getAttribute('data-action');
            handleUserMessage(`Execute system ${action}`);
        });
    });

    // Menu active state logic and interactions
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(m => m.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const itemId = e.currentTarget.id;
            if (itemId === 'menu-apps') {
                handleUserMessage('Show my apps');
            } else if (itemId === 'menu-settings') {
                handleUserMessage('Open settings');
            } else if (itemId === 'menu-reminders') {
                handleUserMessage('Show my reminders');
            } else if (itemId === 'menu-notes') {
                handleUserMessage('Open notes');
            }
        });
    });

    // Ensure voices are loaded
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => synth.getVoices();
    }
});
