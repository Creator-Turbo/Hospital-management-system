const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const chatMessages = document.getElementById("chatMessages");

/*
|--------------------------------------------------------------------------
| API CONFIG (FLASK BACKEND)
|--------------------------------------------------------------------------
*/

const API_URL = "http://127.0.0.1:5000/chat";  // Flask endpoint

/*
|--------------------------------------------------------------------------
| EVENTS
|--------------------------------------------------------------------------
*/

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

/*
|--------------------------------------------------------------------------
| MAIN FUNCTION
|--------------------------------------------------------------------------
*/

async function sendMessage() {

    const message = messageInput.value.trim();

    if (message === "") return;

    appendUserMessage(message);
    messageInput.value = "";

    const loadingId = showTypingLoader();

    try {

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query: message   // ✅ MUST match Flask
            })
        });

        const data = await response.json();

        removeLoader(loadingId);

        const aiReply =
            data.answer || "No response from AI.";

        appendAIMessage(aiReply);

    } catch (error) {

        console.error("API Error:", error);

        removeLoader(loadingId);

        appendAIMessage(
            "⚠️ Error connecting to AI server."
        );
    }
}

/*
|--------------------------------------------------------------------------
| UI FUNCTIONS
|--------------------------------------------------------------------------
*/

function appendUserMessage(message) {
    const div = document.createElement("div");
    div.classList.add("message", "user-message");

    div.innerHTML = `
        <div class="message-content">${message}</div>
        <div class="message-avatar user-avatar">U</div>
    `;

    chatMessages.appendChild(div);
    scrollToBottom();
}

function appendAIMessage(message) {
    const div = document.createElement("div");
    div.classList.add("message", "ai-message");

    div.innerHTML = `
        <div class="message-avatar ai-avatar">AI</div>
        <div class="message-content">${message}</div>
    `;

    chatMessages.appendChild(div);
    scrollToBottom();
}

/*
|--------------------------------------------------------------------------
| LOADER
|--------------------------------------------------------------------------
*/

function showTypingLoader() {
    const loader = document.createElement("div");
    const id = "loader-" + Date.now();

    loader.id = id;
    loader.classList.add("message", "ai-message");

    loader.innerHTML = `
        <div class="message-avatar ai-avatar">AI</div>
        <div class="message-content typing-loader">
            <span></span><span></span><span></span>
        </div>
    `;

    chatMessages.appendChild(loader);
    scrollToBottom();

    return id;
}

function removeLoader(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}