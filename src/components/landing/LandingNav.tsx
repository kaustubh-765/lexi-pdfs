'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export function LandingNav() {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold gradient-text">LexiPDF</span>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors px-4 py-2"
          >
            Sign in
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/register"
              className="text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 rounded-lg shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-violet-400 transition-all"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
}
