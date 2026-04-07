import { motion } from 'framer-motion';
import { useState } from 'react';
import { Character } from './Character';
import type { MatchResult } from '../types';

interface ResultProps {
  result: MatchResult;
  onReset: () => void;
}

function Confetti() {
  const confettiColors = ['#A8D8EA', '#2E4057', '#FFD700', '#FF6B6B', '#4ECDC4'];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: -20,
            rotate: 0,
            opacity: 1
          }}
          animate={{
            y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20,
            rotate: Math.random() * 360,
            opacity: 0
          }}
          transition={{
            duration: Math.random() * 3 + 2,
            delay: Math.random() * 2,
            ease: 'linear'
          }}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)],
            left: `${Math.random() * 100}%`
          }}
        />
      ))}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white/80 rounded-xl border border-[#A8D8EA]/30">
      <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-[#A8D8EA] to-[#7EC8E3] rounded-lg text-white">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[#2E4057]/50 font-medium">{label}</p>
        <p className="text-sm text-[#2E4057] font-semibold">{value}</p>
      </div>
    </div>
  );
}

function FoodBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#2E4057]/70 w-16">{label}</span>
      <div className="flex-1 h-2 bg-[#E8F4F8] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 20}%` }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

export function Result({ result, onReset }: ResultProps) {
  const { country, alternatives } = result;
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen py-8 px-4"
    >
      <Confetti />

      <div className="max-w-4xl mx-auto">
        {/* 상단: 축하 메시지 */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <span className="inline-block px-4 py-2 bg-[#2E4057] text-white text-sm font-medium rounded-full">
            분석 완료!
          </span>
        </motion.div>

        {/* 메인 결과 카드 */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* 상단 그라데이션 헤더 */}
          <div className="bg-gradient-to-r from-[#A8D8EA] via-[#7EC8E3] to-[#2E4057] p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-50" />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/90 text-lg mb-2 relative z-10"
            >
              당신과 가장 잘 맞는 나라는
            </motion.p>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
              className="relative z-10"
            >
              <span className="text-6xl md:text-8xl block mb-2">{country.emoji}</span>
              <h1 className="text-3xl md:text-5xl font-bold text-white drop-shadow-lg">
                {country.name}
              </h1>
              <p className="text-white/70 text-sm mt-1">{country.nameEn}</p>
            </motion.div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="p-6 md:p-10">
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
              {/* 왼쪽: 캐릭터 */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col items-center"
              >
                <Character type="love" size="xl" />
              </motion.div>

              {/* 오른쪽: 설명 */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex-1 text-center lg:text-left"
              >
                <blockquote className="text-xl md:text-2xl font-medium text-[#2E4057] leading-relaxed mb-4">
                  "{country.description}"
                </blockquote>

                <p className="text-[#2E4057]/70 leading-relaxed mb-6">
                  {country.detail}
                </p>

                {/* 하이라이트 */}
                <div className="space-y-2">
                  {country.highlights.map((highlight, index) => (
                    <motion.div
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-[#E8F4F8] to-white rounded-xl"
                    >
                      <span className="w-8 h-8 flex items-center justify-center bg-[#A8D8EA] rounded-full text-[#2E4057] font-bold text-sm">
                        {index + 1}
                      </span>
                      <span className="text-[#2E4057] text-sm font-medium">{highlight}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* 국가 정보 그리드 */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              <InfoCard
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>}
                label="언어"
                value={country.language}
              />
              <InfoCard
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>}
                label="기후"
                value={country.climate}
              />
              <InfoCard
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                label="지역"
                value={country.region === 'eastAsia' ? '동아시아' :
                       country.region === 'southeastAsia' ? '동남아시아' :
                       country.region === 'southAsia' ? '남아시아' :
                       country.region === 'middleEast' ? '중동' :
                       country.region === 'europeWest' ? '서유럽' :
                       country.region === 'europeSouth' ? '남유럽' :
                       country.region === 'africa' ? '아프리카' : '아메리카'}
              />
              <InfoCard
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
                label="국가 코드"
                value={country.id.toUpperCase()}
              />
            </motion.div>

            {/* 음식 성향 */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.4 }}
              className="mt-8 p-6 bg-gradient-to-br from-[#FFF9E6] to-[#FFF5D6] rounded-2xl"
            >
              <h3 className="text-lg font-bold text-[#2E4057] mb-4 flex items-center gap-2">
                <span>🍽️</span>
                <span>이 나라의 음식 성향</span>
              </h3>
              <div className="space-y-3">
                <FoodBar label="매운맛" value={country.food.spicy} color="bg-red-400" />
                <FoodBar label="담백함" value={country.food.bland} color="bg-green-400" />
                <FoodBar label="달콤함" value={country.food.sweet} color="bg-pink-400" />
                <FoodBar label="향신료" value={country.food.aromatic} color="bg-amber-400" />
              </div>
            </motion.div>

            {/* 성향 분석 */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-6 p-6 bg-gradient-to-br from-[#E8F4F8] to-[#D4EDF7] rounded-2xl"
            >
              <h3 className="text-lg font-bold text-[#2E4057] mb-4 flex items-center gap-2">
                <span>✨</span>
                <span>이런 성향과 잘 맞아요</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {country.profile.pace >= 4 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">⚡ 빠른 생활 템포</span>
                )}
                {country.profile.pace <= 2 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">🌿 여유로운 라이프</span>
                )}
                {country.profile.social >= 4 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">🎉 사교적인 분위기</span>
                )}
                {country.profile.social <= 2 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">🏠 조용한 일상</span>
                )}
                {country.profile.tradition >= 4 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">🏛️ 전통 중시</span>
                )}
                {country.profile.tradition <= 2 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">🚀 현대적 문화</span>
                )}
                {country.profile.order >= 4 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">📋 체계적인 시스템</span>
                )}
                {country.profile.order <= 2 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">🎨 자유로운 분위기</span>
                )}
                {country.profile.emotion >= 4 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">💬 감정 표현 풍부</span>
                )}
                {country.profile.indulgence >= 4 && (
                  <span className="px-3 py-1.5 bg-white rounded-full text-sm text-[#2E4057] font-medium shadow-sm">🎊 즐거움 추구</span>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* 대안 국가 */}
        {alternatives.length > 0 && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="mt-8"
          >
            <p className="text-center text-[#2E4057]/70 mb-4 font-medium">
              이런 나라도 잘 어울려요
            </p>
            <div className="flex justify-center flex-wrap gap-3">
              {alternatives.map((alt, index) => (
                <motion.div
                  key={alt.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.7 + index * 0.1, type: 'spring' }}
                  className="flex items-center gap-2 px-5 py-3 bg-white/90 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-shadow"
                >
                  <span className="text-2xl">{alt.emoji}</span>
                  <span className="text-[#2E4057] font-medium">{alt.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 버튼 영역 */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyLink}
            className="group flex items-center justify-center gap-2 px-8 py-4 bg-[#2E4057] text-white font-semibold rounded-2xl shadow-lg hover:bg-[#3a5270] transition-all"
          >
            {linkCopied ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                링크가 복사되었습니다!
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                결과 링크 복사하기
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-[#2E4057] text-[#2E4057] font-semibold rounded-2xl hover:bg-[#E8F4F8] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            다시 테스트하기
          </motion.button>
        </motion.div>

        {/* 푸터 */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center text-[#2E4057]/40 text-sm mt-12"
        >
          나와 맞는 나라 찾기 테스트
        </motion.p>
      </div>
    </motion.div>
  );
}
