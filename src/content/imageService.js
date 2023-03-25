const googleSearchForFoodPicture = async (foodName, index, sizeIndex) => {
    const foodPictureSearch = await chrome.runtime.sendMessage({
        type: "GET_IMAGE",
        query: foodName,
        index: index,
        sizeIndex: sizeIndex
    })

    return foodPictureSearch;
}

import { loadStoredImages, getDownloadURL } from '../globalServices/firebaseService';
import { compareTwoStrings } from 'string-similarity'; 
//Caches all image refs from database and uses it as a lookup table for loading existing images
//Food match is threshold based
const tryGetExistingImage = async (foodName) => {
    const storedImages = await loadStoredImages();

    //If there is a string, that matches a foodname in atleast n%, use it 
    const storedFoodItem = storedImages.find(e => compareTwoStrings(e.query, foodName) > 0.8);
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
        //logger.log('No image avaliable', '#11');
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

const addImageToFood = async (foodRowElement, foodObject) => {
    if (!foodRowElement) {
        return;
    }

    const foodName = foodObject.foodName;

    //Add food highlighting
    //logger.log(foodName, "#11 Names");

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

const removeExistingImageHolders = () => {
    while(true) {
        const holder = existingImageHolders.pop();
        if(holder == undefined) {
            break;
        }
        holder.remove();
    }
}

export {
    addImageToFood,
    loadStoredImages,
    removeExistingImageHolders
}