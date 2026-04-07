import { motion } from 'framer-motion';
import { Character } from './Character';

export function Calculating() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen"
    >
      {/* 왼쪽: 캐릭터 (데스크탑에서만) */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        className="hidden lg:flex items-center justify-center w-1/3 pl-8"
      >
        <Character type="sleeping" size="2xl" className="scale-125" />
      </motion.div>

      {/* 오른쪽: 로딩 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:items-start lg:pr-16">
        {/* 모바일에서만 캐릭터 표시 */}
        <div className="lg:hidden">
          <Character type="sleeping" size="xl" />
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center lg:text-left"
        >
          <h2 className="text-2xl lg:text-4xl font-bold text-[#2E4057] mb-4">
            결과를 분석하고 있어요...
          </h2>

          <div className="flex justify-center lg:justify-start space-x-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
                className="w-3 h-3 bg-[#2E4057] rounded-full"
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
