const getCommonSubstring = (str1, str2) => {
    let commonSubstring = '';
    const len1 = str1.length;
    const len2 = str2.length;
    for (let i = 0; i < len1; i++) {
        for (let j = i + 1; j <= len1; j++) {
            const subString = str1.substring(i, j);
            if (len2 >= subString.length && str2.includes(subString)) {
                if (subString.length > commonSubstring.length) {
                    commonSubstring = subString;
                }
            }
        }
    }
    return commonSubstring;
}

const getFoodObject = (fullFoodName, soupParts) => {
    let foodName = fullFoodName;
    let soupName = undefined;

    //Remove the soup part from the name
    for (let soupPart of soupParts) {
        if (fullFoodName.indexOf(soupPart) !== -1) {
            soupName = soupPart;
            foodName = foodName.replace(soupPart, "");
            break;
        }
    }

    //Delete parentheses -> (x...z)
    let foodDetail = foodName.match(/\([^)]*\)/g);
    if(foodDetail == undefined || foodDetail[0] == undefined) {
        foodDetail = ''; 
    } else {
        foodDetail = foodDetail[0];
        foodName = foodName.replace(foodDetail, '');
    }

    foodName = foodName.trim();

    return {foodName: foodName, soupName: soupName, foodDetail: foodDetail};
}

const getSoupParts = (foodRowElements) => {
    const fullFoodNames = [];
    //Full soup name including the commas and whitespaces
    const soupParts = [];

    //Initialize all full names table
    for (const foodRowElement of foodRowElements) {
        const foodNameElement = foodRowElement.querySelector("td:nth-child(4) a");
        const fullFoodName = foodNameElement.innerHTML;
        fullFoodNames.push(fullFoodName);
    }
    for (let i = 0; i < fullFoodNames.length;) {
        const fThis = fullFoodNames[i];
        const fNext1 = fullFoodNames[i + 1];
        const fNext2 = fullFoodNames[i + 2];
        let soupName = getCommonSubstring(fThis, fNext1);
        soupName = getCommonSubstring(soupName, fNext2);
        if (soupName === '') {
            continue;
        }
        soupParts.push(soupName);
        //3 Rows (soups) per block
        i += 3;
    }
    return soupParts;
}

const googleSearchForFoodPicture = async (foodName, index, sizeIndex) => {
    const foodPictureSearch = await chrome.runtime.sendMessage(        {
        type: "GET_IMAGE",
        query: foodName,
        index: index,
        sizeIndex: sizeIndex
    })

    return foodPictureSearch;
}


import { initializeApp } from "firebase/app";
import { getStorage, ref, getDownloadURL, listAll  } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDuz41HpiuRIhAud4-8342byRxCiCxK4Nk",
    authDomain: "seminary-primirest-plus-fb.firebaseapp.com",
    projectId: "seminary-primirest-plus-fb",
    storageBucket: "seminary-primirest-plus-fb.appspot.com",
    messagingSenderId: "525183147276",
    appId: "1:525183147276:web:d5700e78ec1033cabb7d29",
    measurementId: "G-VJZEBNY05B"
};

const firebaseApp = initializeApp(firebaseConfig);

const firebaseStorage = getStorage(firebaseApp);
let storedFoodItems = undefined;

import { compareTwoStrings } from 'string-similarity'; 

//Caches all image refs from database and uses it as a lookup table for loading existing images
//Food match is threshold based
const tryGetExistingImage = async (foodName) => {
    //If there is a string, that matches a foodname in atleast n%, use it 
    const storedFoodItem = await storedFoodItems.find(e => compareTwoStrings(e.query, foodName) > 0.8);
    if(storedFoodItem == undefined || storedFoodItem.ref == undefined) {
        return undefined;
    }
    
    try {
        const url = await getDownloadURL(storedFoodItem.ref)
        const response = await fetch(url);
        return response.url;
    } catch (error) {
        console.error(error);
    }
    return undefined;
}

