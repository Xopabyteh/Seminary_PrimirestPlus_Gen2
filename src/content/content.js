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

const writeFoodRating = async (food = '', rating = 1) => {
    const response = await chrome.runtime.sendMessage({
        type: 'WRITE_FOOD_RATING',
        food: food,
        rating: rating
    });
    logger.log(response, 'writeFoodRating()');
}

var ratingStatisticsHTMLTemplate = '';
var ratingControlHTMLTemplate = '';
const initializeRatingDisplayTemplates = async () => {
    const ratingStatisticsURL = await chrome.runtime.getURL('ratingStatistics.html');
    ratingStatisticsHTMLTemplate = await (await fetch(ratingStatisticsURL)).text();

    const ratingControlURL = await chrome.runtime.getURL('ratingControl.html');
    ratingControlHTMLTemplate = await (await fetch(ratingControlURL)).text();
}

const addRatingDisplay = async (foodRowElement = document.createElement(), foodObject) => {
    //Statistics
    const ratingStatisticsHolder = document.createElement('div');
    ratingStatisticsHolder.className = 'rating-statistics'

    // {
    //     foodRating: foodRating,
    //     userRating: userRating
    // };
    const foodRatingObject = await chrome.runtime.sendMessage({
        type: 'GET_FOOD_RATING',
        food: foodObject.foodName
    });
    const foodRating = foodRatingObject.foodRating;
    const userRating = foodRatingObject.userRating;
    logger.log(foodRating, 'writeFoodRating()');

    //0: number of 1s, 1: number of 2s, ...
    const ratingCounts = [0, 0, 0, 0];
    let totalRatingsCount = 0;
    for (const rating of foodRating) {
        ratingCounts[rating-1]++;
        totalRatingsCount++;
    }

    //Dont divide by zero, set all to 0
    if(totalRatingsCount == 0) {
        totalRatingsCount = 1;
    }

    const median = (ratingCounts[0] + ratingCounts[1]*2 + ratingCounts[2]*3 + ratingCounts[3]*4) / totalRatingsCount;
    const ratingStatisticsHTML = ratingStatisticsHTMLTemplate
                                .replace('__SIMPLE_RATING__', `${median}`)
                                .replace('__RATES_COUNT__', totalRatingsCount)
                                .replace('__1_STARS_%__', `${(ratingCounts[0] / totalRatingsCount * 100.0)}%`)
                                .replace('__2_STARS_%__', `${(ratingCounts[1] / totalRatingsCount * 100.0)}%`)
                                .replace('__3_STARS_%__', `${(ratingCounts[2] / totalRatingsCount * 100.0)}%`)
                                .replace('__4_STARS_%__', `${(ratingCounts[3] / totalRatingsCount * 100.0)}%`)

    ratingStatisticsHolder.innerHTML = ratingStatisticsHTML;

    //Controls
    let ratingControl = foodRowElement.querySelector('td:nth-child(2)');
    ratingControl.outerHTML = ratingControlHTMLTemplate;
    
    //Evil reload
    ratingControl = foodRowElement.querySelector('td:nth-child(2)');

    const stars = ratingControl.querySelectorAll('a');
    let maxDecidedStarIndex = 0;

    const setHoverStars = (index) => {
        for (let i = 0; i < stars.length; i++) {
            stars[i].classList.toggle('decided', false);

            if (i < index) {
                stars[i].classList.toggle('hover', true);
            } else {
                stars[i].classList.toggle('hover', false);
            }
        }
    }

    const resetStars = () => {
        for (let i = 0; i < stars.length; i++) {
            stars[i].classList.toggle('hover', false);

            if (i < maxDecidedStarIndex) {
                stars[i].classList.toggle('decided', true);
            } else {
                stars[i].classList.toggle('decided', false);
            }
        }
    }
        
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const value = parseInt(star.getAttribute('value'));
        maxDecidedStarIndex = value;
        resetStars();
        writeFoodRating(foodObject.foodName, value);
      });
    
      star.addEventListener('mouseover', () => {
        const value = parseInt(star.getAttribute('value'));
        setHoverStars(value);
      });
    
      star.addEventListener('mouseout', () => {
        resetStars();
      });
    });

    if(userRating != undefined) {
        maxDecidedStarIndex = userRating;
        resetStars();
    }
    foodRowElement.appendChild(ratingStatisticsHolder);
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
        await initializeRatingDisplayTemplates();

        //Init fb auth to retrieve user ratings
        const fb_auth = await chrome.runtime.sendMessage({
            type: 'INIT_FB_AUTH'
        });

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
            addRatingDisplay(foodRowElement, foodObject);
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
