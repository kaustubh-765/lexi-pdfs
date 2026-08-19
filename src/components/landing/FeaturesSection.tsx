'use client';

import { motion } from 'framer-motion';
import { Upload, MessageSquare, Zap } from 'lucide-react';

const features = [
  {
    icon: Upload,
    title: 'Upload any PDF',
    description: 'Drop your document and our AI instantly processes, indexes, and understands its content.',
    color: 'from-indigo-500 to-blue-500',
  },
  {
    icon: MessageSquare,
    title: 'Ask anything',
    description: 'Chat naturally with your document. Ask questions, request summaries, find key insights.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Zap,
    title: 'Instant answers',
    description: 'Get precise, context-aware answers streamed in real-time, grounded in your document.',
    color: 'from-cyan-500 to-teal-500',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
            How it works
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Three simple steps to unlock the knowledge inside your documents.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="glass-bright rounded-2xl p-6"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
              >
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
