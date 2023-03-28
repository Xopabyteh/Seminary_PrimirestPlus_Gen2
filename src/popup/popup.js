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

import { getProfilePicture } from '../globalServices/googleAuthService';
var authToken;
const login = async (interactive = false) => {
    const token = await chrome.runtime.sendMessage({
        type: 'SIGN_IN',
        interactive: interactive
    })
    //User declined login prompt
    if(token == undefined) {
        return;
    }

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

    //Action links
    const actionLinks = document.querySelectorAll('.actionLink');
    for (const actionLink of actionLinks) {
        const dest = actionLink.getAttribute('value');
        actionLink.addEventListener('click', async ()=>{
            const properties = {
                url: dest
            };
            await chrome.tabs.create(properties);
        });
    }
}

document.addEventListener("DOMContentLoaded", init);

