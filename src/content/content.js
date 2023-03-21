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

    logger.log(foodPictureSearch);
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
let storedFoodItemQueries = undefined;

import { compareTwoStrings } from 'string-similarity'; 

//Caches all image refs from database and uses it as a lookup table for loading existing images
//Food match is threshold based
const tryGetExistingImage = async (foodName) => {
    if(storedFoodItemQueries == undefined) {
        storedFoodItemQueries = [];
        const res = await listAll(ref(firebaseStorage))
        const storedFoodItems = res.items;

        for (const storedFoodItem of storedFoodItems) {
            const name = storedFoodItem.name;
            const fileTypeIndex = name.lastIndexOf(".");
            let query = name.substring(0, fileTypeIndex); // String without file type: "hello.png" => "hello"
            storedFoodItemQueries.push({itemReference: storedFoodItem, query: query});
        }
        logger.log(storedFoodItemQueries, "Initialize food queries");
    }


    //If there is a string, that matches a foodname in atleast n%, use it 
    const storedFoodItem = storedFoodItemQueries.find(e => {
        console.log(`${e.query}|||${foodName}`);
        compareTwoStrings(e.query, foodName) > 0.5;
    });
    if(storedFoodItem == undefined || storedFoodItem.itemReference == undefined) {
        return undefined;
    }
    
    try {
        const url = await getDownloadURL(storedFood)
        const response = await fetch(url);
        return response.url;
    } catch (error) {
        console.error(error);
    }

}

const addGoogleImageWithControl = async (foodImagesHolder, foodImageElement, foodName) => {
    let foodPictureSearch = await googleSearchForFoodPicture(foodName, 1, 0);
    if(foodPictureSearch.foodPicture === undefined || foodPictureSearch.foodPicture.link === undefined) {
        logger.log('No image avaliable', '#11');
        return;
    }

    let pictureUrl = foodPictureSearch.foodPicture.link;
    foodImageElement.setAttribute("src", pictureUrl);

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
        foodImageElement.setAttribute("src", pictureUrl);
    }
    //Enable searching only after full image load
    foodImageElement.onload = () => {
        imageLoading.classList.toggle('active', false);
        btnSearchForNew.disabled = false;
    }

    const imageLoading = document.createElement('div');
    imageLoading.className = 'food-image-loading'

    //Add controls and image
    foodImagesHolder.appendChild(imageLoading);
    foodImagesHolder.appendChild(btnSearchForNew);
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


    //Create image holder
    const foodImagesHolder = document.createElement("div");
    foodImagesHolder.className = 'food-images-holder';
    foodRowElement.appendChild(foodImagesHolder);
    
    const foodImageElement = document.createElement("img");
    foodImageElement.className = 'food-image';
    foodImageElement.setAttribute("alt", foodName);

    const existingImage = await tryGetExistingImage(foodName);
    logger.log(existingImage);
    if(existingImage !== undefined) {
        //Use existing image
        foodImageElement.setAttribute('src', existingImage);
    } else {
        //Use google image
        await addGoogleImageWithControl(foodImagesHolder, foodImageElement, foodName);
    }

    foodImagesHolder.appendChild(foodImageElement);
}

const handleFoodList = async () => {
    const onFoodBoardingMutate = async (mutationList, observer) => {
        logger.log(mutationList, "onFoodBoardingMutate()");
        //This `if` is necessary, because when the date in the food picker is changed, it first removes the whole table, then it adds an alert and then it adds the table again
        //We want to observe until the second table is added and the alret change produces only 2 mutations, so we listen until we get more than 2 mutations at once => we got our new table
        if (mutationList.length > 2) {
            observer.disconnect();
        }

        //#8
        //NewPrice query = .jidlo-mini thead tr th:nth-child(3)
        //OldPrice query = .minWidth95x.text-right strong
        let newPriceElements = document.querySelectorAll(".jidlo-mini thead tr th:nth-child(3)");
        let oldPriceElement = document.querySelector(".minWidth95x.text-right strong");
        for (let newPriceElement of newPriceElements) {
            newPriceElement.innerHTML = `${newPriceElement.innerHTML}: ${oldPriceElement.innerHTML},-`;
        }
        logger.log(newPriceElements, "#8");
        logger.log(oldPriceElement, "#8");

        //#9    
        let calorieCircleParentElements = document.querySelectorAll(".jidlo-mini tbody tr td:has(img)");

        logger.log(calorieCircleParentElements, "#9a");

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

        if(foodRowElements.length % 3 == 1) {
            //We're on index page
            const display = foodRowElements[0];
            const deleteButton = display.querySelector('.text-center');
            deleteButton.remove();

            logger.log(foodRowElements, "Index page fix")
            soupParts = getSoupParts([foodRowElements[1], foodRowElements[2], foodRowElements[3]]);
        }

        soupParts = soupParts ?? getSoupParts(foodRowElements);
        logger.log(soupParts, "#11 Soup parts");

        for (const foodRowElement of foodRowElements) {
            addImageToFood(foodRowElement, soupParts);
        }
    };

    const observer = new MutationObserver(onFoodBoardingMutate);
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
        let foodDatePicker =
            document.querySelector(
                "body > div.warp > div.stredni-panel > div.panel.panel-default.panel-filter > div > div.menu-select.panel-control.responsive-control > select");
        foodDatePicker.addEventListener("change", handleFoodList);
    }

    //#10 Fix
    let rightPanel = document.querySelector("body > div.warp > div.pravy-panel");
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
    logger.log(msg);
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
