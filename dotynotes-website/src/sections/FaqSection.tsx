import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Search } from 'lucide-react';
import { APP_CONFIG } from '../constants/config';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'features' | 'privacy' | 'installation';
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-dotynotes',
    question: 'What is DotyNotes?',
    answer: 'DotyNotes is an offline-first Android note-taking application designed for rapid thought capture. It combines colorful pastel sticky notes, rich-text styling, checklists, on-device reminder alerts, and a signature native Android Floating Dot that opens Quick Pad over any app.',
    category: 'general',
  },
  {
    id: 'does-it-work-offline',
    question: 'Does DotyNotes work completely offline?',
    answer: 'Yes, 100%. DotyNotes does not require an active internet connection to create, edit, search, pin, or delete notes. All note content is saved instantly to your local device hardware.',
    category: 'general',
  },
  {
    id: 'where-are-notes-stored',
    question: 'Where are my notes stored?',
    answer: 'Notes are stored locally in an embedded SQLite database (using expo-sqlite with Write-Ahead Logging mode) inside your Android device private sandboxed application storage directory. DotyNotes does not use remote cloud servers for note storage.',
    category: 'privacy',
  },
  {
    id: 'is-account-required',
    question: 'Is an account or subscription required?',
    answer: 'No. DotyNotes requires zero account creation, zero email addresses, and zero phone numbers. There are no subscription fees, hidden paywalls, or in-app ads.',
    category: 'privacy',
  },
  {
    id: 'what-is-floating-dot',
    question: 'What is the Floating Dot and how does it work?',
    answer: 'The Floating Dot is DotyNotes’ signature Android overlay feature. By granting the native Android SYSTEM_ALERT_WINDOW ("Appear on top") permission, a subtle handle rests on the screen edge while using any app. Tapping or swiping the handle reveals Quick Pad for taking instant notes without losing your place.',
    category: 'features',
  },
  {
    id: 'how-do-reminders-work',
    question: 'How do reminders work without an internet connection?',
    answer: 'All reminder alerts are scheduled locally through Android’s native AlarmManager (SCHEDULE_EXACT_ALARM). Because alarms are executed directly by the operating system on your phone, they ring accurately on time even in Airplane Mode without external push notification relays.',
    category: 'features',
  },
  {
    id: 'how-to-install-apk',
    question: 'How do I install the Android APK directly?',
    answer: 'Download the DotyNotes-v1.0.0.apk file to your Android phone. When opening the downloaded file, your device may prompt you to allow "Install unknown apps" in Settings for your browser or file manager. Enable this toggle, return to the installer, and tap Install.',
    category: 'installation',
  },
  {
    id: 'how-to-report-issue',
    question: 'How do I report an issue or suggest a feature?',
    answer: `You can report bugs, request features, or submit feedback directly through our official GitHub issues tracker at ${APP_CONFIG.support.issuesUrl} or email ${APP_CONFIG.support.email}.`,
    category: 'general',
  },
];

export const FaqSection: React.FC = () => {
  const [openIds, setOpenIds] = useState<string[]>(['what-is-dotynotes', 'what-is-floating-dot']);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <section id="faq" className="py-20 sm:py-32 bg-white relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-800">
            <HelpCircle className="w-3.5 h-3.5 text-[#6D28D9]" />
            <span>Frequently Asked Questions</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#182E3A] font-['Plus_Jakarta_Sans'] tracking-tight">
            Everything You Need to Know
          </h2>

          <p className="text-base sm:text-lg text-slate-600">
            Honest answers about DotyNotes, local storage, Android permissions, and installation.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions (e.g. offline, permissions, SQLite)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#182E3A] transition-all"
            />
          </div>

          <div className="flex items-center justify-center gap-1.5 flex-wrap text-xs">
            {['all', 'general', 'features', 'privacy', 'installation'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold capitalize transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#182E3A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">
              No questions found matching your search. Try a different keyword.
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openIds.includes(faq.id);

              return (
                <div
                  key={faq.id}
                  className="rounded-2xl border border-slate-200 bg-[#FAF9F6] overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleItem(faq.id)}
                    className="w-full px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 text-left font-bold text-base sm:text-lg text-[#182E3A] hover:bg-black/[0.02] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F99773] focus:ring-inset"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                        isOpen ? 'rotate-180 text-[#182E3A]' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 sm:px-6 pb-5 pt-1 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-slate-200/60">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

      </div>
    </section>
  );
};
