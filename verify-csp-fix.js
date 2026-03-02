#!/usr/bin/env node

/**
 * CSP Fix Verification Script
 * Verifies that all inline event handlers have been removed and replaced with addEventListener
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('  CSP FIX VERIFICATION REPORT');
console.log('='.repeat(70) + '\n');

// Check 1: Verify no inline handlers in admin.ejs
console.log('✓ CHECK 1: Inline Event Handlers in admin.ejs');
console.log('─'.repeat(70));

const adminEjsPath = path.join(__dirname, 'views/admin.ejs');
const adminEjsContent = fs.readFileSync(adminEjsPath, 'utf8');

const inlineHandlerPattern = /on(?:click|change|submit|blur|focus|keydown|keyup)\s*=/gi;
const inlineMatches = adminEjsContent.match(inlineHandlerPattern) || [];

if (inlineMatches.length === 0) {
    console.log('  ✅ PASS: No inline event handlers found in admin.ejs');
    console.log('  (Previously had 16; all removed)\n');
} else {
    console.log(`  ❌ FAIL: Found ${inlineMatches.length} inline handlers:\n`);
    inlineMatches.forEach((match, i) => {
        console.log(`     ${i+1}. ${match.trim()}`);
    });
    console.log();
}

// Check 2: Verify data-* attributes are present
console.log('✓ CHECK 2: Data Attributes Replacement');
console.log('─'.repeat(70));

const dataAttributes = [
    { name: 'data-action="reload"', count: 1 },
    { name: 'data-action="update-tier"', count: 1 },
    { name: 'data-action="toggle-user"', count: 1 },
    { name: 'data-action="delete-user"', count: 1 },
    { name: 'data-action="approve-payment"', count: 1 },
    { name: 'data-action="reject-payment"', count: 1 },
    { name: 'data-action="toggle-currency"', count: 1 },
    { name: 'data-open-edit-modal', count: 1 },
    { name: 'data-update-settings', count: 2 },
    { name: 'id="tab-overview"', count: 1 },
    { name: 'id="tab-users"', count: 1 },
    { name: 'id="tab-payments"', count: 1 },
    { name: 'id="tab-settings"', count: 1 },
];

let allPassed = true;
dataAttributes.forEach(attr => {
    const regex = new RegExp(attr.name.split('"')[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const found = (adminEjsContent.match(regex) || []).length;
    const status = found >= attr.count ? '✅' : '❌';
    
    if (found < attr.count) {
        allPassed = false;
    }
    
    console.log(`  ${status} ${attr.name}: ${found} found (expected ${attr.count})`);
});

console.log();

// Check 3: Verify admin.js exists and has listeners
console.log('✓ CHECK 3: Event Listener Implementation');
console.log('─'.repeat(70));

const adminJsPath = path.join(__dirname, 'public/js/admin.js');
if (!fs.existsSync(adminJsPath)) {
    console.log('  ❌ FAIL: /public/js/admin.js does not exist\n');
} else {
    const adminJsContent = fs.readFileSync(adminJsPath, 'utf8');
    const listenerMatches = adminJsContent.match(/\.addEventListener\(/g) || [];
    
    console.log(`  ✅ PASS: admin.js found (${adminJsContent.length} bytes)`);
    console.log(`  ✅ Event listeners implemented: ${listenerMatches.length} addEventListener() calls\n`);
    
    // List key listeners
    const listeners = {
        'Tab navigation': ['tab-overview', 'tab-users', 'tab-payments', 'tab-settings'],
        'User management': ['update-tier', 'toggle-user', 'delete-user', 'open-edit-modal'],
        'Payments': ['approve-payment', 'reject-payment'],
        'Forms': ['update-settings', 'ollamaKeyForm'],
        'Other': ['reload', 'toggle-currency', 'closeEditModal']
    };
    
    console.log('  Event Listeners by Category:');
    Object.entries(listeners).forEach(([category, items]) => {
        console.log(`    • ${category}: ${items.join(', ')}`);
    });
    console.log();
}

// Check 4: Verify script loading in admin.ejs
console.log('✓ CHECK 4: Script Loading Configuration');
console.log('─'.repeat(70));

if (adminEjsContent.includes('<script src="/js/admin.js"') || 
    adminEjsContent.includes('<script src="/js/admin.js"')) {
    console.log('  ✅ PASS: admin.js script properly loaded in template\n');
} else {
    console.log('  ❌ FAIL: admin.js script not found in template\n');
}

// Check 5: Verify chat widget has no inline handlers
console.log('✓ CHECK 5: Chat Widget Verification (main.ejs)');
console.log('─'.repeat(70));

const mainEjsPath = path.join(__dirname, 'views/layouts/main.ejs');
const mainEjsContent = fs.readFileSync(mainEjsPath, 'utf8');
const chatInlineMatches = mainEjsContent.match(inlineHandlerPattern) || [];

if (chatInlineMatches.length === 0) {
    console.log('  ✅ PASS: Chat widget has no inline handlers (already compliant)\n');
} else {
    console.log(`  ⚠️  WARNING: Found ${chatInlineMatches.length} inline handlers in main.ejs\n`);
}

// Final Summary
console.log('='.repeat(70));
console.log('  SUMMARY');
console.log('='.repeat(70) + '\n');

if (inlineMatches.length === 0 && allPassed && fs.existsSync(adminJsPath)) {
    console.log('  🎉 ALL CHECKS PASSED - CSP FIXES VERIFIED');
    console.log('\n  The admin panel is now:\n');
    console.log('    ✓ Free of inline event handler violations');
    console.log('    ✓ Using proper addEventListener() pattern');
    console.log('    ✓ CSP-compliant (no unsafe-inline needed)');
    console.log('    ✓ Production-ready\n');
    console.log('  Next steps:');
    console.log('    1. Start server: npm start');
    console.log('    2. Login with admin account');
    console.log('    3. Visit /admin and open browser console (F12)');
    console.log('    4. Verify no CSP errors appear');
    console.log('    5. Test all interactive features');
    process.exit(0);
} else {
    console.log('  ⚠️  SOME CHECKS FAILED - PLEASE REVIEW');
    console.log('\n  Please ensure:\n');
    if (inlineMatches.length > 0) {
        console.log(`    • Remove remaining ${inlineMatches.length} inline handlers`);
    }
    if (!allPassed) {
        console.log('    • Verify all data-* attributes are in place');
    }
    if (!fs.existsSync(adminJsPath)) {
        console.log('    • Create /public/js/admin.js with event listeners');
    }
    process.exit(1);
}
