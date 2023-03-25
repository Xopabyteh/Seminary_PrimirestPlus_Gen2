import { initializeApp } from "firebase/app";
import { getStorage, ref as storage_ref, getDownloadURL, listAll as storage_listAll } from "firebase/storage";
import { } from 'firebase/database';
import { } from 'firebase/auth';

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

const testFirebaseDB = async (authToken) => {
    firebaseApp.datab
}

export {
    loadStoredImages,
    getDownloadURL,
}