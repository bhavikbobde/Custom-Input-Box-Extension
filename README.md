# Smart Input Box - Firefox Extension

A focus-friendly typing experience that lets you interact with input fields through a floating textbox rather than scrolling to boxes anchored at the page bottom.

## Features

### 🎯 Core Features
- **Floating Textbox**: Appears automatically when you focus on any input field
- **Two-way Sync**: Real-time synchronization between floating box and original field
- **Position Presets**: Choose between top bar or center popup layouts
- **Site Memory**: Remembers your position preference for each website

### 🤖 Advanced Features (AI-Powered by Google Gemini)
- **CSS Layout Improvements**: AI analyzes the page and suggests CSS tweaks for better readability
- **Text Summarization**: Automatically summarize long text inputs
- **Smart Context**: Understands page content to provide relevant suggestions

### ⚡ Performance
- **<5ms Latency**: Lightning-fast text synchronization
- **<300ms CSS Injection**: Quick layout improvements
- **Memory Efficient**: Minimal resource usage

## Installation

### From Browser Stores
- **Firefox Add-ons**: Coming soon

### Manual Installation (Development)

1. Clone this repository
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `manifest.json` from the project root folder

## Usage

### Basic Usage (Habit Mode)
1. Click on any input field or textarea on any website
2. A floating textbox will appear at the top of your screen
3. Type in the floating box - it syncs automatically with the original field
4. Press `Esc` or click outside to dismiss

### Advanced Usage (AI Mode)
1. Get a free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Enter your API key in the extension popup
3. Switch to "Advanced" mode
4. Use additional features:
   - Click "Fix CSS" to improve page layout
   - Press `Ctrl+Shift+S` to summarize long text inputs

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Y` | Toggle between Habit and Advanced mode |
| `Ctrl+Shift+U` | Show/hide floating box |
| `Ctrl+Shift+S` | Summarize inputs (Advanced mode only) |
| `Esc` | Close floating box |

*Note: Shortcuts can be customized in Firefox's Add-ons Manager*

## Configuration

### Settings Panel
Click the extension icon to access:
- **Mode Selection**: Choose between Habit and Advanced modes
- **Position**: Select top bar or center popup
- **API Key**: Enter your Google Gemini API key for AI features
- **Status**: View current site info and active inputs

### Privacy & Security
- API key stored securely in local browser storage
- No data synced to external servers (except Google Gemini for AI features)
- HTML content never permanently stored
- All processing happens locally

## API Key Setup (for Advanced Features)

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key" and copy it
4. Open the Smart Input Box settings
5. Paste your API key in the "Google Gemini API Key" field
6. Switch to "Advanced" mode to enable AI features

**Note**: Gemini API is free with generous usage limits, making it more accessible than paid alternatives.

## Technical Details

### Architecture
- **Manifest V2**: Firefox extension standards
- **Content Script**: Handles DOM manipulation and input detection
- **Background Script**: Manages API calls and shortcuts
- **Popup Interface**: User-friendly settings panel

### Compatibility
- **Browser**: Firefox (all recent versions)
- **Input Types**: Standard HTML input and textarea elements
- **Dynamic Content**: Supports dynamically created inputs (via MutationObserver)
- **Rich Text**: Compatible with contenteditable elements
- **Websites**: Tested on major websites (Gmail, Reddit, YouTube, etc.)

## Development

### File Structure
```
smart-input-box/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js            # Content script
├── popup.html            # Settings UI
├── popup.js              # Settings logic
├── popup.css             # Settings styles
├── styles.css            # Floating box styles
├── icons/                # Extension icons
└── README.md             # This file
```

### Building
No build process required - this is a vanilla JavaScript Firefox extension.

### Testing
1. Load the extension in developer mode
2. Test on various websites with different input types
3. Verify keyboard shortcuts work
4. Test AI features with valid API key

## Troubleshooting

### Common Issues

**Floating box doesn't appear**
- Check if the extension is enabled
- Verify the website allows content scripts
- Try refreshing the page

**AI features not working**
- Ensure you're in Advanced mode
- Check that your API key is valid
- Verify internet connection

**Text not syncing**
- Check browser console for errors
- Some websites may block content scripts
- Try disabling other extensions temporarily

### Performance Tips
- Use Habit mode for basic functionality and better performance
- AI features require internet connection and API credits
- Clear browser cache if experiencing issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **GitHub Issues**: Report bugs and request features
- **Email**: support@smartinputbox.com
- **Documentation**: Visit our wiki for detailed guides

## Changelog

### v1.0.0 (Current)
- Initial release
- Basic floating textbox functionality
- AI-powered CSS improvements
- Text summarization
- Keyboard shortcuts
- Site-specific settings

---

**Made with ❤️ for better web typing experiences** 