/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/background/background.js":
/*!**************************************!*\
  !*** ./src/background/background.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _googleImagesService__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./googleImagesService */ "./src/background/googleImagesService.js");


let scolarestTab = undefined;

const onTabUpdated = async (tabId, changeInfo, tab) => {
    if (!changeInfo.status)
        return;
    if (changeInfo.status != 'complete')
        return;
    if (!tab.url)
        return;
    if (!tab.url.includes("mujprimirest.cz"))
        return;
    if (tab.url.includes("auth"))
        return;

    //https://mujprimirest.cz/CS/boarding
    //[0] always link
    //[1] always region info
    //[2...] website page
    scolarestTab = tab;

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
            // chrome.runtime.sendMessage({
            //     type: 'OPTION_CHANGED',
            //     key: key,
            //     value: value
            // })

            if(scolarestTab == undefined || scolarestTab.id == undefined || scolarestTab.active === false)
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

        return false;
    }

    else if(msg.type == "GET_IMAGE") {
        console.log(msg);
        const query = msg.query;
        const index = msg.index;
        const sizeIndex = msg.sizeIndex;
        (0,_googleImagesService__WEBPACK_IMPORTED_MODULE_0__.searchForFoodPicture)(query, index, sizeIndex).then(foodPictureSearch => sendResponse(foodPictureSearch));
        return true;
    }

    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
    }
});


/***/ }),

/***/ "./src/background/googleImagesService.js":
/*!***********************************************!*\
  !*** ./src/background/googleImagesService.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "searchForFoodPicture": () => (/* binding */ searchForFoodPicture)
/* harmony export */ });
const googleSearchCredentials = {
    customSearchKey: 'AIzaSyA2R8PmMNUk_YezsELTBNsIU0jWss1-uwQ',
    searchEngineId: 'c5306d0b9758c45b1'
};

const createGoogleFetchRequest = async (query, num, startFrom, imgSize) => {
    const key = googleSearchCredentials.customSearchKey;
    const cx = googleSearchCredentials.searchEngineId;
    const searchType = 'image';
    // const imgSize = 'huge';
    // const imgSize = 'huge';
    const excludeTerms = 'facebook OR x-raw-image OR tiktok OR denikmalepozitkarky OR cookandme OR function OR docplayer';
    const lr = 'lang_cs';
    const gl = 'cs';
    const hl = 'cs';
    const request =
        'https://www.googleapis.com/customsearch/' +
        // `v1?key=${key}&cx=${cx}&q=${query}&searchType=${searchType}&num=${num}&start=${startFrom}&excludeTerms=${excludeTerms}&lr=${lr}&gl=${gl}&hl=${hl}`;
        `v1?key=${key}&cx=${cx}&q=${query}&searchType=${searchType}&num=${num}&start=${startFrom}&imgSize=${imgSize}&excludeTerms=${excludeTerms}&lr=${lr}&gl=${gl}&hl=${hl}`;

    return request;
}
const getGoogleImagePictures = async (query, num, startFrom, imgSize) => {
    const requestUrl = await createGoogleFetchRequest(query, num, startFrom, imgSize);
    const response = await fetch(requestUrl);
    const data = await response.json();
    const pictures = data.items;
    return pictures;
}
const getGoogleImagePicture = async (query, startFrom, imgSize) => {
    const items = await getGoogleImagePictures(query, 1, startFrom, imgSize);
    if (items === undefined) {
        return undefined;
    } 
    return items[0];
}

const validImgSizes = [
    'huge',
    'xlarge',
]
//Attempts per size, so in total its n * size
const attemptThreshold = 7;
const searchForFoodPicture = async (foodName, startFrom, sizeIndex) => {
    if(sizeIndex === undefined) {
        sizeIndex = 0;
    }

    const foodPictureSearch = {
        foodPicture: undefined,
        searchIndex: startFrom,
        sizeIndex: sizeIndex
    };

    if(sizeIndex >= validImgSizes.length) {
        return foodPictureSearch;
    }

    //Try to search for pictures until we find one
    while (true) {
        if(
            foodPictureSearch.foodPicture !== undefined 
            && foodPictureSearch.foodPicture.link !== undefined
            && typeof(foodPictureSearch.foodPicture.link) === 'string'
            && foodPictureSearch.foodPicture.link.includes('https://')
            && !foodPictureSearch.foodPicture.link.includes('function')
            ) {
            break;
        }

        foodPictureSearch.searchIndex++;

        const picture = await getGoogleImagePicture(foodName, startFrom, validImgSizes[sizeIndex]);
        foodPictureSearch.foodPicture = picture;
        //Not found after many attempts, try to switch sizes
        if (foodPictureSearch.searchIndex >= startFrom + attemptThreshold) {
            return await searchForFoodPicture(foodName, 0, sizeIndex + 1);
        }
    }
    //console.log(foodPictureSearch);
    return foodPictureSearch;
}



/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	__webpack_require__("./src/background/background.js");
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/background/googleImagesService.js");
/******/ 	
/******/ })()
;
//# sourceMappingURL=background.js.map