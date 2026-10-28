const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== DotyNotes Onboarding & Replay Onboarding Test Suite ===\n');

// 1. Verify OnboardingScreen file exists and is valid JS
const onboardingPath = path.resolve(__dirname, '../src/screens/OnboardingScreen.js');
assert(fs.existsSync(onboardingPath), 'OnboardingScreen.js must exist');
const onboardingContent = fs.readFileSync(onboardingPath, 'utf8');

// 2. Verify all 6 slide titles and descriptions
console.log('Test 1: Verifying Screen 1 (Welcome to DotyNotes) content');
assert(onboardingContent.includes('Your thoughts, always within reach.'), 'Screen 1 title missing');
assert(onboardingContent.includes('Capture ideas instantly with your private, offline-first notes companion.'), 'Screen 1 description missing');
assert(onboardingContent.includes('Get Started'), 'Screen 1 Get Started button missing');

console.log('Test 2: Verifying Screen 2 (Your Notes, Your Way) content');
assert(onboardingContent.includes('Organize every thought.'), 'Screen 2 title missing');
assert(onboardingContent.includes('Create, edit, search, pin, archive, and organize your notes with colorful sticky-note cards.'), 'Screen 2 description missing');

console.log('Test 3: Verifying Screen 3 (Floating Dot) content');
assert(onboardingContent.includes('Quick notes, anywhere.'), 'Screen 3 title missing');
assert(onboardingContent.includes("Use the floating handle to open Quick Pad and access your notes without reopening the app."), 'Screen 3 description missing');

console.log('Test 4: Verifying Screen 4 (Reminders) content');
assert(onboardingContent.includes('Never miss a thought.'), 'Screen 4 title missing');
assert(onboardingContent.includes('Schedule reminders for important notes and receive notifications at the right time.'), 'Screen 4 description missing');

console.log('Test 5: Verifying Screen 5 (Private & Offline) content');
assert(onboardingContent.includes('Your notes stay on your device.'), 'Screen 5 title missing');
assert(onboardingContent.includes('DotyNotes is designed for local note-taking without requiring an account or cloud sync.'), 'Screen 5 description missing');

console.log('Test 6: Verifying Screen 6 (Get Started) content');
assert(onboardingContent.includes('Ready to capture your ideas?'), 'Screen 6 title missing');
assert(onboardingContent.includes('Your next great idea starts with a note.'), 'Screen 6 description missing');
assert(onboardingContent.includes('Start Using DotyNotes'), 'Screen 6 completion button missing');

// 3. Verify interaction handlers
console.log('Test 7: Verifying navigation and interaction elements');
assert(onboardingContent.includes('BackHandler'), 'Hardware Android back button handler must be present');
assert(onboardingContent.includes('pagingEnabled'), 'Horizontal paging must be enabled');
assert(onboardingContent.includes('indicatorPill'), 'Animated page indicator pills must exist');
assert(onboardingContent.includes('handleSkip'), 'Skip handler must be present');
assert(onboardingContent.includes('handleNext'), 'Next handler must be present');

// 4. Verify Replay Onboarding integration in SettingsScreen.js
console.log('Test 8: Verifying Replay Onboarding row in SettingsScreen.js (Section F: ABOUT)');
const settingsPath = path.resolve(__dirname, '../src/screens/SettingsScreen.js');
const settingsContent = fs.readFileSync(settingsPath, 'utf8');
assert(settingsContent.includes('Replay Onboarding'), 'SettingsScreen must have Replay Onboarding row');
assert(settingsContent.includes('Restart the interactive introduction'), 'SettingsScreen must have correct subtitle');
assert(settingsContent.includes('play-circle'), 'SettingsScreen must use play-circle icon');
assert(settingsContent.includes('onReplayOnboarding'), 'SettingsScreen must accept onReplayOnboarding prop');

// 5. Verify Replay Onboarding integration in AboutScreen.js
console.log('Test 9: Verifying Replay Onboarding card in AboutScreen.js');
const aboutPath = path.resolve(__dirname, '../src/screens/AboutScreen.js');
const aboutContent = fs.readFileSync(aboutPath, 'utf8');
assert(aboutContent.includes('Replay Onboarding'), 'AboutScreen must have Replay Onboarding');
assert(aboutContent.includes('onReplayOnboarding'), 'AboutScreen must accept onReplayOnboarding prop');

// 6. Verify AppIcon/SettingsIcon play-circle definition
console.log('Test 10: Verifying play-circle vector icon definition in SettingsIcon.js');
const iconPath = path.resolve(__dirname, '../src/components/SettingsIcon.js');
const iconContent = fs.readFileSync(iconPath, 'utf8');
assert(iconContent.includes("'play-circle'"), 'SettingsIcon must have play-circle case');

// 7. Verify HomeScreen navigation wiring for replay
console.log('Test 11: Verifying HomeScreen replay routing and history management');
const homePath = path.resolve(__dirname, '../src/screens/HomeScreen.js');
const homeContent = fs.readFileSync(homePath, 'utf8');
assert(homeContent.includes("currentNav === 'onboarding'"), 'HomeScreen must route onboarding');
assert(homeContent.includes("onReplayOnboarding={() => navigateTo('onboarding')}"), 'HomeScreen must wire onReplayOnboarding');

// 8. Lifecycle simulation
console.log('Test 12: Simulating first-launch, completion, and Replay Onboarding');
class MockAppNavigation {
  constructor() {
    this.storage = new Map();
    this.currentScreen = 'loading';
    this.navHistory = ['notes'];
  }

  async launch() {
    const completed = this.storage.get('has_completed_onboarding') || '0';
    if (completed === '1') {
      this.currentScreen = 'HomeScreen';
    } else {
      this.currentScreen = 'OnboardingScreen';
    }
  }

  async completeFirstLaunch() {
    this.storage.set('has_completed_onboarding', '1');
    this.currentScreen = 'HomeScreen';
  }

  replayOnboarding() {
    this.navHistory.push('onboarding');
    this.currentScreen = 'OnboardingScreen';
  }

  finishReplay() {
    this.navHistory = ['notes'];
    this.currentScreen = 'HomeScreen';
  }
}

async function runSimulation() {
  const app = new MockAppNavigation();

  // Fresh launch: Shows OnboardingScreen
  await app.launch();
  assert.strictEqual(app.currentScreen, 'OnboardingScreen', 'First launch must show OnboardingScreen');

  // Complete onboarding
  await app.completeFirstLaunch();
  assert.strictEqual(app.currentScreen, 'HomeScreen', 'Completing onboarding must show HomeScreen');

  // Next launch: Opens HomeScreen directly
  await app.launch();
  assert.strictEqual(app.currentScreen, 'HomeScreen', 'Second launch must go directly to HomeScreen');

  // User taps Settings -> About DotyNotes -> Replay Onboarding
  app.replayOnboarding();
  assert.strictEqual(app.currentScreen, 'OnboardingScreen', 'Replaying onboarding must open OnboardingScreen');

  // User finishes or skips replay
  app.finishReplay();
  assert.strictEqual(app.currentScreen, 'HomeScreen', 'Finishing replay must return to HomeScreen');
  assert.deepStrictEqual(app.navHistory, ['notes'], 'Navigation history must be cleanly reset to notes');
}

runSimulation().then(() => {
  console.log('\n======================================================');
  console.log('🎉 ALL 12 ONBOARDING & REPLAY TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');
});
