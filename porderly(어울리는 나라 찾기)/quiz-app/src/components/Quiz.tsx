import { motion, AnimatePresence } from 'framer-motion';
import { Character } from './Character';
import { ProgressBar } from './ProgressBar';
import type { Question, QuestionOption } from '../types';
import { totalQuestions } from '../data/questions';

interface QuizProps {
  question: Question;
  questionIndex: number;
  progress: number;
  onAnswer: (option: QuestionOption) => void;
}

export function Quiz({ question, questionIndex, progress, onAnswer }: QuizProps) {
  const characterType = questionIndex % 3 === 0 ? 'question' : questionIndex % 3 === 1 ? 'writing' : 'confused';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col min-h-screen px-6 py-8"
    >
      <ProgressBar progress={progress} current={questionIndex + 1} total={totalQuestions} />

      <div className="flex-1 flex items-center justify-center">
        <div className="flex w-full max-w-5xl">
          {/* 왼쪽: 캐릭터 (데스크탑에서만) */}
          <motion.div
            key={`char-${questionIndex}`}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="hidden lg:flex items-center justify-center w-1/3"
          >
            <Character type={characterType} size="2xl" />
          </motion.div>

          {/* 오른쪽: 질문과 옵션 */}
          <div className="flex-1 flex flex-col justify-center lg:pl-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={question.id}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full max-w-2xl"
              >
                {/* 모바일에서만 캐릭터 표시 */}
                <div className="flex justify-center mb-6 lg:hidden">
                  <Character type={characterType} size="lg" />
                </div>

                {/* 질문 번호 배지 */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex justify-center lg:justify-start mb-4"
                >
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-[#2E4057] to-[#3a5270] text-white text-sm font-bold rounded-full shadow-md">
                    <span className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-full text-xs">
                      {question.id}
                    </span>
                    <span>/ 12</span>
                  </span>
                </motion.div>

                {/* 질문 텍스트 */}
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#2E4057] text-center lg:text-left mb-8 leading-relaxed">
                  <span className="bg-gradient-to-r from-[#2E4057] to-[#4a6078] bg-clip-text">
                    {question.question}
                  </span>
                </h2>

                <div className="space-y-3">
                  {question.options.map((option, index) => (
                    <motion.button
                      key={index}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onAnswer(option)}
                      className="group w-full p-4 md:p-5 bg-white/90 backdrop-blur-sm border-2 border-[#A8D8EA]/50 rounded-2xl text-left shadow-sm hover:border-[#2E4057] hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#A8D8EA] to-[#7EC8E3] rounded-xl text-[#2E4057] font-bold text-lg shadow-sm group-hover:from-[#2E4057] group-hover:to-[#3a5270] group-hover:text-white transition-all duration-200">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1 text-[#2E4057] font-medium text-base md:text-lg leading-snug">
                          {option.label}
                        </span>
                        <svg className="w-5 h-5 text-[#A8D8EA] group-hover:text-[#2E4057] transition-colors opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
