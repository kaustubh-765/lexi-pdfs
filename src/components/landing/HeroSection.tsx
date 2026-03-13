'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

const PdfOrb3D = dynamic(() => import('./PdfOrb3D').then((m) => ({ default: m.PdfOrb3D })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-64 h-64 rounded-full bg-indigo-500/10 animate-pulse" />
    </div>
  ),
});

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20">
      <div className="max-w-6xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 items-center py-20">
        {/* Text side */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
              <Sparkles className="h-3 w-3" />
              AI-powered PDF chat
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl font-bold text-slate-100 leading-tight mb-6"
          >
            Chat with your{' '}
            <span className="gradient-text">PDFs</span>
            {' '}like never before
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-slate-400 mb-8 leading-relaxed max-w-lg"
          >
            Upload any PDF and instantly ask questions, get summaries, and extract insights using
            advanced RAG-powered AI.
          </motion.p>

          <motion.div variants={itemVariants} className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-base font-semibold text-white px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/25 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 transition-all"
              >
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Already have an account? →
            </Link>
          </motion.div>
        </motion.div>

        {/* 3D side */}
        <motion.div
          className="relative h-[480px] lg:h-[560px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        >
          {/* Glow backdrop */}
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/5 animate-glow-pulse" />
          <PdfOrb3D />
        </motion.div>
      </div>
    </section>
  );
}
