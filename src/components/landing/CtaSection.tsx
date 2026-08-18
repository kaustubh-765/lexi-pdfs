'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
            Ready to chat with your PDFs?
          </h2>
          <p className="text-slate-400 mb-8">
            Join and start extracting insights from your documents instantly.
          </p>

          <motion.div
            className="inline-block"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-base font-semibold text-white px-8 py-4 rounded-xl shadow-xl shadow-indigo-500/30 animate-gradient-shift"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #22d3ee, #6366f1)',
                backgroundSize: '300% 300%',
              }}
            >
              Get started for free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
