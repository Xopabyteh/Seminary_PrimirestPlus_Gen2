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

    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
    }
});
