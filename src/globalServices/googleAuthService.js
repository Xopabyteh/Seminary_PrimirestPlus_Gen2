const getProfilePicture = async (token) => {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const profileData = await response.json();
      
      // Get the URL of the user's profile picture
      const profilePictureUrl = profileData.picture;
      return profilePictureUrl;
}

var _authToken = undefined;
const signInWithGoogle = async (interactive = false) => {
    if(_authToken != undefined)
      return _authToken;

    try {
      const authToken = await chrome.identity.getAuthToken({ 'interactive': interactive });
      _authToken = authToken;
      return authToken.token;
    }
    catch {
      return undefined;
    }
}

const clearAuthToken = async (token = '') => {
  await chrome.identity.removeCachedAuthToken({token: token});
}

export {
    signInWithGoogle,
    clearAuthToken,
    getProfilePicture
}