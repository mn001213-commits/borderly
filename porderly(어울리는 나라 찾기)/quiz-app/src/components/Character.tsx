import { motion } from 'framer-motion';
import type { CharacterImage } from '../types';

import greetingImg from '../assets/images/인사하기.png';
import questionImg from '../assets/images/물음표.png';
import writingImg from '../assets/images/기록하기.png';
import confusedImg from '../assets/images/당황.png';
import checkImg from '../assets/images/체크.png';
import loveImg from '../assets/images/사랑하기.png';
import giftImg from '../assets/images/선물하기.png';
import pointingImg from '../assets/images/지시하기.png';
import sleepingImg from '../assets/images/쿨쿨자기.png';
import errorImg from '../assets/images/x.png';

const imageMap: Record<CharacterImage, string> = {
  greeting: greetingImg,
  question: questionImg,
  writing: writingImg,
  confused: confusedImg,
  check: checkImg,
  love: loveImg,
  gift: giftImg,
  pointing: pointingImg,
  sleeping: sleepingImg,
  error: errorImg
};

interface CharacterProps {
  type: CharacterImage;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  animate?: boolean;
  className?: string;
}

export function Character({ type, size = 'md', animate = true, className = '' }: CharacterProps) {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-56 h-56',
    xl: 'w-72 h-72',
    '2xl': 'w-96 h-96'
  };

  const imageSrc = imageMap[type];

  const imageClasses = "w-full h-full object-contain drop-shadow-lg";

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={`${sizeClasses[size]} flex items-center justify-center ${className}`}
      >
        <motion.img
          src={imageSrc}
          alt="Borderly Character"
          className={imageClasses}
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      </motion.div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center ${className}`}>
      <img
        src={imageSrc}
        alt="Borderly Character"
        className={imageClasses}
      />
    </div>
  );
}
