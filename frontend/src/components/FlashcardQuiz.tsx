import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Loader2, Download } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';

interface Question {
  Topic: string;
  Difficulty: number;
  'Cognitive Level': string;
  Question: string;
  Options: string[];
  'Correct Answer': string;
  Explanation: string;
}

interface FlashcardQuizProps {
  payload: any;
  onClose: () => void;
  onComplete: (score: number, total: number) => void;
}

export default function FlashcardQuiz({ payload, onClose, onComplete }: FlashcardQuizProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [showChoice, setShowChoice] = useState(false);
  const [hasStartedPractice, setHasStartedPractice] = useState(false);

  // Derived state
  const currentAnswer = selectedAnswers[currentIndex];
  // Re-flip card logic: When user goes to previous, we might want to let them see question again, or just show answer. 
  // Let's add a local flip state that is true if answered, but can be manually toggled if they want to see the question again.
  const [manualFlipOverride, setManualFlipOverride] = useState<Record<number, boolean>>({});

  const isCardFlipped = !!currentAnswer && !manualFlipOverride[currentIndex];

  const startQuiz = async () => {
    setLoading(true);
    try {
        const response = await axios.post('http://localhost:5000/api/quiz/generate', {
            isWholeCourse: payload.isWholeCourse,
            topics: payload.topics,
            course_name: payload.course?.title || '',
            amount: 5,
            difficulty: 5
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setQuestions(response.data.questions);
        setShowChoice(true);
    } catch (error) {
        console.error('Failed to generate quiz', error);
        alert('Failed to generate quiz');
    } finally {
        setLoading(false);
    }
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q['Correct Answer']) {
            score++;
        }
    });
    return score;
  };

  const handleFinish = async () => {
    setIsFinished(true);
    const finalScore = calculateScore();
    const score_percentage = (finalScore / questions.length) * 100;
    
    // Extract difficulty implicitly from dynamically generated AI questions
    const avgDifficulty = questions.length > 0 
        ? Math.round(questions.reduce((sum, q) => sum + (Number(q.Difficulty) || 3), 0) / questions.length) 
        : 3;
    
    try {
        if (payload.course?.id) {
            await axios.post('http://localhost:5000/api/quiz/ai-result', {
                course_id: payload.course.id,
                topic_name: payload.isWholeCourse ? 'Whole Course' : payload.topics.join(', '),
                difficulty: avgDifficulty,
                score_percentage
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        }
    } catch (err) {
        console.error("Failed to save AI quiz result", err);
    }
  };

  const handleAnswerSelect = (option: string) => {
    if (currentAnswer) return; // Prevent changing answer
    
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: option }));
    setManualFlipOverride(prev => ({ ...prev, [currentIndex]: false }));
    
    const isCorrect = option === questions[currentIndex]['Correct Answer'];
    if (!isCorrect) {
      // Log Mistake (null topic_id for whole course since it maps to course loosely)
      axios.post('http://localhost:5000/api/mistakes', {
        topic_id: null,
        question: questions[currentIndex].Question,
        correct_answer: questions[currentIndex]['Correct Answer'],
        given_answer: option
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).catch(err => console.error('Failed to log mistake', err));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
    }
  };

  const toggleFlip = () => {
      if (!currentAnswer) return; // Cannot flip until answered
      setManualFlipOverride(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      const title = payload.isWholeCourse ? `Quiz: ${payload.course?.code} (Whole Course)` : `Quiz: ${payload.course?.code} Topics`;
      doc.text(title, 20, 20);
      
      doc.setFontSize(12);
      let yPos = 40;
      
      questions.forEach((q, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont("helvetica", "bold");
        const lines = doc.splitTextToSize(`${idx + 1}. ${q.Question}`, 170);
        doc.text(lines, 20, yPos);
        yPos += (lines.length * 7);
        
        doc.setFont("helvetica", "normal");
        q.Options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          const optLines = doc.splitTextToSize(`   ${letter}) ${opt}`, 170);
          doc.text(optLines, 20, yPos);
          yPos += (optLines.length * 7);
        });
        yPos += 5;
      });

      doc.addPage();
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Answer Key & Explanations", 20, 20);
      
      doc.setFontSize(11);
      yPos = 35;
      
      questions.forEach((q, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text(`${idx + 1}. Correct Answer: ${q['Correct Answer']}`, 20, yPos);
        yPos += 7;
        
        doc.setFont("helvetica", "normal");
        const expLines = doc.splitTextToSize(`Explanation: ${q.Explanation}`, 170);
        doc.text(expLines, 20, yPos);
        yPos += (expLines.length * 7) + 5;
      });
      
      doc.save(`${payload.course?.code || 'course'}_quiz.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Compact Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 truncate max-w-[200px] sm:max-w-md">Practice: {payload.course?.code}</h2>
            {questions.length > 0 && !isFinished && (
              <span className="text-[11px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full whitespace-nowrap hidden sm:inline-block">
                Question {currentIndex + 1} of {questions.length}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors cursor-pointer bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col justify-center min-h-[400px]">
          {questions.length === 0 && !loading ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Ready to test your knowledge?</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                We'll generate a custom 5-question quiz using AI to test your mastery of <b>{payload.isWholeCourse ? 'the whole course' : 'selected topics'}</b>.
              </p>
              <button
                onClick={startQuiz}
                className="mx-auto inline-flex items-center px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition cursor-pointer shadow-sm hover:shadow-md"
              >
                Generate Quiz
              </button>
            </div>
          ) : loading ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
              <p className="text-gray-500 font-medium animate-pulse">Crafting AI questions...</p>
            </div>
          ) : showChoice ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Your Custom Quiz is Ready!</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                We've generated {questions.length} questions. You can practice online now or download the PDF to study later offline.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
                <button
                  onClick={() => { setShowChoice(false); setHasStartedPractice(true); }}
                  className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow-sm cursor-pointer"
                >
                  Practice Now
                </button>
                <button
                  onClick={downloadPDF}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition flex items-center justify-center cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 mr-2" /> Download for Later
                </button>
              </div>
            </div>
          ) : isFinished ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm bg-gradient-to-br from-indigo-100 to-white border border-indigo-50">
                {calculateScore() === questions.length ? '🏆' : calculateScore() > 2 ? '👍' : '📚'}
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h3>
                <p className="text-lg text-gray-500">You scored <span className="font-bold text-indigo-600">{calculateScore()}/{questions.length}</span></p>
              </div>
              <div className="flex justify-center space-x-4 pt-4">
                  <button onClick={downloadPDF} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition flex items-center cursor-pointer">
                    <Download className="w-4 h-4 mr-2" /> Download PDF 
                  </button>
                  <button onClick={() => onComplete(calculateScore(), questions.length)} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition cursor-pointer shadow-sm">
                    Finish Practice
                  </button>
              </div>
            </div>
          ) : hasStartedPractice ? (
            <div className="w-full h-full relative flex flex-col" style={{ perspective: '1000px' }}>
                <div className="absolute top-0 left-0 w-full mb-4 z-10 flex border border-gray-100 rounded-full overflow-hidden bg-gray-100 h-1.5 -mt-2">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex) / questions.length) * 100}%` }} />
                </div>
                
                <motion.div
                    initial={false}
                    animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
                    className="w-full flex-1 relative mt-4 min-h-[400px]"
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {/* Front of Card (Question & Options) */}
                    <div 
                        className="absolute w-full h-full rounded-2xl border border-gray-200 shadow-sm bg-white overflow-hidden flex flex-col md:flex-row"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        {/* Left Column (40%) */}
                        <div className="w-full md:w-[40%] p-5 md:p-6 flex flex-col border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 shrink-0">
                            <div className="mb-3 flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-md">Diff {questions[currentIndex].Difficulty}/5</span>
                                <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider rounded-md">{questions[currentIndex]['Cognitive Level']}</span>
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-snug flex-1 overflow-y-auto pr-2">
                                {questions[currentIndex].Question}
                            </h3>
                        </div>
                        
                        {/* Right Column (60%) */}
                        <div className="w-full md:w-[60%] p-4 md:p-6 flex flex-col bg-white flex-1 overflow-y-auto">
                            <div className="flex-1 flex flex-col justify-center space-y-2.5">
                                {questions[currentIndex].Options.map((option, idx) => {
                                    const isSelected = currentAnswer === option;
                                    let buttonClass = "border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-sm text-gray-700";
                                    if (isSelected) buttonClass = "border-indigo-500 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-200 shadow-sm";

                                    return (
                                    <button
                                        key={idx}
                                        disabled={!!currentAnswer}
                                        onClick={() => handleAnswerSelect(option)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${buttonClass}`}
                                    >
                                        <span className="font-medium text-[13px] sm:text-sm block leading-tight">{option}</span>
                                    </button>
                                    );
                                })}
                            </div>
                            <div className="mt-3 flex justify-end shrink-0">
                                {currentAnswer && (
                                    <button onClick={toggleFlip} className="text-indigo-600 text-[11px] font-bold hover:underline cursor-pointer flex items-center gap-1">
                                        Flip to Result <ArrowRight className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Back of Card (Result & Explanation) */}
                    <div 
                        className="absolute w-full h-full rounded-2xl border border-gray-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white overflow-hidden flex flex-col md:flex-row"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                        {/* Left Column (40%) */}
                        <div className="w-full md:w-[40%] p-5 md:p-6 flex flex-col border-b md:border-b-0 md:border-r border-indigo-100/50 shrink-0 bg-white/50">
                            <div className="mb-4 flex items-center gap-2">
                               <span className="text-2xl">
                                 {currentAnswer === questions[currentIndex]['Correct Answer'] ? '✅' : '❌'}
                               </span>
                               <h3 className="font-bold text-xl text-gray-900">
                                 {currentAnswer === questions[currentIndex]['Correct Answer'] ? 'Correct!' : 'Incorrect'}
                               </h3>
                            </div>
                            
                            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                                <div className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Your Answer</span>
                                    <p className={`font-medium text-sm leading-tight ${currentAnswer === questions[currentIndex]['Correct Answer'] ? 'text-emerald-600' : 'text-rose-600'}`}>{currentAnswer}</p>
                                </div>

                                {currentAnswer !== questions[currentIndex]['Correct Answer'] && (
                                <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Correct Answer</span>
                                    <p className="font-medium text-sm text-gray-900 leading-tight">{questions[currentIndex]['Correct Answer']}</p>
                                </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column (60%) */}
                        <div className="w-full md:w-[60%] p-4 md:p-6 flex flex-col flex-1 overflow-y-auto">
                            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50 text-indigo-900 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-2 shrink-0">
                                    <span className="text-lg">💡</span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Detailed Explanation</span>
                                </div>
                                <p className="text-[13px] sm:text-sm leading-relaxed overflow-y-auto flex-1">{questions[currentIndex].Explanation}</p>
                            </div>

                            <div className="mt-3 flex justify-between items-center shrink-0">
                                <button onClick={toggleFlip} className="text-indigo-600 text-[11px] font-bold hover:underline cursor-pointer flex items-center gap-1">
                                    <ArrowLeft className="w-3 h-3" /> Flip to Question
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
          ) : null}
        </div>

        {/* Footer Navigation */}
        {questions.length > 0 && !loading && !isFinished && hasStartedPractice && (
           <div className="px-5 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50 z-20 shrink-0">
             <button
               disabled={currentIndex === 0}
               onClick={handlePrevious}
               className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm cursor-pointer"
             >
               <ArrowLeft className="w-4 h-4 mr-1.5" />
               <span className="hidden sm:inline">Previous</span>
             </button>
             
             <button
               disabled={!currentAnswer}
               onClick={handleNext}
               className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-sm cursor-pointer ${
                   currentAnswer 
                       ? 'bg-indigo-600 text-white hover:bg-indigo-700 transform hover:-translate-y-0.5 ring-2 ring-indigo-600 ring-offset-2' 
                       : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70'
               }`}
             >
               {currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}
               <ArrowRight className="w-4 h-4 ml-1.5" />
             </button>
           </div>
        )}

      </div>
    </div>
  );
}
