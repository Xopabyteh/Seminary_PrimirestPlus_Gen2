const sendMessageToScolarestTab = async (msg) => {
    chrome.tabs.query(
        {
            active: true,
            currentWindow: true
        },
        async (tabs) => {
            let tab = tabs[0];
            if (!tab.url || !tab.url.includes("mujprimirest.cz")) {
                return;
            }
            const response = await chrome.tabs.sendMessage(
                tab.id,
                msg
            );
            return response;
        }
    );
}

const onDeveloperModeButton = async () => {
    await chrome.runtime.sendMessage({
        type: 'SET_STORAGE_ITEM',
        key: 'isDeveloper',
        value: !isDeveloper,
        notifyTab: true
    });
    isDeveloper = !isDeveloper;
    buttonDeveloperMode.classList.toggle('active');
}

import { changeColorTheme } from "../globalServices/colorThemeService";
const onDarkModeButton = async () => {
    await chrome.runtime.sendMessage({
        type: 'SET_STORAGE_ITEM',
        key: 'darkMode',
        value: !darkMode,
        notifyTab: true
    });
    darkMode = !darkMode;
    changeColorTheme(darkMode);
    buttonDarkMode.classList.toggle('active');
}

var buttonDeveloperMode;
var buttonDarkMode;
var darkMode = false;
var isDeveloper = false;

const init = async () => {
    isDeveloper = await chrome.runtime.sendMessage({
        type: 'GET_STORAGE_ITEM',
        key: 'isDeveloper',
        defaultValue: false,
    });
    buttonDeveloperMode = document.getElementById("button-developerMode");
    buttonDeveloperMode.addEventListener("click",onDeveloperModeButton);
    buttonDeveloperMode.classList.toggle('active', isDeveloper);

    darkMode = await chrome.runtime.sendMessage({
        type: 'GET_STORAGE_ITEM',
        key: 'darkMode',
        defaultValue: false,
    });
    buttonDarkMode = document.getElementById("button-darkMode");
    buttonDarkMode.addEventListener("click", onDarkModeButton);
    buttonDarkMode.classList.toggle('active', darkMode);
    changeColorTheme(darkMode);
}

// chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
// });

document.addEventListener("DOMContentLoaded", init);

