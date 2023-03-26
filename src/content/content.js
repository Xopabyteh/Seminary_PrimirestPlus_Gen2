const getSoupParts = (foodRowElements) => {
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

const highlightFoodName = async (foodObject) => {
    const highlightedHTML = `${foodObject.soupName} <b>${foodObject.foodName}</b> ${foodObject.foodDetail}`;
    foodObject.foodNameElement.innerHTML = highlightedHTML;
}

const refactorPriceElements = () => {
    let newPriceElements = document.querySelectorAll(".jidlo-mini thead tr th:nth-child(3)");
    let oldPriceElement = document.querySelector(".minWidth95x.text-right strong");
    for (let newPriceElement of newPriceElements) {
        newPriceElement.innerHTML = `${newPriceElement.innerHTML}: ${oldPriceElement.innerHTML},-`;
    }
}

//TODO: Optimize with food object rows
const refactorCalorieElements = () => {
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
}

var ratingControlHTMLTemplate = '';
const initializeRatingControlTemplate = async () => {
    const ratingControlURL = chrome.runtime.getURL('ratingControl.html');
    ratingControlHTMLTemplate = await (await fetch(ratingControlURL)).text();
}

const addRatingControl = async (foodRowElement = document.createElement(), foodObject) => {
    const ratingControlHolder = document.createElement('div');
    ratingControlHolder.className = 'rating-control'

    const ratingControlHTML = ratingControlHTMLTemplate
                                .replace('__SIMPLE_RATING__', '4.4')
                                .replace('__RATES_COUNT__', '6')
                                .replace('__4_STARS_%__', '60%')
                                .replace('__3_STARS_%__', '12%')
                                .replace('__2_STARS_%__', '8%')
                                .replace('__1_STARS_%__', '20%')

    ratingControlHolder.innerHTML = ratingControlHTML;

    foodRowElement.appendChild(ratingControlHolder);
}

import { addImageToFood, loadStoredImages, removeExistingImageHolders } from './imageService';
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

        //Validate, wether we should really update the food table
        if(mutationList.length >= 1 && mutationList[0].target.getAttribute('id') !== 'boarding') {
            disconnectObserver();
        } else {
            return;
        }


        logger.log('Ready to work with foodList', 'Observer')
        
        removeExistingImageHolders();

        //#8
        refactorPriceElements();

        //#9    
        refactorCalorieElements();

        //Get food table elements
        const foodRowElements = document.querySelectorAll(".jidlo-mini tbody tr");
        let soupParts = undefined;
        
        if(foodRowElements.length % 3 == 1) {
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
        
        //#11 - Add images to food
        //Load stored images
        await loadStoredImages();

        //Init rating template so that it can be used to add controls later
        await initializeRatingControlTemplate();

        const getFoodObject = (foodNameElement, soupParts) => {
            let foodName = foodNameElement.innerHTML;
            let soupName = undefined;
        
            //Remove the soup part from the name
            for (let soupPart of soupParts) {
                if (foodName.indexOf(soupPart) !== -1) {
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
        
            return {foodName: foodName, soupName: soupName, foodDetail: foodDetail, foodNameElement: foodNameElement};
        }

        //Add images to food
        //Highlight food name
        //Add rating control
        for (const foodRowElement of foodRowElements) {
            const foodNameElement = foodRowElement.querySelector("td:nth-child(4) a");
            let foodObject = getFoodObject(foodNameElement, soupParts);

            highlightFoodName(foodObject);
            addImageToFood(foodRowElement, foodObject);
            addRatingControl(foodRowElement, foodObject);
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
    const getPageSections = (url) => {
        const pageSections = 
            url.substring(url.indexOf('.cz')+3)
            .toLowerCase()
            .split('/');
        return pageSections ?? [];
    }    
    const url = tabInfo.tab.url;
    let pageSections = getPageSections(url);
    logger.log(pageSections, 'Page sections');

    if(pageSections.every(x => x === '' || x === 'cs') || pageSections.some(x=> x === 'boarding')) {
        handleFoodList();

        //#10 Fix
        const rightPanel = document.querySelector(".pravy-panel");
        if(rightPanel != undefined) {
            rightPanel.remove();
        }
    }
    
    if (pageSections.some(x => x === 'boarding')) {

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

    const logo = document.querySelector('.logo');
    if(logo != undefined) {
        logo.style.filter = 'invert(var(--dark_mode))';
    }
};


let logger = {
    log: (msg, sender) => {/*NOOP*/ },
    logAlways: (msg, sender) => {
        console.log(`${sender} => `);
        console.log(msg);
    }
}

const establishDeveloperMode = async (value) => {
    if(value == undefined) {
        value = await chrome.runtime.sendMessage({
            type: 'GET_STORAGE_ITEM',
            key: 'isDeveloper',
            defaultValue: false
        });
    }

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

import { changeColorTheme } from '../globalServices/colorThemeService';
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    logger.log(msg, "On message");
    if(msg.type == "LOAD") {
        
        changeColorTheme()
            .then(() => establishDeveloperMode())
            .then(() => onTabUpdated(msg));
    } 
    else if(msg.type == 'OPTION_CHANGED') {
        const key = msg.key;
        const value = msg.value;

        if(key == 'isDeveloper') {
            establishDeveloperMode(value);
        } else if(key == 'darkMode') {
            changeColorTheme(value);
        }
    }
});
