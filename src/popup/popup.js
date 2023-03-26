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

import { signInWithGoogle, getProfilePicture, clearAuthToken } from '../globalServices/googleAuthService';
var authToken;
const login = async (interactive = false) => {
    const token = await chrome.runtime.sendMessage({
        type: 'SIGN_IN',
        interactive: interactive
    })
    authToken = token;
    await addSignoutControl();
}

const signOut = async () => {
    if(authToken == undefined)
        return;
    
    await chrome.runtime.sendMessage({
        type: 'SIGN_OUT',
    })

    await addLoginControl();
}

const addLoginControl = async () => {
    const loginControlHTML = await (await fetch('./loginControl.html')).text();
    loginFormHolder.innerHTML = loginControlHTML;

    const loginButton = loginFormHolder.querySelector('#login-button');
    loginButton.addEventListener('click', async () => login(true));
}

const addSignoutControl = async () => {
    let signoutControlHTML = await (await fetch('./signOutControl.html')).text();
    const profilePicture = await getProfilePicture(authToken);
    signoutControlHTML = signoutControlHTML.replace('__PROFILE_PICTURE__', profilePicture);

    loginFormHolder.innerHTML = signoutControlHTML;

    const signOutButton = loginFormHolder.querySelector('#signOut-button');
    signOutButton.addEventListener('click', signOut);
}

const onTestButton = async () => {
    chrome.runtime.sendMessage({
        type: 'TEST_DB',
        authToken: authToken
    });
}

var buttonDeveloperMode;
var buttonDarkMode;
var darkMode = false;
var isDeveloper = false;
var loginFormHolder;
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

    //Either display loginDisplay, or add a login button
    loginFormHolder = document.getElementById('login-form-holder');
    await login(false); //Set authToken
    if(authToken != undefined) {
        await addSignoutControl()
    } else {
        await addLoginControl();
    }
    
    const testButton = document.getElementById('test-button');
    testButton.addEventListener('click', onTestButton);
}

document.addEventListener("DOMContentLoaded", init);

