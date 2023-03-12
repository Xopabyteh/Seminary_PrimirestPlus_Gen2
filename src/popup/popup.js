const sendMessageToScolarestTab = async (msg) =>
{
    chrome.tabs.query(
        {
            active: true,
            currentWindow: true
        },
        async (tabs) => {
            let tab = tabs[0];
            if (!tab.url || !tab.url.includes("mujprimirest.cz")) {
                return;
            }
            const response = await chrome.tabs.sendMessage(
                tab.id,
                msg
            );
            return response;
        }
    );
}

const onTestButton = () => {
    sendMessageToScolarestTab({
        type: "TEST",
        msg: "Hello content"
    });
}
const onDeveloperModeButton = () => {
    chrome.runtime.sendMessage({
        type: "TOGGLE_DEVELOPER"
    });
}



var buttonDeveloperMode;
const init = async () => {
    const buttonTest = document.getElementById("button-test");
    buttonTest.addEventListener("click", onTestButton);


    chrome.runtime.sendMessage({
        type: "GET_DEVELOPER"
    });
    
    buttonDeveloperMode = document.getElementById("button-developerMode");
    buttonDeveloperMode.addEventListener("click",onDeveloperModeButton);
}

chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
    console.log(msg);
    switch(msg.type) {
        //Activate the developer slider to match storage
        case "DEVELOPER_CHANGED": 
            buttonDeveloperMode.classList.toggle('active', msg.isDeveloper);
            break;
    }
});

document.addEventListener("DOMContentLoaded", init);

