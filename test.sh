#!/bin/bash
echo "🚀 Smart Input Box Extension - Test Script"
echo "==========================================="
echo ""
echo "📦 Checking files..."
for file in manifest.json background.js content.js popup.html popup.js popup.css styles.css README.md; do
  if [ -f "$file" ]; then
    echo "✅ $file exists"
  else
    echo "❌ $file missing"
  fi
done

echo ""
echo "📁 Checking directories..."
if [ -d "icons" ]; then
  echo "✅ icons/ directory exists"
  echo "   $(ls icons/ | wc -l) icon files found"
else
  echo "❌ icons/ directory missing"
fi

echo ""
echo "🔧 Extension is ready for testing!"
echo "📋 Next steps:"
echo "   1. Open Chrome and go to chrome://extensions/"
echo "   2. Enable Developer mode"
echo "   3. Click 'Load unpacked' and select this folder"
echo "   4. Test on any website with input fields"
echo ""
echo "🎯 Features to test:"
echo "   • Focus on any input field - floating box should appear"
echo "   • Type in floating box - should sync with original field"
echo "   • Try keyboard shortcuts (Ctrl+Shift+Y, Ctrl+Shift+U)"
echo "   • Test position toggle in popup settings"
echo "   • For AI features: add OpenAI API key and switch to Advanced mode" 