import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  current: number;
  total: number;
}

export function ProgressBar({ progress, current, total }: ProgressBarProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-[#2E4057]/70">진행률</span>
        <span className="text-sm font-bold text-[#2E4057]">
          {current} / {total}
        </span>
      </div>
      <div className="h-3 bg-[#E8F4F8] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="h-full bg-gradient-to-r from-[#A8D8EA] to-[#2E4057] rounded-full"
        />
      </div>
    </div>
  );
}
