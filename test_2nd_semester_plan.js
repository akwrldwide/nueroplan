const { chromium } = require('playwright');

async function testSemesterPlan() {
    console.log("=== STARTING 2ND SEMESTER PLAN GENERATION TEST ===");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    let alertMessage = "";
    page.on('dialog', async dialog => {
        alertMessage = dialog.message();
        console.log(`[Dialog Alert]: "${alertMessage}"`);
        await dialog.dismiss();
    });

    page.on('console', msg => {
        console.log(`[Browser Console]: ${msg.text()}`);
    });
    page.on('pageerror', err => {
        console.log(`[Browser JS Error]: ${err.stack || err.message}`);
    });

    try {
        console.log("Navigating to register page...");
        await page.goto('http://localhost:5173/register');

        const uniqueEmail = `test_sem2_${Date.now()}@example.com`;
        console.log(`Registering test user: ${uniqueEmail}`);
        await page.fill('input[placeholder="John Doe"]', "Dayo Stones");
        await page.fill('input[placeholder="you@email.com"]', uniqueEmail);
        await page.fill('input[placeholder="••••••••"]', "password123");
        await page.click('button[type="submit"]');

        console.log("Waiting for onboarding page...");
        await page.waitForURL('**/onboarding', { timeout: 10000 });
        console.log("On Onboarding page. Selecting Level 200 and 2nd Semester...");

        // Select level 200
        await page.locator('select').nth(1).selectOption('200');
        // Select 2nd Semester
        await page.locator('select').nth(2).selectOption('2');
        // Fill CGPA
        await page.fill('input[type="number"]', "4.5");
        // Select academic goal
        await page.click('text=First Class');
        // Submit academic profile
        await page.click('button[type="submit"]');

        console.log("Waiting for Step 2: Verify Your Curriculum...");
        await page.waitForSelector('h2:has-text("Verify Your Curriculum")', { timeout: 10000 });
        
        // Confirm courses
        console.log("Confirming courses...");
        await page.click('button:has-text("Confirm Courses")');

        console.log("Waiting for Step 3: Select Your Topics...");
        await page.waitForSelector('h2:has-text("Select Your Topics")', { timeout: 10000 });
        
        // Confirm topics
        console.log("Confirming topics...");
        await page.click('button:has-text("Confirm Topics")');

        console.log("Waiting for Step 4: Study Availability...");
        await page.waitForSelector('h2:has-text("Study Availability")', { timeout: 10000 });

        // Select study time slot
        console.log("Configuring study availability...");
        await page.click('text=Set Study Time');
        await page.waitForSelector('text=Start Time');
        await page.fill('input[type="time"] >> nth=0', "10:00");
        await page.fill('input[type="time"] >> nth=1', "12:00");
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(1000);

        // Click Finish & Generate Plan
        console.log("Clicking Finish & Generate Plan...");
        await page.click('button:has-text("Finish & Generate Plan")');

        console.log("Waiting for redirect to Dashboard...");
        await page.waitForURL('**/dashboard', { timeout: 20000 });
        console.log("On Dashboard page. Checking if plan is loaded...");

        await page.waitForSelector('text=Hello, Dayo Stones');
        await page.waitForTimeout(4000); // Let dashboard load fully

        const noPlanMessage = await page.isVisible('text=No active plan found').catch(() => false);
        if (noPlanMessage) {
            console.error("❌ FAIL: 'No active plan found' is still visible!");
            await page.screenshot({ path: 'failure_semester_2_plan.png' });
        } else {
            console.log("✅ SUCCESS: Plan successfully generated and active on Dashboard for 2nd Semester user!");
        }

    } catch (e) {
        console.error("Test execution failed with error:", e);
    } finally {
        await browser.close();
    }
}

testSemesterPlan();
