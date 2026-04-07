import { AnimatePresence } from 'framer-motion';
import { useQuiz } from './hooks/useQuiz';
import { Landing } from './components/Landing';
import { Quiz } from './components/Quiz';
import { Calculating } from './components/Calculating';
import { Result } from './components/Result';
import backgroundImg from './assets/images/배경화면.png';

function App() {
  const {
    state,
    currentQuestionIndex,
    currentQuestion,
    result,
    progress,
    startQuiz,
    answerQuestion,
    reset
  } = useQuiz();

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${backgroundImg})` }}
    >
      <div className="min-h-screen bg-gradient-to-b from-[#A8D8EA]/30 to-[#E8F4F8]/50 backdrop-blur-[2px]">
        <AnimatePresence mode="wait">
          {state === 'landing' && (
            <Landing key="landing" onStart={startQuiz} />
          )}

          {state === 'quiz' && currentQuestion && (
            <Quiz
              key={`quiz-${currentQuestion.id}`}
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              progress={progress}
              onAnswer={answerQuestion}
            />
          )}

          {state === 'calculating' && (
            <Calculating key="calculating" />
          )}

          {state === 'result' && result && (
            <Result key="result" result={result} onReset={reset} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