//Need to store images, so that they can be deleted, as the single day picking doesn't remove them automatically
const existingImageHolders = [];

//Create image holder
const createFoodImageObject = (foodRowElement, foodName) => {
    const foodImagesHolder = document.createElement("div");
    foodImagesHolder.className = 'food-images-holder';
    foodRowElement.appendChild(foodImagesHolder);
    
    const foodImageElement = document.createElement("img");
    foodImageElement.className = 'food-image';
    foodImageElement.setAttribute("alt", foodName);

    foodImagesHolder.appendChild(foodImageElement);
    existingImageHolders.push(foodImagesHolder);

    return {foodImagesHolder: foodImagesHolder, foodImageElement: foodImageElement};
}

const indicateNonexistentImage = (foodRowElement) => {
    const noDataInfo = document.createElement("div");
    noDataInfo.className = 'no-data-info';
    noDataInfo.innerHTML = '<b>Kuchařovo tajemství</b><i>Primirest+ ani Google jídlo nikdy neviděli.</i>'
    foodRowElement.appendChild(noDataInfo);
    
    existingImageHolders.push(noDataInfo);
} 

//Returns false if no image exists, true if everything went successfully
const addGoogleImageWithControl = async (foodRowElement, foodName) => {
    let foodPictureSearch = await googleSearchForFoodPicture(foodName, 1, 0);
    if(foodPictureSearch.foodPicture === undefined || foodPictureSearch.foodPicture.link === undefined) {
        logger.log('No image avaliable', '#11');
        return false;
    }

    const imageObject = createFoodImageObject(foodRowElement, foodName);

    let pictureUrl = foodPictureSearch.foodPicture.link;
    imageObject.foodImageElement.setAttribute("src", pictureUrl);

    //Create food image control
    const btnSearchForNew = document.createElement('button');
    btnSearchForNew.className='food-image-control';
    btnSearchForNew.innerHTML = 'F5';
    btnSearchForNew.onclick = async () => {
        btnSearchForNew.disabled = true;
        imageLoading.classList.toggle('active', true);

        //New search
        foodPictureSearch = await googleSearchForFoodPicture(foodName, foodPictureSearch.searchIndex, foodPictureSearch.sizeIndex);

        //If no other image was found, loop around to the start
        if(foodPictureSearch.foodPicture === undefined) {
            foodPictureSearch = await googleSearchForFoodPicture(foodName, 1, 0);
        }
        pictureUrl = foodPictureSearch.foodPicture.link;
        
        //Update html
        imageObject.foodImageElement.setAttribute("src", pictureUrl);
    }
    //Enable searching only after full image load
    imageObject.foodImageElement.onload = () => {
        imageLoading.classList.toggle('active', false);
        btnSearchForNew.disabled = false;
    }

    const imageLoading = document.createElement('div');
    imageLoading.className = 'food-image-loading'

    //Add controls and image
    imageObject.foodImagesHolder.appendChild(imageLoading);
    imageObject.foodImagesHolder.appendChild(btnSearchForNew);
    return true;
}

//Also adds text highlighting
const addImageToFood = async (foodRowElement, soupParts) => {
    if (!foodRowElement) {
        return;
    }

    //Get food name
    const foodNameElement = foodRowElement.querySelector("td:nth-child(4) a");
    let foodObject = getFoodObject(foodNameElement.innerHTML, soupParts);
    const foodName = foodObject.foodName;
    const soupName = foodObject.soupName;
    const foodDetail = foodObject.foodDetail;

    //Add food highlighting
    const highlightedHTML = `${soupName} <b>${foodName}</b> ${foodDetail}`;
    foodNameElement.innerHTML = highlightedHTML;
    logger.log(foodName, "#11 Names");

    const existingImage = await tryGetExistingImage(foodName);
    if(existingImage !== undefined) {
        //Use existing image
        const imageObject = createFoodImageObject(foodRowElement, foodName);
        imageObject.foodImageElement.setAttribute('src', existingImage);
    } else {
        //Use google image
        const imageExists = await addGoogleImageWithControl(foodRowElement, foodName);
        if(!imageExists) {
            //No image exists
            indicateNonexistentImage(foodRowElement);
        }
    }
}

