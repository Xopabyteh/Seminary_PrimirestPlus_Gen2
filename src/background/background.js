import { searchForFoodPicture } from "./googleImagesService";

const isScolarestUrl = (url) => {
    if (url == undefined)
        return false;
    if (!url.includes("mujprimirest.cz"))
        return false;
    if (url.includes("auth"))
        return false;

    return true;
}

let _scolarestTab = undefined;
//Uses caching
const getScolarestTab = async () => {
    if(_scolarestTab != undefined)
        return _scolarestTab;
    
    const queryOptions = { url: '*://*.mujprimirest.cz/*'};

    const [tab] = await chrome.tabs.query(queryOptions);
    if(tab != undefined && tab.id != undefined) {
        setScolarestTab(tab);
        return tab;
    }

    return undefined;
}
const setScolarestTab = async (tab) => {
    _scolarestTab = tab;
}

import { loadStoredRatings } from '../globalServices/firebaseService';
const onTabUpdated = async (tabId, changeInfo, tab) => {
    if (!changeInfo.status)
        return;
    if (changeInfo.status != 'complete')
        return;
    if(!isScolarestUrl(tab.url))
        return;

    //https://mujprimirest.cz/CS/boarding
    //[0] always link
    //[1] always region info
    //[2...] website page
    setScolarestTab(tab);
    await loadStoredRatings();
    //Send tab to tabId
    chrome.tabs.sendMessage(
        tabId,
        {
            type: "LOAD",
            tab: tab,
        }
    );
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => onTabUpdated(tabId, changeInfo, tab));

const getStorageItem = async (key = '', defaultValue = '') => {
    const result = (await chrome.storage.local.get(key))[key];
    if(result == undefined) {
        setStorageItem(key, defaultValue);
        return defaultValue;
    }
    return result;
}

const setStorageItem = async (key = '', value = '') => {
    chrome.storage.local.set({ [key] : value });
}


import { signInWithGoogle, clearAuthToken as go_clearAuth } from '../globalServices/googleAuthService';
const signIn = async (interactive = false) => {
    const authToken = await signInWithGoogle(interactive);
    return authToken;
}
import { clearAuth as fb_clearAuth } from "../globalServices/firebaseService";
const signOut = async () => {
    const googleToken = await signIn(false);
    await go_clearAuth(googleToken);
    await fb_clearAuth();
}


import { initializeAuth as fb_initializeAuth, writeFoodRating as fb_writeFoodRating, userAuthenticated, getFoodRating} from '../globalServices/firebaseService';
//-2 What the hell.
//-1: error
//0: sucess
const attemptWriteFoodRating = async (food = '', rating = 4) => {
    if(!userAuthenticated()) {
        const authToken = await signIn(true);
        //User declined login prompt
        if(authToken == undefined) {
            return -1;
        }

        const scolarestTab = getScolarestTab()
        chrome.tabs.reload(scolarestTab.id);
        
        await fb_initializeAuth(authToken);
    }

    //'' - 0: Evil conversion to number
    const res = await fb_writeFoodRating(food, rating - 0);
    return res;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    const notifyTabOptionChange = async (key, value) => {
            const scolarestTab = await getScolarestTab();
            if(scolarestTab == undefined)
                return false;
        
            chrome.tabs.sendMessage(
                scolarestTab.id,
                {
                    type: 'OPTION_CHANGED',
                    key: key,
                    value: value
                }
            );
    }

    if(msg.type == 'GET_STORAGE_ITEM') {
        const key = msg.key;
        const defaultValue = msg.defaultValue;
        getStorageItem(key, defaultValue).then(res => sendResponse(res));

        return true;
    }

    else if(msg.type == 'SET_STORAGE_ITEM') {
        const key = msg.key;
        const value = msg.value;
        const notifyTab = msg.notifyTab ?? false;
        
        setStorageItem(key, value);
        
        if(notifyTab) {
            notifyTabOptionChange(key, value);
        }

        return false;
    }

    else if(msg.type == "GET_IMAGE") {
        console.log(msg);
        const query = msg.query;
        const index = msg.index;
        const sizeIndex = msg.sizeIndex;
        searchForFoodPicture(query, index, sizeIndex).then(foodPictureSearch => sendResponse(foodPictureSearch));
        return true;
    } 

    else if(msg.type == 'WRITE_FOOD_RATING') {
        const food = msg.food;
        const rating = msg.rating;
        
        attemptWriteFoodRating(food, rating).then(res => sendResponse(res));
        return true;
    }

    else if(msg.type == 'GET_FOOD_RATING') {
        const food = msg.food;
        getFoodRating(food).then(res => sendResponse(res));
        return true;
    }

    else if(msg.type == 'SIGN_IN') {
        const interactive = msg.interactive;
        const reloadTab = msg.reloadTab ?? false;
        signIn(interactive).then(token => {
            sendResponse(token)
            if(reloadTab) {
                getScolarestTab().then(scolarestTab => {
                    chrome.tabs.reload(scolarestTab.id);
                })
            }
        });
        return true;
    }

    else if(msg.type == 'SIGN_OUT') {
        const reloadTab = msg.reloadTab ?? false;
        signOut();
        if(reloadTab) {
            getScolarestTab().then(scolarestTab => {
                chrome.tabs.reload(scolarestTab.id);
            })
        }
        return false;
    }

    else if(msg.type == 'INIT_FB_AUTH') {
        signIn(false)
            .then(token => fb_initializeAuth(token))
            .then(user => sendResponse(user));
        return true;
    }

    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
    }
});
