import { motion } from 'framer-motion';
import { Character } from './Character';
import { countryCount } from '../data/countries';

interface LandingProps {
  onStart: () => void;
}

export function Landing({ onStart }: LandingProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen"
    >
      {/* 왼쪽: 캐릭터 (데스크탑에서만 표시) */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        className="hidden lg:flex items-end justify-center w-1/3 pb-12 pl-8"
      >
        <Character type="greeting" size="2xl" className="scale-125" />
      </motion.div>

      {/* 오른쪽: 콘텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center lg:items-start lg:text-left lg:pr-16">
        {/* 모바일에서만 캐릭터 표시 */}
        <div className="lg:hidden mb-6">
          <Character type="greeting" size="xl" />
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2E4057]">
            안녕하세요! 저는 보더리입니다
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl text-[#2E4057]/80">
            국경을 넘어 사람들을 연결합니다
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg max-w-md"
        >
          <p className="text-[#2E4057]/90 leading-relaxed text-lg">
            12가지 질문에 답하면
            <br />
            <span className="font-bold text-[#2E4057]">{countryCount}개국</span> 중 당신과 잘 맞는
            <br />
            나라를 찾아드릴게요!
          </p>
        </motion.div>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="mt-10 px-10 py-4 bg-[#2E4057] text-white text-lg font-semibold rounded-full shadow-lg hover:bg-[#3a5270] transition-colors"
        >
          퀴즈 시작하기
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 text-sm text-[#2E4057]/60"
        >
          약 2분 정도 소요됩니다
        </motion.p>
      </div>
    </motion.div>
  );
}
