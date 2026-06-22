import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import {
  ContributionMetricKey,
  ContributionMetrics,
  METRIC_DESCRIPTIONS,
  METRIC_LABELS,
} from './contributionTypes';

interface ContributionMetricModalProps {
  metric: ContributionMetricKey | null;
  metrics: ContributionMetrics;
  onClose: () => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}

function renderRows(metric: ContributionMetricKey, metrics: ContributionMetrics) {
  switch (metric) {
    case 'trust':
      return [
        ['Нарушений в истории', metrics.details.trust.violationHistory],
        ['Подтвержденных жалоб', metrics.details.trust.confirmedComplaints],
        ['Санкций модерации', metrics.details.trust.moderationSanctions],
        ['Качество контента', `${metrics.details.trust.contentQualityScore} / 100`],
      ];
    case 'utility':
      return [
        ['Полезных ответов', metrics.details.utility.helpfulAnswers],
        ['Лучших ответов', metrics.details.utility.bestAnswers],
        ['Сохранений материалов', metrics.details.utility.materialSaves],
        ['Лайков получено', metrics.details.utility.likesReceived],
      ];
    case 'attention':
      return [
        ['Просмотров', metrics.details.attention.views],
        ['Уникальных читателей', metrics.details.attention.uniqueReaders],
        ['Среднее дочитывание', `${metrics.details.attention.averageReadThrough}%`],
        ['Переходов в профиль', metrics.details.attention.profileVisits],
        ['Повторных просмотров', metrics.details.attention.repeatViews],
      ];
    case 'engagement':
      return [
        ['Ответов получено', metrics.details.engagement.repliesReceived],
        ['Участников обсуждений', metrics.details.engagement.discussionParticipants],
        ['Средняя глубина дискуссии', metrics.details.engagement.averageDiscussionDepth],
        ['Возвратов в обсуждение', metrics.details.engagement.discussionReturns],
      ];
  }
}

export const ContributionMetricModal: React.FC<ContributionMetricModalProps> = ({
  metric,
  metrics,
  onClose,
}) => {
  if (!metric) return null;

  const rows = renderRows(metric, metrics);
  const score = metrics[metric];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/45"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="relative z-10 w-full max-w-[360px] bg-white rounded-[4px] border border-[#dce1e6] shadow-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[#f0f2f5] bg-[#fafbfc] flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-semibold text-[#285473]">{METRIC_LABELS[metric]}</h3>
              <p className="text-[11px] text-[#818c99] mt-0.5">{METRIC_DESCRIPTIONS[metric]}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#818c99] hover:text-[#2c2d2e] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 py-4">
            <div className="mb-4 flex items-end gap-2">
              <span className="text-[28px] font-semibold text-[#2c2d2e] leading-none">{score}</span>
              <span className="text-[13px] text-[#818c99] pb-0.5">/ 100</span>
            </div>

            <div className="space-y-2.5">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 text-[12.5px] border-b border-[#f5f6f8] last:border-0 pb-2 last:pb-0"
                >
                  <span className="text-[#656565]">{label}</span>
                  <span className="font-medium text-[#2c2d2e] tabular-nums">
                    {typeof value === 'number' ? formatNumber(value) : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
