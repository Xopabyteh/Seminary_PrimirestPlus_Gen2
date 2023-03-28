const openLink = async (actionLinkElement = document.createElement()) => {
    const properties = {
        url: actionLinkElement.getAttribute('value')
    };
    await chrome.tabs.create(properties);
}

export {
    openLink
}