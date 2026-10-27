import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './sections/HeroSection';
import { FeatureMarquee } from './components/FeatureMarquee';
import { PlaygroundSection, type DemoNote } from './sections/PlaygroundSection';
import { FloatingDotSection } from './sections/FloatingDotSection';
import { RichTextSection } from './sections/RichTextSection';
import { FeatureStorySection } from './sections/FeatureStorySection';
import { ScrollStorySection } from './sections/ScrollStorySection';
import { PrivacySection } from './sections/PrivacySection';
import { GallerySection } from './sections/GallerySection';
import { DownloadSection } from './sections/DownloadSection';
import { FaqSection } from './sections/FaqSection';
import { Footer } from './components/Footer';
import { DownloadModal } from './components/DownloadModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { QuickPadDrawer, type QuickPadNote } from './components/QuickPadDrawer';

export function App() {
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [injectedNote, setInjectedNote] = useState<DemoNote | null>(null);

  // When a note is saved inside the Floating Dot Quick Pad drawer,
  // pass it to the Interactive Playground Sandbox so users see it immediately!
  const handleNoteCreatedFromQuickPad = (note: QuickPadNote) => {
    const playgroundNote: DemoNote = {
      id: note.id,
      title: note.title,
      body: note.body,
      colorId: note.colorId,
      isPinned: note.isPinned,
      type: 'text',
      updatedAt: 'Saved from Quick Pad',
    };
    setInjectedNote(playgroundNote);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#182E3A] font-sans relative selection:bg-[#F99773]/30 selection:text-[#182E3A]">
      {/* Navigation Bar */}
      <Navbar onOpenDownloadModal={() => setDownloadModalOpen(true)} />

      {/* Main Page Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection
          onOpenDownloadModal={() => setDownloadModalOpen(true)}
          onOpenQuickPad={() => window.dispatchEvent(new CustomEvent('open-quickpad'))}
        />

        {/* Key Features Scrolling Marquee Ticker */}
        <FeatureMarquee />

        {/* Interactive Sticky Notes Playground */}
        <PlaygroundSection externalNote={injectedNote} />

        {/* Floating Dot Deep-Dive & Simulation */}
        <FloatingDotSection
          onTriggerQuickPad={() => window.dispatchEvent(new CustomEvent('open-quickpad'))}
        />

        {/* Rich-Text Formatting Demonstration */}
        <RichTextSection />

        {/* Feature Storytelling (8 Distinct Compositions) */}
        <FeatureStorySection />

        {/* Scroll-Driven / Step Journey: From Chaos to Clarity */}
        <ScrollStorySection />

        {/* Privacy & Offline-First Philosophy */}
        <PrivacySection onOpenPrivacyModal={() => setPrivacyModalOpen(true)} />

        {/* Real Product Screen Gallery */}
        <GallerySection />

        {/* High-Impact Download Experience */}
        <DownloadSection onOpenDownloadModal={() => setDownloadModalOpen(true)} />

        {/* Accessible FAQ */}
        <FaqSection />
      </main>

      {/* Global Footer */}
      <Footer
        onOpenDownloadModal={() => setDownloadModalOpen(true)}
        onOpenPrivacyModal={() => setPrivacyModalOpen(true)}
      />

      {/* Floating Dot Handle & Slide-out Quick Pad Simulation */}
      <QuickPadDrawer onNoteCreated={handleNoteCreatedFromQuickPad} />

      {/* Download APK Modal */}
      <DownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
      />

      {/* Privacy Policy Full Modal */}
      <PrivacyPolicyModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />
    </div>
  );
}

export default App;
