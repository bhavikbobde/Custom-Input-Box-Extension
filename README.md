# Smart Input Box

Hello there! Thanks for checking out Smart Input Box. This is a browser extension I built to solve a personal frustration I've always had with web forms: small, awkwardly placed text boxes. My goal was to create a more comfortable and productive typing experience, no matter what website you're on.

## What's the Big Idea?

At its core, Smart Input Box gives you a spacious, floating text area whenever you click on an input field. Instead of being stuck with a tiny box, you get a clean, focused environment to write in.

But it's more than just a bigger box. I've also integrated some AI-powered tools (using the Google Gemini API) to help with common web tasks, like fixing messy layouts and understanding complex forms.

## Features

I've designed the extension to be simple and intuitive, with two main modes:

### Habit Mode

This is the default mode, designed to seamlessly fit into your daily browsing.

*   **Floating Textbox**: When you click on an input field, a larger textbox appears.
*   **Live Sync**: Whatever you type in the floating box is instantly updated in the original field.
*   **Custom Positioning**: You can choose to have the box appear at the top of the screen or right in the center. The extension will remember your preference for each site you visit.

### Advanced Mode

For those who want a bit more power, Advanced Mode unlocks a few AI-powered features. You'll need a free Google Gemini API key to use these.

*   **AI-Powered CSS Fixes**: Ever been on a site where the input fields are a total mess? This feature lets an AI analyze the page and apply some quick CSS changes to make things more usable.
*   **AI Page Analysis**: If you're on a long or confusing form, this feature gives you a quick summary of what the page is asking for, so you can understand it at a glance.

## How to Get Started

1.  **Install the Extension**: (I'll add a link here once it's on the Firefox Add-ons store)
2.  **Click an Input Field**: Just navigate to any webpage and click on a text box or text area. The floating box should appear.
3.  **Try Advanced Mode**:
    *   Click on the extension icon in your browser's toolbar to open the settings popup.
    *   Switch to "Advanced" mode.
    *   You'll need a Google Gemini API key. There's a link in the settings that will take you to Google AI Studio where you can get one for free.
    *   Once you've pasted your key, you'll see the AI feature buttons appear in the floating box.

## A Note on Privacy

Your privacy is important. Here's how your data is handled:

*   Your Gemini API key is stored only on your computer, in your browser's local storage. It is only ever sent to Google's servers when you use an AI feature.
*   The HTML content of the pages you visit is only sent to the Gemini API when you explicitly use an AI feature. It's never stored or logged anywhere.

## The Tech Stack

For those interested, this extension is built with vanilla JavaScript, HTML, and CSS. It uses a content script to interact with web pages, a background script to handle API calls, and a simple popup for settings. No fancy frameworks, just plain old web tech.

## Contributing

This is a personal project, but I'm always open to feedback and suggestions. If you have an idea for a new feature or find a bug, please feel free to open an issue on the GitHub repository.

Thanks again for trying out Smart Input Box. I hope you find it as useful as I do! 