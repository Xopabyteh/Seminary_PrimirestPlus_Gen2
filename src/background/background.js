let scolarestTab = null;
const storageKey_IsDeveloper = "isDeveloper";

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!changeInfo.status)
        return;
    if (changeInfo.status != 'complete')
        return;
    if (!tab.url)
        return;
    if (!tab.url.includes("www.mujprimirest.cz"))
        return;
    if (tab.url.includes("auth"))
        return;

    //https://www.mujprimirest.cz/CS/boarding
    //[0] always link
    //[1] always region info
    //[2...] website page
    scolarestTab = tab;

    let pageComponents = tab.url.split("/");
    let page = pageComponents[pageComponents.length - 1];

    let isDeveloper = await getDeveloperMode();

    //Send tab to tabId
    chrome.tabs.sendMessage(
        tabId,
        {
            type: "LOAD",
            tab: tab,
            isDeveloper: isDeveloper,
            page: page
        }
    );
});

const googleSearchCredentials = {
    customSearchKey: 'AIzaSyA2R8PmMNUk_YezsELTBNsIU0jWss1-uwQ',
    searchEngineId: 'c5306d0b9758c45b1'
};

const createGoogleFetchRequest = async (query, num, startFrom) => {
    const key = googleSearchCredentials.customSearchKey;
    const cx = googleSearchCredentials.searchEngineId;
    const searchType = 'image';
    const imgSize = 'huge';
    const excludeTerms = 'facebook OR x-raw-image OR tiktok OR denikmalepozitkarky OR cookandme OR function OR docplayer';
    const lr = 'lang_cs';
    const gl = 'cs';
    const hl = 'cs';
    const request =
        'https://www.googleapis.com/customsearch/' +
        `v1?key=${key}&cx=${cx}&q=${query}&searchType=${searchType}&num=${num}&start=${startFrom}&imgSize=${imgSize}&excludeTerms=${excludeTerms}&lr=${lr}&gl=${gl}&hl=${hl}`;

    return request;
}
const getGoogleImagePictures = async (query, num, startFrom) => {
    const requestUrl = await createGoogleFetchRequest(query, num, startFrom);
    const response = await fetch(requestUrl);
    const data = await response.json();
    const pictures = data.items;
    return pictures;
}
const getGoogleImagePicture = async (query, startFrom) => {
    const items = await getGoogleImagePictures(query, 1, startFrom);
    if (items === undefined) {
        return undefined;
    } 
    return items[0];
}

const searchForFoodPicture = async (foodName, startFrom) => {
    const foodPictureSearch = {
        foodPicture: undefined,
        searchIndex: startFrom,
    };

    //Try to search for pictures until we find one
    while (true) {
        if(
            foodPictureSearch.foodPicture !== undefined 
            && foodPictureSearch.foodPicture.link !== undefined
            && typeof(foodPictureSearch.foodPicture.link) === 'string'
            && foodPictureSearch.foodPicture.link.includes('https')
            && !foodPictureSearch.foodPicture.link.includes('function')
            ) {
            break;
        }

        foodPictureSearch.searchIndex++;

        const picture = await getGoogleImagePicture(foodName, startFrom);
        foodPictureSearch.foodPicture = picture;
        if (foodPictureSearch.searchIndex >= startFrom + 10) {
            //Not found after too many
            foodPictureSearch.foodPicture = undefined;
            break;
        }
    }
    //console.log(foodPictureSearch);
    return foodPictureSearch;
}


const toggleDeveloperMode = async () => {
    const storageResult = await chrome.storage.local.get(storageKey_IsDeveloper)
    const isDeveloper = !storageResult.isDeveloper;
    chrome.storage.local.set({ isDeveloper : isDeveloper });
    
    chrome.runtime.sendMessage(
        {
            type: "DEVELOPER_CHANGED",
            isDeveloper: isDeveloper
        }
    );

    if(scolarestTab !== null) {
        chrome.tabs.sendMessage(
            scolarestTab.id,
            {
                type: "DEVELOPER_CHANGED",
                isDeveloper: isDeveloper
            }
        );
    }
}
const getDeveloperMode = async () => {
    const storageResult = await chrome.storage.local.get(storageKey_IsDeveloper);
    return storageResult.isDeveloper;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    // console.log(msg);
    
    if(msg.type == "TOGGLE_DEVELOPER") {
        toggleDeveloperMode();
        return false;
    }
    if(msg.type == "GET_DEVELOPER") {
        getDeveloperMode().then(isDeveloper=> {
            chrome.runtime.sendMessage(
                {
                    type: "DEVELOPER_CHANGED",
                    isDeveloper: isDeveloper
                }
            );
        });
        return false;
    }
    if(msg.type == "GET_IMAGE") {
        const query = msg.query;
        const index = msg.index;
        searchForFoodPicture(query, index).then(foodPictureSearch => sendResponse(foodPictureSearch));
        return true;
    }

    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
    }
});