const viewModeOptions = {
    index: 0,
    full: 1,
    compact: 2
}

let storedObserver = undefined;
const handleFoodList = async () => {
    let viewMode = viewModeOptions.index;
    const fullDisplayOption = document.querySelector("body > div.warp > div.stredni-panel > div.panel.panel-default.panel-filter > div > div.menu-view-type-select.panel-control.responsive-control > select > option:nth-child(1)");
    if(fullDisplayOption != undefined) {
        viewMode = fullDisplayOption.getAttribute('selected') == 'selected' ? viewModeOptions.full  : viewModeOptions.compact; 
    }

    logger.log(`viewMode: ${viewMode}`, "handleFoodList");
    const disconnectObserver = () => {
        logger.log('Disconnecting observer', 'disconnectObserver()')
        storedObserver.disconnect();
        storedObserver = undefined;
    }
    const onFoodBoardingMutate = async (mutationList, observer) => {
        logger.log(mutationList, "onFoodBoardingMutate()");
        if(viewMode == viewModeOptions.compact) {
            if (mutationList.length === 6
                && mutationList[0].removedNodes.length === 1
                && mutationList[1].addedNodes.length === 1
                ) {
                disconnectObserver();
            } 
            else {
                return;
            }
        } else if(viewMode == viewModeOptions.full) {
            if (
                (mutationList.length === 10) ||
                (mutationList.length === 2
                && mutationList[0].removedNodes.length === 1
                && mutationList[1].addedNodes.length === 1)
                ) {
                disconnectObserver();
            } 
        } else if(viewMode == viewModeOptions.index) {
            if(mutationList.length >= 3) {
                disconnectObserver();
            }
        }

        logger.log('Ready to work with foodList', 'Observer')
        //Remove existing images
        while(true) {
            const holder = existingImageHolders.pop();
            if(holder == undefined) {
                break;
            }
            holder.remove();
        }

        //#8
        //NewPrice query = .jidlo-mini thead tr th:nth-child(3)
        //OldPrice query = .minWidth95x.text-right strong
        let newPriceElements = document.querySelectorAll(".jidlo-mini thead tr th:nth-child(3)");
        let oldPriceElement = document.querySelector(".minWidth95x.text-right strong");
        for (let newPriceElement of newPriceElements) {
            newPriceElement.innerHTML = `${newPriceElement.innerHTML}: ${oldPriceElement.innerHTML},-`;
        }
        // logger.log(newPriceElements, "#8");
        // logger.log(oldPriceElement, "#8");

        //#9    
        let calorieCircleParentElements = document.querySelectorAll(".jidlo-mini tbody tr td:has(img)");

        // logger.log(calorieCircleParentElements, "#9a");

        for (let calorieCircleParent of calorieCircleParentElements) {
            let calorieCircleElement = calorieCircleParent.querySelector(":scope > img");
            if (!calorieCircleElement) {
                continue;
            }

            //logger.log(calorieCircleElement, "#9b");    

            //Determine calorie income based on color
            const calorieObj = {
                txt: "",
                elementType: ""
            };
            let calorieSrc = calorieCircleElement.src;

            //logger.log(calorieSrc, "#9c");

            if (calorieSrc.includes("GREEN")) {
                calorieObj.txt = "Low calories";
                calorieObj.elementType = "i";
            } else if (calorieSrc.includes("YELLOW")) {
                calorieObj.txt = "Medium calories";
                calorieObj.elementType = "span";
            } else if (calorieSrc.includes("RED")) {
                calorieObj.txt = "High calories";
                calorieObj.elementType = "strong";
            }

            //Create new element and remove circle
            let newCalorieElement = document.createElement(calorieObj.elementType);
            newCalorieElement.innerHTML = calorieObj.txt;
            calorieCircleParent.replaceChild(newCalorieElement, calorieCircleElement);
        }

        //#11 - Add images to food
        const foodRowElements = document.querySelectorAll(".jidlo-mini tbody tr");
        let soupParts = undefined;

        if(viewMode === viewModeOptions.full || viewMode === viewModeOptions.index || foodRowElements.length % 3 == 1) {
            //We're on index page
            const display = foodRowElements[0];
            const deleteButton = display.querySelector('.text-center');
            if(deleteButton != undefined) {
                deleteButton.remove();
            }

            logger.log(foodRowElements, "Index page fix")
            soupParts = getSoupParts([foodRowElements[1], foodRowElements[2], foodRowElements[3]]);
        }

        soupParts = soupParts ?? getSoupParts(foodRowElements);
        logger.log(soupParts, "#11 Soup parts");

        //Load stored images
        if(storedFoodItems == undefined) {
            storedFoodItems = [];
            const res = await listAll(ref(firebaseStorage))
            const refs = res.items;
            
            for (const ref of refs) {
                const name = ref.name;
                const fileTypeIndex = name.lastIndexOf(".");
                let query = name.substring(0, fileTypeIndex); // String without file type: "hello.png" => "hello"
                storedFoodItems.push({ref: ref, query: query});
            }
            
            logger.log(storedFoodItems, 'Init storedFoodItems')
        }
        
        //Add images to food
        for (const foodRowElement of foodRowElements) {
            addImageToFood(foodRowElement, soupParts);
        }
    };

    if(storedObserver != undefined) {
        storedObserver.disconnect();
    }
    const observer = new MutationObserver(onFoodBoardingMutate);
    storedObserver = observer;
    const foodBoarding = document.getElementById("boarding");
    const observerConfig = {
        subtree: true,
        childList: true
    };
    observer.observe(foodBoarding, observerConfig);
}

