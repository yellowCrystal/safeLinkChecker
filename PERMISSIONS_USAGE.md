# Permissions Usage for Safe Link Checker

This document explains why the Safe Link Checker extension requires certain permissions to function. This information is intended to assist with the Chrome Web Store review process.

## 1. `permissions`

### `activeTab`
*   **Purpose:** To allow the extension to run its script on the currently active tab when the user interacts with it. This is a less invasive permission than requesting access to all tabs.

### `scripting`
*   **Purpose:** To execute the `content_script.js` file. This script is responsible for inserting the "Safety Check" buttons next to links on supported pages (like Google search results) and for displaying the analysis results.

### `tabs`
*   **Purpose:** To send messages from the background script (`background.js`) to the content script (`content_script.js`) running in a specific tab. This is used to deliver the safety analysis results back to the page where the user initiated the check.

### `storage`
*   **Purpose:** To use `chrome.storage.sync` to save the user's preference for enabling or disabling the extension. This allows the user's choice to be persisted across browser sessions.

## 2. `host_permissions`

### `*://*.google.com/*` and `*://*.google.co.kr/*`
*   **Purpose:** To allow the `content_script.js` to run on Google search result pages. This is the primary context where the "Safety Check" buttons are added.

### `<all_urls>`
*   **Purpose:** This permission is required for the `fetch()` request in `background.js` to retrieve the HTML content of any link the user chooses to analyze. Without this, the extension would be unable to analyze the content of pages from various domains, which is a core feature of the link checker. The fetch is only initiated by an explicit user action (clicking the "Safety Check" button).
