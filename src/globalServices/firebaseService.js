import { initializeApp } from "firebase/app";
import { getStorage, ref as storage_ref, getDownloadURL, listAll as storage_listAll } from "firebase/storage";
import { getDatabase, ref as db_ref, set as db_set } from 'firebase/database';
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
const testFirebaseDB = async (authToken) => {
    try {
        const credential = GoogleAuthProvider.credential(null, authToken);
        const userCredential = await signInWithCredential(getAuth(firebaseApp), credential);
        const user = userCredential.user;
        console.log(userCredential);
    
        // Write a rating to the database
        const food = 'pizza';
        const rating = 4;
        const dbKeyRef = db_ref(db, 'FoodRatings/' + user.uid + '/' + food);
        console.log(dbKeyRef);
        await db_set(dbKeyRef, rating);
        console.log('Rating saved to database');
      } catch (error) {
        console.error('Error:', error);
      }
}

export {
    loadStoredImages,
    getDownloadURL,
    testFirebaseDB
}