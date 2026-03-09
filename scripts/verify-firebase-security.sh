#!/bin/bash

# Firebase Security Verification Script
# Run this AFTER deploying firebase-rules.json to verify security

FIREBASE_URL="https://benxe-management-20251218-default-rtdb.asia-southeast1.firebasedatabase.app"
BACKEND_LOCAL="http://localhost:3000/api"
BACKEND_PROD="https://ben-xe-backend.onrender.com/api"

echo "================================================"
echo "Firebase Security Verification Script"
echo "================================================"
echo ""

# Test 1: Direct Firebase access should be DENIED
echo "[TEST 1] Testing direct Firebase access (should be DENIED)..."
echo "GET $FIREBASE_URL/vehicles.json"
RESPONSE=$(curl -s "$FIREBASE_URL/vehicles.json")
echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q "Permission denied"; then
    echo "✅ PASS: Firebase correctly denies public access"
else
    echo "❌ FAIL: Firebase is still publicly accessible!"
    echo "   Expected: Permission denied"
    echo "   Got: $RESPONSE"
fi
echo ""

# Test 2: Test multiple collections
echo "[TEST 2] Testing other collections..."
for COLLECTION in "drivers" "operators" "routes" "dispatch_records"; do
    RESPONSE=$(curl -s "$FIREBASE_URL/$COLLECTION.json")
    if echo "$RESPONSE" | grep -q "Permission denied"; then
        echo "✅ $COLLECTION: Access denied"
    else
        echo "❌ $COLLECTION: Still accessible!"
    fi
done
echo ""

# Test 3: Backend local should still work
echo "[TEST 3] Testing Backend (local)..."
echo "GET $BACKEND_LOCAL/vehicles"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/backend_response.txt "$BACKEND_LOCAL/vehicles" 2>/dev/null)
HTTP_CODE="${RESPONSE: -3}"
BODY=$(cat /tmp/backend_response.txt 2>/dev/null)

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ PASS: Backend (local) works - HTTP $HTTP_CODE"
elif [ "$HTTP_CODE" == "401" ]; then
    echo "⚠️  Backend requires auth (expected) - HTTP $HTTP_CODE"
elif [ "$HTTP_CODE" == "000" ]; then
    echo "⚠️  Backend not running locally (skip this test)"
else
    echo "❌ FAIL: Backend error - HTTP $HTTP_CODE"
fi
echo ""

# Test 4: Backend production should still work
echo "[TEST 4] Testing Backend (production)..."
echo "GET $BACKEND_PROD/vehicles"
RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/backend_prod_response.txt "$BACKEND_PROD/vehicles" 2>/dev/null)
HTTP_CODE="${RESPONSE: -3}"

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ PASS: Backend (production) works - HTTP $HTTP_CODE"
elif [ "$HTTP_CODE" == "401" ]; then
    echo "⚠️  Backend requires auth (expected) - HTTP $HTTP_CODE"
else
    echo "❌ FAIL: Backend (production) error - HTTP $HTTP_CODE"
fi
echo ""

echo "================================================"
echo "Verification Complete"
echo "================================================"
echo ""
echo "If all tests pass:"
echo "  ✅ Firebase is locked (no public access)"
echo "  ✅ Backend still works (Admin SDK bypasses rules)"
echo ""
echo "If Firebase tests fail:"
echo "  1. Go to Firebase Console"
echo "  2. Realtime Database > Rules"
echo "  3. Replace with: {\"rules\": {\".read\": false, \".write\": false}}"
echo "  4. Click Publish"
echo "  5. Run this script again"
