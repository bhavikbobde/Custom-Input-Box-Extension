#!/bin/bash

echo "🦊 Testing Smart Input Box Firefox Extension"
echo "============================================="

# Check if Firefox is installed
if ! command -v firefox &> /dev/null; then
    echo "❌ Firefox not found. Please install Firefox first."
    exit 1
fi

# Check if web-ext is installed
if ! command -v web-ext &> /dev/null; then
    echo "📦 web-ext not found. Installing..."
    npm install -g web-ext
fi

echo "🔍 Validating extension..."
web-ext lint

echo ""
echo "🚀 Starting Firefox with extension..."
echo "   - Extension will be loaded temporarily"
echo "   - Test on various websites with input fields"
echo "   - Check console for any errors"
echo ""

web-ext run --firefox-profile=dev-profile --keep-profile-changes

echo "✅ Testing complete!" 