const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

addEventListener("keydown", (e) => {
    if (e.key === "Enter" && document.activeElement === chatInput) {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            console.log("Sending chat message:", message);
            window.electronSocket.sendChatMessage(message);
            chatInput.value = "";
        }
    }
});

if (window.electronSocket) {
    window.electronSocket.recieveChatMessage((data) => {
        console.log("Received chat message data:", data);
    });
}

async function convertDataToChatMessage() {
    const message = document.createElement("div");
    message.classList.add("chat-message");
    message.innerText = `${data.user}: ${data.message}`;
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}