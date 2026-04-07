import { useState, useCallback } from 'react';
import type { QuizState, UserAnswer, MatchResult, QuestionOption } from '../types';
import { questions, totalQuestions } from '../data/questions';
import { calculateMatch } from '../utils/matchingAlgorithm';

interface UseQuizReturn {
  state: QuizState;
  currentQuestionIndex: number;
  currentQuestion: typeof questions[0] | null;
  answers: UserAnswer[];
  result: MatchResult | null;
  progress: number;
  startQuiz: () => void;
  answerQuestion: (option: QuestionOption) => void;
  reset: () => void;
}

export function useQuiz(): UseQuizReturn {
  const [state, setState] = useState<QuizState>('landing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [result, setResult] = useState<MatchResult | null>(null);

  const currentQuestion = state === 'quiz' ? questions[currentQuestionIndex] : null;
  const progress = ((currentQuestionIndex) / totalQuestions) * 100;

  const startQuiz = useCallback(() => {
    setState('quiz');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setResult(null);
  }, []);

  const answerQuestion = useCallback((option: QuestionOption) => {
    const currentQ = questions[currentQuestionIndex];
    const newAnswer: UserAnswer = {
      questionId: currentQ.id,
      selectedOption: option
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentQuestionIndex < totalQuestions - 1) {
      // 다음 질문으로
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // 모든 질문 완료 - 결과 계산
      setState('calculating');

      // 약간의 딜레이 후 결과 표시 (애니메이션 효과)
      setTimeout(() => {
        const matchResult = calculateMatch(newAnswers);
        setResult(matchResult);
        setState('result');
      }, 1500);
    }
  }, [currentQuestionIndex, answers]);

  const reset = useCallback(() => {
    setState('landing');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setResult(null);
  }, []);

  return {
    state,
    currentQuestionIndex,
    currentQuestion,
    answers,
    result,
    progress,
    startQuiz,
    answerQuestion,
    reset
  };
}