//tabInfo = {tab, page:string}
const onTabUpdated = async (tabInfo) => {
    logger.log("Tab updated", 'onTabUpdated');

    await handleFoodList();
    //Food list
    if (tabInfo.tab.url.includes("boarding")) {

        //On food date picker change
        const foodDatePicker =
            document.querySelector(
                "body > div.warp > div.stredni-panel > div.panel.panel-default.panel-filter > div > div.menu-select.panel-control.responsive-control > select");
        foodDatePicker.addEventListener("change", handleFoodList);

        const foodDayPicker = 
            document.querySelector("body > div.warp > div.stredni-panel > div.panel.panel-default.panel-filter > div > div.day-select.panel-control.responsive-control > select");
        if(foodDayPicker != undefined) {
            foodDayPicker.addEventListener("change", handleFoodList);
        }
    }

    //#10 Fix
    const rightPanel = document.querySelector("body > div.warp > div.pravy-panel");
    rightPanel.remove();
};


let logger = {
    log: (msg, sender) => {/*NOOP*/ },
    logAlways: (msg, sender) => {
        console.log(`${sender} => `);
        console.log(msg);
    }
}

const establishDeveloperMode = async (value) => {
    logger.logAlways(`isDeveloper: ${value}`, "setDeveloperMode");

    if (value) {
        let lastSender = null;
        logger.log = (msg, sender) => {
            if((sender) && (lastSender !== sender || !lastSender))
            {
                lastSender = sender;
                console.log(`${sender} => `);
            }
            console.log(msg);
        }
    } else {
        logger.log = () => {
            //NOOP
        }
    }
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    logger.log(msg, "On message");
    switch (msg.type) {
        case "LOAD":

            //msg contains tabInfo
            //Establish developer mode
            await establishDeveloperMode(msg.isDeveloper);

            //Then invoke onTabUpdated
            await onTabUpdated(msg);
            break;
        case "TEST":
            logger.log(msg.msg, "Test button");
            break;
        case "DEVELOPER_CHANGED":
            await establishDeveloperMode(msg.isDeveloper);
            break;
    }
});
