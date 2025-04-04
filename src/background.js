// Listen for clicks on the browser action icon.
chrome.action.onClicked.addListener((tab) => {
  // Check if the tab's URL is a Wikipedia article page.
  if (tab.url && tab.url.includes("wikipedia.org/wiki/") && !tab.url.includes("/wiki/Main_Page")) {
    // Inject the content script into the active tab.
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }).then(() => {
      console.log("Wikipedia Age Calculator script injected.");
    }).catch(err => {
      console.error("Failed to inject script: ", err);
    });
  } else {
    console.log("Not a Wikipedia article page.");
    // Optionally, provide feedback to the user that it only works on Wikipedia articles
    // (e.g., by briefly changing the icon or showing a notification - more complex)
  }
});
