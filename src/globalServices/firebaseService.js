import { initializeApp } from "firebase/app";
import { getStorage, ref as storage_ref, getDownloadURL, listAll as storage_listAll } from "firebase/storage";
import { getDatabase, ref as db_ref, set as db_set, get as db_get } from 'firebase/database';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDuz41HpiuRIhAud4-8342byRxCiCxK4Nk",
    authDomain: "seminary-primirest-plus-fb.firebaseapp.com",
    databaseURL: "https://seminary-primirest-plus-fb-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "seminary-primirest-plus-fb",
    storageBucket: "seminary-primirest-plus-fb.appspot.com",
    messagingSenderId: "525183147276",
    appId: "1:525183147276:web:d5700e78ec1033cabb7d29",
    measurementId: "G-VJZEBNY05B"
};

const firebaseApp = initializeApp(firebaseConfig);

const firebaseStorage = getStorage(firebaseApp);
let storedFoodItems = undefined;
//Uses caching
const loadStoredImages = async () => {
    if(storedFoodItems == undefined) {
        // console.log('downloading images');
        storedFoodItems = [];
        const res = await storage_listAll(storage_ref(firebaseStorage))
        const refs = res.items;
        
        for (const ref of refs) {
            const name = ref.name;
            const fileTypeIndex = name.lastIndexOf(".");
            let query = name.substring(0, fileTypeIndex); // String without file type: "hello.png" => "hello"
            storedFoodItems.push({ref: ref, query: query});
        }
        
        // logger.log(storedFoodItems, 'Init storedFoodItems')
    }
    return storedFoodItems;
}

const db = getDatabase(firebaseApp);
var userCredential;
var user;

const initializeAuth = async (googleAuthToken) => {
    const credential = GoogleAuthProvider.credential(null, googleAuthToken);
    userCredential = await signInWithCredential(getAuth(firebaseApp), credential);
    user = userCredential.user;
}
const clearAuth = async () => {
    userCredential = undefined;
    user = undefined;
}
const userAuthenticated = () => {
    return user != undefined && user.uid != undefined;
}

//-2 What the hell.
//-1: error
//0: sucess
const writeFoodRating = async (food = '', rating = 1) => {
    if(!userAuthenticated()) { 
        console.error('User not authenticated');
        return -1;
    }    

    try {
        // Write a rating to the database
        const dbKeyRef = db_ref(db, 'FoodRatings/' + user.uid + '/' + food);
        console.log(dbKeyRef);
        await db_set(dbKeyRef, rating);
        return 0;
    } catch (error) {
        console.error(error);
        return -1;
    }
    return -2
}
var storedRatings = undefined;
const loadStoredRatings = async () => {
    const foodRatingsRef = db_ref(db, 'FoodRatings');
    const foodRatings = await db_get(foodRatingsRef);
    storedRatings = foodRatings;
}
const getFoodRating = async (food = '') => {
    if(storedRatings == undefined)
        return undefined;

    try {
        // Query the ratings for all food ratings for the given food item
        const foodRatings = [];

        return storedRatings;
    }
    catch (error) {
        console.error(error);
        return undefined;
    }
}

export {
    loadStoredImages,
    getDownloadURL,
    initializeAuth,
    clearAuth,
    writeFoodRating,
    userAuthenticated,
    loadStoredRatings,
    getFoodRating
    // testFirebaseDB
}