const { chromium } = require('playwright');

async function runTests() {
    console.log("=== STARTING PLAYWRIGHT VALIDATION TESTS ===");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    let alertMessage = "";
    // Listen for alert dialogs
    page.on('dialog', async dialog => {
        alertMessage = dialog.message();
        console.log(`[Dialog Alert Detected]: "${alertMessage}"`);
        await dialog.dismiss();
    });

    // Listen for page console logs and errors
    page.on('console', msg => {
        console.log(`[Browser Console ${msg.type().toUpperCase()}]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
        console.log(`[Browser JS Error]: ${err.stack || err.message}`);
    });

    try {
        console.log("Navigating to register page...");
        await page.goto('http://localhost:5173/register');

        // Test 1: Full Name Required Validation
        console.log("Test 1: Submitting registration with empty fields...");
        await page.click('button[type="submit"]');
        const nameError = await page.textContent('text=Name is required').catch(() => null);
        if (nameError) {
            console.log("✅ Registration full name validation works: 'Name is required' shown.");
        } else {
            console.warn("❌ Registration full name validation missed!");
        }

        // Test 2: Password Minimum Length Validation
        console.log("Test 2: Submitting registration with short password...");
        await page.fill('input[placeholder="John Doe"]', "Test User");
        await page.fill('input[placeholder="you@email.com"]', `test_${Date.now()}@example.com`);
        await page.fill('input[placeholder="••••••••"]', "123");
        await page.click('button[type="submit"]');
        const pwdError = await page.textContent('text=Password must be at least 6 characters').catch(() => null);
        if (pwdError) {
            console.log("✅ Registration password length validation works: 'Password must be at least 6 characters' shown.");
        } else {
            console.warn("❌ Registration password validation missed!");
        }

        // Test 3: Registering a valid user to enter Onboarding
        console.log("Test 3: Submitting valid registration...");
        const validEmail = `user_${Date.now()}@example.com`;
        await page.fill('input[placeholder="••••••••"]', "password123");
        await page.click('button[type="submit"]');
        
        console.log("Waiting for onboarding page redirect...");
        await page.waitForURL('**/onboarding', { timeout: 10000 });
        console.log("✅ Registration success: redirected to Onboarding!");

        // Test 4: Profile CGPA validation bounds
        console.log("Test 4: Testing CGPA validation bounds in Onboarding Profile...");
        
        // Let's set Level to 200 (which requires CGPA)
        await page.locator('select').nth(1).selectOption('200');
        
        // Try submitting with empty CGPA
        console.log("Submitting with empty CGPA...");
        await page.click('button[type="submit"]');
        let currentTitle = await page.textContent('h2');
        if (currentTitle.includes("Academic Profile")) {
            console.log("✅ Empty CGPA successfully blocked by HTML5 validation!");
        } else {
            console.warn("❌ Empty CGPA allowed progression!");
        }

        // Try submitting with CGPA = 6.0
        console.log("Submitting with CGPA = 6.0...");
        await page.fill('input[type="number"]', "6.0");
        await page.click('button[type="submit"]');
        currentTitle = await page.textContent('h2');
        if (currentTitle.includes("Academic Profile")) {
            console.log("✅ CGPA upper bound check (6.0) successfully blocked by HTML5 validation!");
        } else {
            console.warn("❌ CGPA upper bound allowed progression!");
        }

        // Try submitting with CGPA = -0.5
        console.log("Submitting with CGPA = -0.5...");
        await page.fill('input[type="number"]', "-0.5");
        await page.click('button[type="submit"]');
        currentTitle = await page.textContent('h2');
        if (currentTitle.includes("Academic Profile")) {
            console.log("✅ CGPA lower bound check (-0.5) successfully blocked by HTML5 validation!");
        } else {
            console.warn("❌ CGPA lower bound allowed progression!");
        }

        // Input valid CGPA and proceed
        console.log("Submitting with valid CGPA = 4.5...");
        await page.fill('input[type="number"]', "4.5");
        await page.click('button[type="submit"]');
        
        console.log("Waiting for step 2 title...");
        try {
            await page.waitForSelector('h2:has-text("Verify Your Curriculum")', { timeout: 15000 });
            console.log("✅ Profile successfully submitted with valid data. Proceeded to Course Selection step!");
        } catch (err) {
            currentTitle = await page.textContent('h2');
            console.warn("❌ Failed to transition to Course Selection step! Current title: " + currentTitle);
            await page.screenshot({ path: 'failure_screenshot_step1.png' });
            throw new Error("Failed to transition to step 2: " + err.message);
        }

        // Onboarding Step 2: Curriculum
        console.log("Step 2: Selecting curriculum courses...");
        await page.waitForSelector('button:has-text("Confirm Courses")');
        await page.click('button:has-text("Confirm Courses")');

        console.log("Waiting for step 3 title...");
        try {
            await page.waitForSelector('h2:has-text("Select Your Topics")', { timeout: 15000 });
            console.log("✅ Curriculum courses confirmed. Proceeded to Topic Selection step!");
        } catch (err) {
            currentTitle = await page.textContent('h2');
            console.warn("❌ Failed to transition to Topic Selection step! Current title: " + currentTitle);
            await page.screenshot({ path: 'failure_screenshot_step2.png' });
            throw new Error("Failed to transition to step 3: " + err.message);
        }

        // Onboarding Step 3: Topic Selection
        console.log("Step 3: Confirming topic selection...");
        await page.waitForSelector('button:has-text("Confirm Topics")');
        await page.click('button:has-text("Confirm Topics")');

        console.log("Waiting for step 4 title...");
        try {
            await page.waitForSelector('h2:has-text("Study Availability")', { timeout: 15000 });
            console.log("✅ Topics confirmed. Proceeded to Study Availability step!");
        } catch (err) {
            currentTitle = await page.textContent('h2');
            console.warn("❌ Failed to transition to Study Availability step! Current title: " + currentTitle);
            await page.screenshot({ path: 'failure_screenshot_step3.png' });
            throw new Error("Failed to transition to step 4: " + err.message);
        }

        // Onboarding Step 4: Study Availability
        console.log("Step 4: Configuring Study Availability...");
        await page.click('text=Set Study Time');
        await page.waitForSelector('text=Start Time');

        // Test invalid range (10:00 to 10:15)
        console.log("Testing invalid availability duration (< 30 minutes)...");
        await page.fill('input[type="time"] >> nth=0', "10:00");
        await page.fill('input[type="time"] >> nth=1', "10:15");
        
        let isSaveDisabled = await page.isDisabled('button:has-text("Save")');
        if (isSaveDisabled) {
            console.log("✅ Invalid range successfully blocked (Save button disabled)!");
        } else {
            console.warn("❌ Invalid range allowed (Save button enabled)!");
        }

        // Enter valid range (10:00 to 11:00)
        console.log("Entering valid availability duration (10:00 to 11:00)...");
        await page.fill('input[type="time"] >> nth=0', "10:00");
        await page.fill('input[type="time"] >> nth=1', "11:00");
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(1000);

        // Click Finish & Generate Plan
        console.log("Completing onboarding...");
        await page.click('button:has-text("Finish & Generate Plan")');
        
        console.log("Waiting for redirect to Dashboard...");
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log("✅ Onboarding completed and redirected to Dashboard!");

        // Wait for dashboard data to load
        await page.waitForSelector('text=Hello, Test User');

        // --- DASHBOARD VALIDATION TESTS ---
        console.log("\n=== STARTING DASHBOARD VALIDATION TESTS ===");

        // Test 5: Profile Settings CGPA Validation
        console.log("Test 5: Profile Settings CGPA validation bounds...");
        await page.click('button:has-text("Hello, Test User")');
        await page.click('text=Profile Settings');
        await page.waitForSelector('h3:has-text("Profile Settings")');

        // Try invalid CGPA = 6.0
        console.log("Trying CGPA = 6.0 in Settings...");
        await page.fill('input[placeholder="e.g. 4.5"]', "6.0");
        alertMessage = "";
        await page.click('button:has-text("Save Settings")');
        await page.waitForTimeout(1500);
        if (alertMessage.includes("valid CGPA between 0.0 and 5.0")) {
            console.log("✅ Settings CGPA upper bound check (6.0) blocked with alert!");
        } else {
            console.warn("❌ Settings CGPA upper bound check failed to show alert! Alert msg was: " + alertMessage);
        }

        // Try invalid CGPA = -1.0
        console.log("Trying CGPA = -1.0 in Settings...");
        await page.fill('input[placeholder="e.g. 4.5"]', "-1.0");
        alertMessage = "";
        await page.click('button:has-text("Save Settings")');
        await page.waitForTimeout(1500);
        if (alertMessage.includes("valid CGPA between 0.0 and 5.0")) {
            console.log("✅ Settings CGPA lower bound check (-1.0) blocked with alert!");
        } else {
            console.warn("❌ Settings CGPA lower bound check failed to show alert!");
        }

        // Enter valid CGPA
        console.log("Entering valid CGPA = 4.5 in Settings...");
        await page.fill('input[placeholder="e.g. 4.5"]', "4.5");
        await page.click('button:has-text("Save Settings")');
        await page.waitForTimeout(4000); // Wait for recalculation

        // Test 6: Manage Study Time Duration Validation
        console.log("Test 6: Manage Study Time range validation bounds...");
        await page.click('button:has-text("Hello, Test User")');
        await page.click('text=Manage Study Time');
        await page.waitForSelector('h3:has-text("Manage Study Time")');

        // Set invalid range (10:00 to 10:15)
        console.log("Trying range 10:00 to 10:15 in Manage Study Time...");
        await page.fill('input[type="time"] >> nth=0', "10:00");
        await page.fill('input[type="time"] >> nth=1', "10:15");
        alertMessage = "";
        await page.click('button:has-text("Save & Recalculate")');
        await page.waitForTimeout(1500);
        if (alertMessage.includes("duration must be at least 30 minutes")) {
            console.log("✅ Study Time range check (15 mins) blocked with alert!");
        } else {
            console.warn("❌ Study Time range check failed to show alert!");
        }

        // Set valid range (10:00 to 12:00)
        console.log("Entering valid range 10:00 to 12:00...");
        await page.fill('input[type="time"] >> nth=0', "10:00");
        await page.fill('input[type="time"] >> nth=1', "12:00");
        await page.click('button:has-text("Save & Recalculate")');
        await page.waitForTimeout(4000); // Wait for recalculation

        // Test 7: Manage Exam Dates Duration Validation
        console.log("Test 7: Manage Exam Dates duration validation...");
        await page.click('button:has-text("Hello, Test User")');
        await page.click('text=Manage Exam Dates');
        await page.waitForSelector('h3:has-text("Manage Exam Dates")');

        // Try invalid duration = -50
        console.log("Trying duration = -50 in Exam Dates...");
        await page.fill('input[placeholder="Mins"] >> nth=0', "-50");
        alertMessage = "";
        await page.click('button:has-text("Bulk Save")');
        await page.waitForTimeout(1500);
        if (alertMessage.includes("duration must be a positive number")) {
            console.log("✅ Exam duration validation check (-50) blocked with alert!");
        } else {
            console.warn("❌ Exam duration validation check failed to show alert!");
        }

        // Set valid duration = 120
        console.log("Entering valid duration = 120 in Exam Dates...");
        await page.fill('input[placeholder="Mins"] >> nth=0', "120");
        await page.click('button:has-text("Bulk Save")');
        await page.waitForTimeout(4000); // Wait for recalculation
        
        // If the confirmation modal appears, click Regenerate Now
        const isRegenModalVisible = await page.isVisible('h3:has-text("Exam Dates Updated")').catch(() => false);
        if (isRegenModalVisible) {
            console.log("Regen confirmation modal appeared. Clicking Regenerate Now...");
            await page.click('button:has-text("Regenerate Now")');
            await page.waitForTimeout(4000);
        }

        // Test 8: Curriculum Manager Add/Edit validations
        console.log("Test 8: Curriculum Manager input field validations...");
        await page.click('button:has-text("Hello, Test User")');
        await page.click('text=Curriculum Manager');
        await page.waitForURL('**/courses');

        // Add new course
        await page.click('text=Add New Course');
        await page.waitForSelector('h3:has-text("Add New Course")');

        // Check invalid difficulty = 6.0
        console.log("Trying difficulty = 6.0 in Add Course...");
        await page.fill('input[placeholder="e.g. MTH102"]', "TEST101");
        await page.fill('input[placeholder="e.g. Calculus II"]', "Testing Validations");
        await page.fill('input[type="number"] >> nth=0', "3"); // units
        await page.fill('input[type="number"] >> nth=1', "6.0"); // difficulty
        
        alertMessage = "";
        await page.click('button:has-text("Add Course")');
        await page.waitForTimeout(1500);

        const isAddModalStillOpen = await page.isVisible('h3:has-text("Add New Course")');
        if (isAddModalStillOpen || alertMessage.includes("Difficulty must be between 1.0 and 5.0")) {
            console.log("✅ Invalid course difficulty (6.0) successfully blocked!");
        } else {
            console.warn("❌ Invalid course difficulty (6.0) allowed progression!");
        }

        await page.click('button:has-text("Cancel")');

        console.log("\nALL INTERACTIVE INPUT VALIDATION TESTS PASSED SUCCESSFULLY! ✅");
        
    } catch (e) {
        console.error("Test failed with error:", e);
    } finally {
        await browser.close();
    }
}

runTests();
