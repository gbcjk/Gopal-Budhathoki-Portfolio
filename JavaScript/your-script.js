// 🔒 Right-click block
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    alert("🚫 Right-click is disabled on this page.");
}, false);

// 🔒 Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U and more
document.addEventListener("keydown", function (e) {
    const key = e.key.toLowerCase();

    if (e.key === 'F12') {
        e.preventDefault();
        alert("🔒 Developer tools (F12) are disabled.");
    }

    if (e.ctrlKey && e.shiftKey && key === 'i') {
        e.preventDefault();
        alert("🔧 Inspect Element is disabled.");
    }

    if (e.ctrlKey && e.shiftKey && key === 'j') {
        e.preventDefault();
        alert("🛠️ Console access is disabled.");
    }

    if (e.ctrlKey && e.shiftKey && key === 'c') {
        e.preventDefault();
        alert("📋 Element selection is disabled.");
    }

    if (e.ctrlKey && e.shiftKey && key === 'k') {
        e.preventDefault();
        alert("⚙️ DevTools shortcut is disabled.");
    }

    if (e.ctrlKey && key === 'u') {
        e.preventDefault();
        alert("📄 Viewing page source is disabled.");
    }
});

// 🚫 Disable console functions
const disabled = () => console.warn("Console access is disabled.");
console.log = disabled;
console.warn = disabled;
console.error = disabled;
console.info = disabled;
console.debug = disabled;

// 🕵️ Detect DevTools
setInterval(function () {
    const devtoolsOpen = /./;
    devtoolsOpen.toString = function () {
        throw "DevTools is open";
    };
    console.log('%c', devtoolsOpen);
}, 1000);

// 📷 Image click preview modal
const images = document.querySelectorAll(".project-image");
const modal = document.createElement("div");
modal.id = "imgModal";
modal.style.cssText = `
    display: none;
    position: fixed;
    z-index: 9999;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    justify-content: center;
    align-items: center;
    overflow: hidden;
`;

const modalImg = document.createElement("img");
modalImg.style.cssText = `
    max-width: 90%;
    max-height: 80%;
    border-radius: 10px;
    box-shadow: 0 0 20px #fff;
    transition: transform 0.3s ease;
`;

const closeBtn = document.createElement("span");
closeBtn.innerHTML = "&times;";
closeBtn.style.cssText = `
    position: absolute;
    top: 20px; right: 30px;
    font-size: 40px;
    color: white;
    cursor: pointer;
`;

closeBtn.onclick = () => {
    modal.style.display = "none";
};

modal.appendChild(modalImg);
modal.appendChild(closeBtn);
document.body.appendChild(modal);

// Adding click event for images to open the modal
images.forEach(img => {
    img.style.cursor = "pointer";
    img.addEventListener("click", () => {
        modalImg.src = img.src;
        modal.style.display = "flex";
    });
});

// Close modal when clicking outside the image
modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// 📝 Detect right-clicking on modal image
modalImg.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    alert("🚫 Right-click is disabled on this image.");
});

// 📷 Add keyboard accessibility to close modal
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal.style.display === "flex") {
        modal.style.display = "none";
    }
});

// 🚨 Disable all devtools keyboard shortcuts (Ctrl + Shift + I, Ctrl + Shift + J, etc.)
document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || e.key === 'F12' || e.ctrlKey && e.key === 'U') {
        e.preventDefault();
        alert("🚫 Developer tools access is disabled.");
    }
});