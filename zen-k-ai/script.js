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

    // --- NVIDIA NIM API ---
    const NVIDIA_API_KEY = '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';
    const NVIDIA_MODEL   = 'meta/llama-3.1-8b-instruct';
    const NVIDIA_URL     = 'https://corsproxy.io/?https://integrate.api.nvidia.com/v1/chat/completions';
    const SYSTEM_PROMPT  = `You are ZEN K AI, a sleek and intelligent personal assistant embedded in a modern web application.
You are helpful, concise, and friendly. Keep replies under 3 sentences unless the user asks for more detail.
Avoid markdown formatting — respond in plain conversational text.`;
    let conversationHistory = [{ role: 'system', content: SYSTEM_PROMPT }];

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

    // --- Notes System ---
    let notes = JSON.parse(localStorage.getItem('zenk_notes') || '[]');

    function saveNotes() { localStorage.setItem('zenk_notes', JSON.stringify(notes)); }

    function renderNotesList() {
        const c = document.getElementById('notes-list-container');
        if (!notes.length) {
            c.innerHTML = '<p class="empty-text">No notes yet. Say "Take a note [content]".</p>';
            return;
        }
        c.innerHTML = notes.map((n, i) => `
            <div class="note-item">
                <div class="note-item-content"><p>${n.content}</p><small>${new Date(n.ts).toLocaleString()}</small></div>
                <button onclick="window.removeNote(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>`).join('');
    }

    window.removeNote = (i) => { notes.splice(i, 1); saveNotes(); renderNotesList(); };

    window.openNotesModal = () => {
        document.getElementById('notes-modal').classList.add('active');
        renderNotesList();
    };
    document.getElementById('close-notes-modal').addEventListener('click', () =>
        document.getElementById('notes-modal').classList.remove('active'));

    document.getElementById('add-note-btn').addEventListener('click', () => {
        const txt = document.getElementById('new-note-content').value.trim();
        if (txt) {
            notes.push({ content: txt, ts: Date.now() });
            saveNotes(); renderNotesList();
            document.getElementById('new-note-content').value = '';
        }
    });

    function addNoteByVoice(content) {
        notes.push({ content, ts: Date.now() });
        saveNotes();
    }

    // --- Reminders System ---
    let reminders = JSON.parse(localStorage.getItem('zenk_reminders') || '[]');

    function saveReminders() { localStorage.setItem('zenk_reminders', JSON.stringify(reminders)); }

    function renderRemindersList() {
        const c = document.getElementById('reminders-list-container');
        const active = reminders.filter(r => !r.triggered);
        if (!active.length) {
            c.innerHTML = '<p class="empty-text">No active reminders. Say "Remind me in 5 minutes to [task]".</p>';
            return;
        }
        c.innerHTML = active.map(r => `
            <div class="reminder-item">
                <div class="reminder-item-content"><p>${r.task}</p><small>${new Date(r.triggerTime).toLocaleString()}</small></div>
                <button onclick="window.removeReminder(${r.id})"><i class="fa-solid fa-trash"></i></button>
            </div>`).join('');
    }

    window.removeReminder = (id) => {
        const idx = reminders.findIndex(r => r.id === id);
        if (idx !== -1) { reminders.splice(idx, 1); saveReminders(); renderRemindersList(); }
    };

    window.openRemindersModal = () => {
        document.getElementById('reminders-modal').classList.add('active');
        renderRemindersList();
    };
    document.getElementById('close-reminders-modal').addEventListener('click', () =>
        document.getElementById('reminders-modal').classList.remove('active'));

    function showReminderToast(msg) {
        document.getElementById('toast-message').textContent = msg;
        const t = document.getElementById('reminder-toast');
        t.classList.add('active');
        setTimeout(() => t.classList.remove('active'), 9000);
    }
    document.getElementById('toast-close').addEventListener('click', () =>
        document.getElementById('reminder-toast').classList.remove('active'));

    function scheduleReminder(reminder) {
        const delay = reminder.triggerTime - Date.now();
        if (delay > 0 && delay < 86400000) {
            setTimeout(() => {
                const r = reminders.find(x => x.id === reminder.id);
                if (r && !r.triggered) {
                    r.triggered = true; saveReminders();
                    showReminderToast(r.task);
                    speak('Reminder: ' + r.task, () => {});
                }
            }, delay);
        }
    }

    function addReminder(task, triggerTime) {
        const r = { id: Date.now(), task, triggerTime, triggered: false };
        reminders.push(r); saveReminders(); scheduleReminder(r);
        return r;
    }

    // Re-schedule pending reminders on load
    reminders.filter(r => !r.triggered).forEach(scheduleReminder);

    document.getElementById('add-reminder-btn').addEventListener('click', () => {
        const task = document.getElementById('new-reminder-task').value.trim();
        const timeVal = document.getElementById('new-reminder-time').value;
        if (task && timeVal) {
            const triggerTime = new Date(timeVal).getTime();
            if (triggerTime > Date.now()) {
                addReminder(task, triggerTime);
                renderRemindersList();
                document.getElementById('new-reminder-task').value = '';
                document.getElementById('new-reminder-time').value = '';
                appendChat('ai', `✅ Reminder set: "${task}" at ${new Date(triggerTime).toLocaleString()}`);
            } else {
                appendChat('ai', 'That time has already passed. Please pick a future time.');
            }
        }
    });

    // Parse "remind me in X minutes/hours to TASK"
    function parseVoiceReminder(cmd) {
        const inRx = /remind.*?in\s+(\d+)\s*(second|seconds|sec|minute|minutes|min|hour|hours|hr)\w*\s+(?:to\s+)?(.+)/i;
        const m = cmd.match(inRx);
        if (m) {
            const amt = parseInt(m[1]);
            const unit = m[2].toLowerCase();
            const task = m[3].trim();
            let ms = amt * 60000;
            if (unit.startsWith('sec')) ms = amt * 1000;
            if (unit.startsWith('hour') || unit === 'hr') ms = amt * 3600000;
            return { task, triggerTime: Date.now() + ms, label: `${amt} ${unit}(s)` };
        }
        const atRx = /remind.*?at\s+([\d:]+\s*(?:am|pm)?)\s+(?:to\s+)?(.+)/i;
        const m2 = cmd.match(atRx);
        if (m2) {
            const task = m2[2].trim();
            const tMatch = m2[1].match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
            if (tMatch) {
                let h = parseInt(tMatch[1]), mins = parseInt(tMatch[2] || '0');
                const per = (tMatch[3] || '').toLowerCase();
                if (per === 'pm' && h !== 12) h += 12;
                if (per === 'am' && h === 12) h = 0;
                const t = new Date(); t.setHours(h, mins, 0, 0);
                if (t.getTime() <= Date.now()) t.setDate(t.getDate() + 1);
                return { task, triggerTime: t.getTime(), label: m2[1] };
            }
        }
        return null;
    }

    // --- Shutdown Overlay ---
    const shutdownOverlay = document.createElement('div');
    shutdownOverlay.className = 'shutdown-overlay';
    shutdownOverlay.innerHTML = '<i class="fa-solid fa-power-off"></i><p>SHUTTING DOWN…</p>';
    document.body.appendChild(shutdownOverlay);

    function doShutdown() {
        if (synth.speaking) synth.cancel();
        if (typeof stopMicStream === 'function') stopMicStream();
        shutdownOverlay.classList.add('active');
        setTimeout(() => window.close(), 3000);
    }

    // Lock screen overlay
    const lockOverlay = document.createElement('div');
    lockOverlay.className = 'shutdown-overlay lock-overlay';
    lockOverlay.innerHTML = '<i class="fa-solid fa-lock"></i><p>SCREEN LOCKED — Click to unlock</p>';
    lockOverlay.style.cursor = 'pointer';
    lockOverlay.addEventListener('click', () => lockOverlay.classList.remove('active'));
    document.body.appendChild(lockOverlay);

    function showLockScreen() {
        lockOverlay.classList.add('active');
    }

    // Sleep screen overlay
    const sleepOverlay = document.createElement('div');
    sleepOverlay.className = 'shutdown-overlay sleep-overlay';
    sleepOverlay.innerHTML = '<i class="fa-solid fa-moon" style="color:#8b5cf6"></i><p>SLEEP MODE — Click to wake</p>';
    sleepOverlay.style.cursor = 'pointer';
    sleepOverlay.style.background = 'rgba(0,0,0,0.96)';
    sleepOverlay.addEventListener('click', () => sleepOverlay.classList.remove('active'));
    document.body.appendChild(sleepOverlay);

    function showSleepScreen() {
        sleepOverlay.classList.add('active');
    }

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
    async function handleUserMessage(text) {
        if (!text.trim() || isProcessing) return;
        isProcessing = true;

        appendChat('user', text);
        chatInput.value = '';
        updateState('processing');

        const cmd = text.toLowerCase();

        // ── 1. Check local commands first (fast, no network) ──
        const local = checkLocalCommand(cmd, text);
        if (local) {
            isProcessing = false;
            respondToUser(local, local._shutdown || false);
            return;
        }

        // ── 2. Real AI via NVIDIA NIM (streaming) ──
        conversationHistory.push({ role: 'user', content: text });
        try {
            const aiText = await streamNvidiaResponse();
            conversationHistory.push({ role: 'assistant', content: aiText });
            // trim history to last 20 turns to stay within context window
            if (conversationHistory.length > 22) conversationHistory.splice(1, 2);
        } catch (err) {
            console.error('NVIDIA API error:', err);
            const msg = err.message || 'Unknown error';
            appendChat('ai', `⚠️ AI error: ${msg}`);
            updateState('idle');
        }
        isProcessing = false;
    }

    // --- Local command handler (returns response obj or null) ---
    function checkLocalCommand(cmd, originalText) {
        // SHUTDOWN
        if (/\b(turn off|shutdown|shut down|power off|close everything|goodbye|bye bye)\b/.test(cmd))
            return { text: 'Shutting down ZEN K AI. Goodbye!', _shutdown: true };

        // ADD APP BY VOICE
        if (/add\s+(?:app|application)/.test(cmd)) {
            const urlMatch = cmd.match(/https?:\/\/[^\s]+/);
            const nameRaw  = cmd.replace(/add\s+(?:app|application)/i,'').replace(/https?:\/\/[^\s]+/,'').trim();
            if (urlMatch && nameRaw) {
                const url = urlMatch[0];
                let icon = 'fa-globe';
                if (url.includes('youtube')) icon = 'fa-youtube';
                else if (url.includes('google')) icon = 'fa-google';
                else if (url.includes('github')) icon = 'fa-github';
                availableApps.push({ iconClass: icon, title: nameRaw, subtitle: 'Web App', url });
                saveApps();
                return { text: `✅ App "${nameRaw}" added! Say "open apps" to see it.` };
            }
            return { text: 'Say the app name and URL. Example: "Add app Netflix https://netflix.com"' };
        }

        // SHOW APPS
        if (/\b(show|open|my)\b.*\bapp/.test(cmd) || cmd === 'show my apps')
            return { text: 'Here are your available applications. Click to open:', actionDetails: [...availableApps, { iconClass:'fa-plus', title:'Manage Apps', subtitle:'Add or remove apps', actionType:'manageApps' }] };

        // TAKE A NOTE
        if (/\b(take a note|add note|note down|jot down|write down)\b/.test(cmd)) {
            const content = cmd.replace(/take a note|add note|note down|jot down|write down/gi,'').trim();
            if (content) { addNoteByVoice(content); return { text: `📝 Note saved: "${content}". Say "show notes" to view all.` }; }
            return { text: 'What would you like me to note down?' };
        }

        // SHOW NOTES
        if (/\b(show|open|view|my)\b.*\bnote/.test(cmd)) {
            window.openNotesModal();
            return { text: `Opening notes panel. You have ${notes.length} note(s).` };
        }

        // SHOW REMINDERS  ← must be before the generic 'remind' check
        if (/\b(show|open|view|my)\b.*\breminder/.test(cmd) || cmd.trim() === 'show reminders') {
            window.openRemindersModal();
            return { text: `Opening reminders. ${reminders.filter(r=>!r.triggered).length} active reminder(s).` };
        }

        // SET REMINDER BY VOICE
        if (cmd.includes('remind')) {
            const parsed = parseVoiceReminder(cmd);
            if (parsed) {
                addReminder(parsed.task, parsed.triggerTime);
                return { text: `⏰ Reminder set: "${parsed.task}" — in ${parsed.label}. I'll notify you!` };
            }
            return { text: 'Try: "Remind me in 5 minutes to call John" or "Remind me at 3pm to take medicine".' };
        }

        // SYSTEM CONTROLS (sidebar buttons send "Execute system lock/sleep/restart/shutdown")
        if (cmd.includes('execute system') || /\b(lock|sleep mode|restart|reboot)\b/.test(cmd)) {
            if (cmd.includes('lock')) {
                showLockScreen();
                return { text: 'Screen locked. Click anywhere to unlock.' };
            }
            if (cmd.includes('sleep')) {
                showSleepScreen();
                return { text: 'Sleep mode activated. Click anywhere to wake up.' };
            }
            if (cmd.includes('restart') || cmd.includes('reboot')) {
                setTimeout(() => window.location.reload(), 2000);
                return { text: 'Restarting ZEN K AI...' };
            }
            if (cmd.includes('shutdown')) {
                return { text: 'Shutting down ZEN K AI. Goodbye!', _shutdown: true };
            }
        }

        // SETTINGS
        if (cmd.includes('setting') || cmd.includes('open settings'))
            return { text: 'Here are your settings options:', actionDetails: [
                { iconClass:'fa-moon', title:'Toggle Theme', subtitle:'Switch Light/Dark mode', actionType:'theme' },
                { iconClass:'fa-trash', title:'Clear Memory', subtitle:'Erase all saved memories', actionType:'clearMemory' }
            ]};

        // TIME / DATE  (fast local, no need for AI)
        if (/\b(time|clock)\b/.test(cmd))
            return { text: `The current time is ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}.` };
        if (/\bdate\b/.test(cmd))
            return { text: `Today is ${new Date().toLocaleDateString([],{weekday:'long',year:'numeric',month:'long',day:'numeric'})}.` };

        // REMEMBER
        if (cmd.includes('remember')) {
            const mem = cmd.replace('remember that','').replace('remember','').trim();
            if (mem) { localStorage.setItem('zenk_memory', mem); loadMemories(); return { text: "Got it. I'll remember that." }; }
        }
        if (/what did i say|what do you remember/.test(cmd)) {
            const m = localStorage.getItem('zenk_memory');
            return { text: m ? `You asked me to remember: ${m}.` : "I don't have anything in memory yet." };
        }

        // OPEN SPECIFIC URLS
        if (cmd.includes('youtube'))
            return { text:'Opening YouTube...', actionDetails:{ iconClass:'fa-youtube', title:'YouTube', subtitle:'Video Platform', url:'https://www.youtube.com' }};
        if (cmd.includes('vscode') || cmd.includes('vs code'))
            return { text:'Opening VS Code...', actionDetails:{ iconClass:'fa-code', title:'VS Code', subtitle:'Editor', url:'https://vscode.dev' }};

        // SEARCH
        if (cmd.includes('search')) {
            const q = cmd.replace(/search for|search/g,'').trim();
            if (q) return { text:`Searching for "${q}"...`, actionDetails:{ iconClass:'fa-google', title:'Google Search', subtitle:q, url:`https://www.google.com/search?q=${encodeURIComponent(q)}` }};
        }

        return null;  // ← hand off to NVIDIA AI
    }

    // --- NVIDIA NIM API (non-streaming + word-reveal animation) ---
    async function streamNvidiaResponse() {

        // ── Fetch from NVIDIA NIM (non-streaming for reliability) ──
        let res;
        try {
            res = await fetch(NVIDIA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${NVIDIA_API_KEY}`
                },
                body: JSON.stringify({
                    model: NVIDIA_MODEL,
                    messages: conversationHistory,
                    max_tokens: 1024,
                    temperature: 0.7,
                    stream: false
                })
            });
        } catch (networkErr) {
            throw new Error(`Network error — ${networkErr.message}. Make sure you are connected to the internet.`);
        }

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`API returned ${res.status}: ${body.slice(0, 200)}`);
        }

        const json = await res.json();
        const fullText = json.choices?.[0]?.message?.content?.trim() || 'I received an empty response. Please try again.';

        // ── Create animated chat bubble ──
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg ai';
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble streaming';
        bubble.textContent = '▋';
        const timeEl = document.createElement('div');
        timeEl.className = 'msg-time';
        timeEl.textContent = timeString;
        msgDiv.appendChild(bubble);
        msgDiv.appendChild(timeEl);
        chatHistory.appendChild(msgDiv);
        chatHistory.parentElement.scrollTop = chatHistory.parentElement.scrollHeight;

        updateState('speaking');

        // ── Word-by-word reveal (ChatGPT-like typing effect) ──
        const words = fullText.split(' ');
        let revealed = '';
        for (let i = 0; i < words.length; i++) {
            revealed += (i === 0 ? '' : ' ') + words[i];
            bubble.textContent = revealed + ' ▋';
            chatHistory.parentElement.scrollTop = chatHistory.parentElement.scrollHeight;
            await new Promise(r => setTimeout(r, 28)); // ~35 words/sec
        }
        bubble.textContent = fullText;
        bubble.classList.remove('streaming');

        speak(fullText, () => updateState('idle'));
        return fullText;
    }


    function respondToUser(responseObj, shutdown = false) {
        updateState('speaking');
        appendChat('ai', responseObj.text, responseObj.actionDetails);

        speak(responseObj.text, () => {
            updateState('idle');
            if (shutdown) doShutdown();
        });
    }
    
    function parseCommand(cmd) {
        let response = { text: "I'm not sure how to respond to that.", actionDetails: null };
        let shutdownRequested = false;

        // ── SHUTDOWN / TURN OFF ──────────────────────────────────────
        if (/\b(turn off|shutdown|shut down|power off|close everything|goodbye|bye bye)\b/.test(cmd)) {
            response.text = 'Shutting down ZEN K AI. Goodbye!';
            shutdownRequested = true;
        }
        // ── ADD APP BY VOICE: "add app Netflix https://netflix.com" ──
        else if (/add\s+(?:app|application)/.test(cmd)) {
            const urlMatch = cmd.match(/https?:\/\/[^\s]+/);
            const nameMatch = cmd.replace(/add\s+(?:app|application)/i, '').replace(/https?:\/\/[^\s]+/, '').trim();
            if (urlMatch && nameMatch) {
                const name = nameMatch.trim();
                const url  = urlMatch[0];
                let icon = 'fa-globe';
                if (url.includes('youtube')) icon = 'fa-youtube';
                else if (url.includes('google')) icon = 'fa-google';
                else if (url.includes('github')) icon = 'fa-github';
                availableApps.push({ iconClass: icon, title: name, subtitle: 'Web App', url });
                saveApps();
                response.text = `✅ App "${name}" added! Say "open apps" to see it.`;
            } else {
                response.text = 'Please say the app name and URL. For example: "Add app Netflix https://netflix.com"';
            }
        }
        // ── SHOW APPS ────────────────────────────────────────────────
        else if (/\b(show|open|my)\b.*\bapp/.test(cmd) || cmd.includes('application')) {
            response.text = 'Here are your available applications. Click to open:';
            response.actionDetails = [
                ...availableApps,
                { iconClass: 'fa-plus', title: 'Manage Apps', subtitle: 'Add or remove apps', actionType: 'manageApps' }
            ];
        }
        // ── TAKE A NOTE ──────────────────────────────────────────────
        else if (/\b(take a note|add note|note down|jot down|write down)\b/.test(cmd)) {
            let content = cmd
                .replace(/take a note|add note|note down|jot down|write down/gi, '')
                .trim();
            if (content) {
                addNoteByVoice(content);
                response.text = `📝 Note saved: "${content}". Say "show notes" to view all notes.`;
            } else {
                response.text = 'What would you like me to note down?';
            }
        }
        // ── SHOW NOTES ───────────────────────────────────────────────
        else if (/\b(show|open|view|my)\b.*\bnote/.test(cmd)) {
            window.openNotesModal();
            response.text = `You have ${notes.length} note(s). Opening notes panel.`;
        }
        // ── SET REMINDER BY VOICE ────────────────────────────────────
        else if (cmd.includes('remind')) {
            const parsed = parseVoiceReminder(cmd);
            if (parsed) {
                addReminder(parsed.task, parsed.triggerTime);
                response.text = `⏰ Reminder set: "${parsed.task}" — in ${parsed.label}. I'll notify you!`;
            } else {
                response.text = 'To set a reminder say: "Remind me in 5 minutes to call John" or "Remind me at 3pm to take medicine".';
            }
        }
        // ── SHOW REMINDERS ───────────────────────────────────────────
        else if (/\b(show|open|view|my)\b.*\breminder/.test(cmd)) {
            window.openRemindersModal();
            const active = reminders.filter(r => !r.triggered).length;
            response.text = `You have ${active} active reminder(s). Opening reminders panel.`;
        }
        // ── SETTINGS ────────────────────────────────────────────────
        else if (cmd.includes('setting') || cmd.includes('option')) {
            response.text = 'Here are your settings options:';
            response.actionDetails = [
                { iconClass: 'fa-moon', title: 'Toggle Theme', subtitle: 'Switch Light/Dark mode', actionType: 'theme' },
                { iconClass: 'fa-trash', title: 'Clear Memory', subtitle: 'Erase all saved memories', actionType: 'clearMemory' }
            ];
        }
        // ── OPEN SPECIFIC SITES ──────────────────────────────────────
        else if (cmd.includes('youtube')) {
            response.text = 'Opening YouTube...';
            response.actionDetails = { iconClass: 'fa-youtube', title: 'YouTube', subtitle: 'Video Platform', url: 'https://www.youtube.com' };
        }
        else if (cmd.includes('search')) {
            const query = cmd.replace(/search for|search/g, '').trim();
            if (query) {
                response.text = `Searching for "${query}"...`;
                response.actionDetails = { iconClass: 'fa-google', title: 'Google Search', subtitle: query, url: `https://www.google.com/search?q=${encodeURIComponent(query)}` };
            } else {
                response.text = 'What would you like me to search for?';
            }
        }
        else if (cmd.includes('chrome') || cmd.includes('browser') || cmd.includes('google')) {
            response.text = 'Opening browser...';
            response.actionDetails = { iconClass: 'fa-chrome', title: 'Browser', subtitle: 'New Tab', url: 'https://www.google.com' };
        }
        else if (cmd.includes('vs code') || cmd.includes('vscode')) {
            response.text = 'Opening VS Code...';
            response.actionDetails = { iconClass: 'fa-code', title: 'VS Code', subtitle: 'Editor', url: 'https://vscode.dev' };
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
            response.text = 'All systems operational. CPU load is 12%, Memory usage is 45%.';
        }
        else if (cmd.includes('joke')) {
            const jokes = [
                'Why do programmers prefer dark mode? Because light attracts bugs.',
                "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
                "There are 10 types of people in the world: those who understand binary, and those who don't."
            ];
            response.text = jokes[Math.floor(Math.random() * jokes.length)];
        }
        else if (cmd.includes('news')) {
            response.text = 'Here are the top headlines for today. AI continues to evolve rapidly, and space exploration hits new milestones.';
        }
        else if (cmd.includes('motivate')) {
            response.text = 'You are doing great! Keep pushing forward. Small steps every day lead to massive results.';
        }
        else if (cmd.includes('can you do') || cmd.includes('what can you')) {
            response.text = 'I can chat, search the web, open apps, take notes, set reminders, check time/weather, remember things, tell jokes, and shut down. Just ask!';
        }
        else if (cmd.includes('remember')) {
            const memoryQuery = cmd.replace('remember that', '').replace('remember', '').trim();
            if (memoryQuery) {
                localStorage.setItem('zenk_memory', memoryQuery);
                loadMemories();
                response.text = "Got it. I'll remember that.";
            } else {
                response.text = 'What would you like me to remember?';
            }
        }
        else if (cmd.includes('what did i say') || cmd.includes('what do you remember')) {
            const savedMemory = localStorage.getItem('zenk_memory');
            response.text = savedMemory
                ? `You asked me to remember: ${savedMemory}.`
                : "I don't have anything saved in my memory right now.";
        }
        else if (cmd.includes('hello') || cmd.includes('hi') || cmd.includes('hey')) {
            response.text = 'Hello! How can I help you today?';
        }
        else if (cmd.includes('thank')) {
            response.text = "You're welcome! Let me know if you need anything else.";
        }

        respondToUser(response, shutdownRequested);
    }

    function respondToUser(responseObj, shutdown = false) {
        updateState('speaking');
        appendChat('ai', responseObj.text, responseObj.actionDetails);

        speak(responseObj.text, () => {
            updateState('idle');
            if (shutdown) doShutdown();
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

    // ─────────────────────────────────────────────
    // 🌊  WAVEFORM ENGINE
    // ─────────────────────────────────────────────
    const waveformCanvas  = document.getElementById('waveform-canvas');
    const waveformContainer = document.getElementById('waveform-container');
    const waveformLabel   = document.getElementById('waveform-label');
    const wCtx            = waveformCanvas.getContext('2d');

    let audioCtx      = null;
    let analyser      = null;
    let micStream     = null;
    let sourceNode    = null;
    let rafId         = null;
    let waveState     = 'idle';   // 'idle' | 'listening' | 'speaking'

    /* Resize canvas to match its CSS display size */
    function resizeCanvas() {
        waveformCanvas.width  = waveformCanvas.offsetWidth  * (window.devicePixelRatio || 1);
        waveformCanvas.height = waveformCanvas.offsetHeight * (window.devicePixelRatio || 1);
        wCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    window.addEventListener('resize', resizeCanvas);

    /* Build gradient for the stroke */
    function buildGradient(w) {
        const grad = wCtx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0,    'rgba(59, 130, 246, 0.2)');
        grad.addColorStop(0.25, 'rgba(99, 179, 237, 0.9)');
        grad.addColorStop(0.5,  'rgba(139, 92, 246, 1)');
        grad.addColorStop(0.75, 'rgba(99, 179, 237, 0.9)');
        grad.addColorStop(1,    'rgba(59, 130, 246, 0.2)');
        return grad;
    }

    /* Smooth idle sine — shown while mic is on but silent */
    let idlePhase = 0;
    function drawIdleWave(w, h) {
        idlePhase += 0.04;
        const mid = h / 2;
        wCtx.beginPath();
        for (let x = 0; x <= w; x++) {
            const angle = (x / w) * Math.PI * 4 + idlePhase;
            const y = mid + Math.sin(angle) * 3;
            x === 0 ? wCtx.moveTo(x, y) : wCtx.lineTo(x, y);
        }
        wCtx.stroke();
    }

    /* Real audio waveform from time-domain data */
    function drawAudioWave(w, h, dataArray, bufferLength) {
        const sliceWidth = w / bufferLength;
        const mid = h / 2;
        wCtx.beginPath();
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;          // 0..2
            const y = mid + (v - 1) * (mid * 0.85);  // amplify to 85 % of half-height
            i === 0 ? wCtx.moveTo(x, y) : wCtx.lineTo(x, y);
            x += sliceWidth;
        }
        wCtx.lineTo(w, mid);
        wCtx.stroke();
    }

    /* Main render loop */
    function renderLoop() {
        rafId = requestAnimationFrame(renderLoop);

        const dw = waveformCanvas.offsetWidth;
        const dh = waveformCanvas.offsetHeight;
        if (dw === 0 || dh === 0) return;

        // Re-sync canvas resolution each frame (cheap check)
        if (waveformCanvas.width !== Math.round(dw * (window.devicePixelRatio || 1))) {
            resizeCanvas();
        }

        wCtx.clearRect(0, 0, dw, dh);

        // Gradient stroke
        wCtx.strokeStyle  = buildGradient(dw);
        wCtx.lineWidth    = waveState === 'listening' ? 2.5 : 1.5;
        wCtx.lineJoin     = 'round';
        wCtx.lineCap      = 'round';
        wCtx.shadowBlur   = waveState === 'listening' ? 8 : 4;
        wCtx.shadowColor  = waveState === 'listening'
            ? 'rgba(139, 92, 246, 0.6)'
            : 'rgba(59, 130, 246, 0.35)';

        if (analyser) {
            const bufferLength = analyser.fftSize;
            const dataArray    = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);
            drawAudioWave(dw, dh, dataArray, bufferLength);
        } else {
            drawIdleWave(dw, dh);
        }
    }

    /* Start animation loop & show container */
    function waveformShow(state) {
        waveState = state;
        waveformContainer.classList.add('active');
        waveformContainer.classList.toggle('listening', state === 'listening');

        if (state === 'listening') {
            waveformLabel.textContent = 'Listening…';
        } else {
            waveformLabel.textContent = 'Speaking…';
        }

        if (!rafId) {
            resizeCanvas();
            renderLoop();
        }
    }

    /* Stop animation loop & hide container */
    function waveformHide() {
        waveState = 'idle';
        waveformContainer.classList.remove('active', 'listening');
        waveformLabel.textContent = 'Tap mic to speak';

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        // Clear canvas
        wCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
    }

    /* Request mic access and wire the analyser */
    async function startMicStream() {
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            analyser         = audioCtx.createAnalyser();
            analyser.fftSize = 256;   // 128 time-domain samples — lightweight
            analyser.smoothingTimeConstant = 0.82;

            sourceNode = audioCtx.createMediaStreamSource(micStream);
            sourceNode.connect(analyser);
            // Do NOT connect analyser to destination — we don't want echo
        } catch (err) {
            console.warn('Waveform mic access denied:', err.message);
            // Gracefully fall back to idle animation
        }
    }

    /* Release mic stream */
    function stopMicStream() {
        if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
        if (micStream)  { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
        analyser = null;
    }

    /* Hook into updateState so waveform tracks all AI states */
    const _originalUpdateState = updateState;
    updateState = function(newState) {
        _originalUpdateState(newState);

        if (newState === 'listening') {
            waveformShow('listening');
        } else if (newState === 'speaking') {
            waveformShow('speaking');
        } else {
            // idle / processing — hide waveform
            waveformHide();
        }
    };

    // --- Event Listeners ---
    micBtn.addEventListener('click', async () => {
        if (isListening) {
            if (recognition) recognition.stop();
            stopMicStream();
            updateState('idle');
        } else {
            await startMicStream();
            if (recognition) {
                try {
                    recognition.start();
                } catch (e) {
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
            if (itemId === 'menu-apps')       { handleUserMessage('Show my apps'); }
            else if (itemId === 'menu-notes') { window.openNotesModal(); }
            else if (itemId === 'menu-reminders') { window.openRemindersModal(); }
            else if (itemId === 'menu-settings')  { handleUserMessage('Open settings'); }
            else if (itemId === 'menu-voice')      { micBtn.click(); }
            else if (itemId === 'menu-search')     { handleUserMessage('search '); chatInput.focus(); }
        });
    });

    // Ensure voices are loaded
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => synth.getVoices();
    }

    // ─────────────────────────────────────────────
    // 📱  MOBILE NAVIGATION
    // ─────────────────────────────────────────────
    const mnavChat      = document.getElementById('mnav-chat');
    const mnavNotes     = document.getElementById('mnav-notes');
    const mnavMic       = document.getElementById('mnav-mic');
    const mnavReminders = document.getElementById('mnav-reminders');
    const mnavMore      = document.getElementById('mnav-more');
    const mobileDrawer  = document.getElementById('mobile-drawer');
    const drawerOverlay = document.getElementById('mobile-drawer-overlay');

    function closeMobileDrawer() {
        mobileDrawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    }
    function openMobileDrawer() {
        mobileDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
    }
    function setMobileNavActive(btn) {
        document.querySelectorAll('.mobile-nav-btn').forEach(b => {
            if (b !== mnavMic) b.classList.remove('active');
        });
        if (btn && btn !== mnavMic) btn.classList.add('active');
    }

    if (mnavChat) {
        mnavChat.addEventListener('click', () => { setMobileNavActive(mnavChat); closeMobileDrawer(); chatInput.focus(); });
    }
    if (mnavNotes) {
        mnavNotes.addEventListener('click', () => { setMobileNavActive(mnavNotes); closeMobileDrawer(); window.openNotesModal(); });
    }
    if (mnavMic) {
        mnavMic.addEventListener('click', () => micBtn.click());
    }
    if (mnavReminders) {
        mnavReminders.addEventListener('click', () => { setMobileNavActive(mnavReminders); closeMobileDrawer(); window.openRemindersModal(); });
    }
    if (mnavMore) {
        mnavMore.addEventListener('click', () => {
            setMobileNavActive(mnavMore);
            if (mobileDrawer.classList.contains('open')) { closeMobileDrawer(); }
            else { openMobileDrawer(); }
        });
    }
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', closeMobileDrawer);
    }

    // Drawer item buttons
    document.querySelectorAll('.drawer-item[data-query]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeMobileDrawer();
            handleUserMessage(btn.getAttribute('data-query'));
        });
    });
    const drawerApps = document.getElementById('drawer-apps');
    if (drawerApps) drawerApps.addEventListener('click', () => { closeMobileDrawer(); handleUserMessage('Show my apps'); });
    const drawerSettings = document.getElementById('drawer-settings');
    if (drawerSettings) drawerSettings.addEventListener('click', () => { closeMobileDrawer(); handleUserMessage('Open settings'); });
    const drawerLock = document.getElementById('drawer-lock');
    if (drawerLock) drawerLock.addEventListener('click', () => { closeMobileDrawer(); handleUserMessage('Execute system lock'); });
    const drawerTheme = document.getElementById('drawer-theme');
    if (drawerTheme) drawerTheme.addEventListener('click', () => { closeMobileDrawer(); themeToggle.click(); });

    // Sync mobile mic button listening state with the main mic button
    const _origUpdateState = updateState;
    updateState = function(s) {
        _origUpdateState(s);
        if (mnavMic) mnavMic.classList.toggle('listening', s === 'listening');
    };
});
