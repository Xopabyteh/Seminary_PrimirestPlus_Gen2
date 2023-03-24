//This is burning trash, maybe i'll get to it later
const changeColorTheme = async (darkMode) => {
    if(darkMode == undefined) {
        darkMode = await chrome.runtime.sendMessage({
            type: 'GET_STORAGE_ITEM',
            key: 'darkMode',
            defaultValue: false
        });
    }

    const root = document.querySelector(':root');

    // '--text_normal:' 	            ,  '#fff   ';
    // '--text_header:'                 ,  '#7289da';
    // '--background_bright:'           ,  '#99aab5';
    // '--background_dark_alternate:'   ,  '#2F3437';
    // '--background_dark:'             ,  '#2c2f33';
    // '--background_darkest:'          ,  '#23272a';
    if(darkMode) {
        //Dark theme
        root.style.setProperty('--text_normal' 	            ,  '#fff   ');
        root.style.setProperty('--text_header'                 ,  '#7289da');
        root.style.setProperty('--background_bright'           ,  '#99aab5');
        root.style.setProperty('--background_dark_alternate'   ,  '#2F3437');
        root.style.setProperty('--background_dark'             ,  '#2c2f33');
        root.style.setProperty('--background_darkest'          ,  '#23272a');
        root.style.setProperty('--dark_mode' , 1);

    } else {
        //Light theme

        // root.style.setProperty('--text_normal' 	            ,     '#000   ');
        // root.style.setProperty('--text_header'                 ,  '#7871AA');
        // root.style.setProperty('--background_bright'           ,  '#774E24');
        // root.style.setProperty('--background_dark_alternate'   ,  '#AA7D48');
        // root.style.setProperty('--background_dark'             ,  '#DCAB6B');
        // root.style.setProperty('--background_darkest'          ,  '#E8F9FD'); 
        root.style.setProperty('--text_normal' , '#333');
        root.style.setProperty('--text_header' , '#007bff');
        root.style.setProperty('--background_bright' , '#f5f5f5');
        root.style.setProperty('--background_dark_alternate' , '#dcdcdc');
        root.style.setProperty('--background_dark' , '#f2f2f2');
        root.style.setProperty('--background_darkest' , '#fff');
        root.style.setProperty('--dark_mode' , 0);
    }
}

export {
    changeColorTheme
}