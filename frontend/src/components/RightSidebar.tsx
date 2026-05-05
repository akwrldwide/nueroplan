import { useState, useEffect } from 'react';
import { PlayCircle, Loader2, X, ChevronRight, Check } from 'lucide-react';
import axios from 'axios';
import FlashcardQuiz from './FlashcardQuiz';

export default function RightSidebar() {
  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuizPayload, setActiveQuizPayload] = useState<any>(null);
  
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizStep, setQuizStep] = useState<1 | 2>(1);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  useEffect(() => {
    fetchSidebarData();
  }, []);

  const fetchSidebarData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const topicsRes = await axios.get('http://localhost:5000/api/topics', { headers });
      setAllTopics(topicsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueCourses = () => {
    const coursesMap = new Map();
    allTopics.forEach(t => {
      if (t.course?.id) coursesMap.set(t.course.id, t.course);
      else if (t.course_id && t.course) coursesMap.set(t.course_id, t.course); 
    });
    return Array.from(coursesMap.values());
  };

  const getCourseTopics = (courseId: string) => {
    return allTopics.filter(t => t.course?.id === courseId || t.course_id === courseId);
  };

  const openQuizModal = () => {
    setQuizStep(1);
    setSelectedCourse(null);
    setSelectedTopicIds([]);
    setIsQuizModalOpen(true);
  };

  const toggleTopicSelection = (topicId: string) => {
    setSelectedTopicIds(prev => 
        prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const handleStartQuiz = (isWholeCourse: boolean) => {
    setActiveQuizPayload({
        course: selectedCourse,
        isWholeCourse,
        topics: isWholeCourse 
            ? getCourseTopics(selectedCourse.id).map(t => t.topic_name)
            : getCourseTopics(selectedCourse.id).filter(t => selectedTopicIds.includes(t.id)).map(t => t.topic_name)
    });
    setIsQuizModalOpen(false);
  };

  return (
    <div className="space-y-6">

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-sm p-6 text-white text-center relative overflow-hidden group">
        <div className="relative z-10">
          <h4 className="font-bold text-lg mb-2">Test Knowledge</h4>
          <p className="text-sm text-indigo-100 mb-5">Generate an AI mock quiz for your upcoming exams.</p>
          <button 
            onClick={openQuizModal}
            className="w-full py-2.5 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:shadow-lg transition cursor-pointer shadow-sm"
          >
            Start AI Quiz
          </button>
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition duration-500"></div>
      </div>

      {activeQuizPayload && (
        <FlashcardQuiz 
          payload={activeQuizPayload} 
          onClose={() => setActiveQuizPayload(null)} 
          onComplete={(score, total) => {
            setActiveQuizPayload(null);
            fetchSidebarData();
          }} 
        />
      )}

      {isQuizModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                  {quizStep === 1 ? '1. Select Course' : '2. Select Coverage'}
              </h3>
              <button onClick={() => setIsQuizModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto w-full">
              {loading ? (
                 <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
              ) : quizStep === 1 ? (
                <div className="space-y-3">
                  {getUniqueCourses().length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No courses available.</p>
                  ) : (
                      getUniqueCourses().map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                              setSelectedCourse(c);
                              setQuizStep(2);
                          }}
                          className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="text-left">
                              <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-1">{c.code}</span>
                              <span className="text-sm font-semibold text-gray-900">{c.title}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300" />
                        </button>
                      ))
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                   <div>
                       <button
                          onClick={() => handleStartQuiz(true)}
                          className="w-full flex flex-col items-center justify-center p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                       >
                           <span className="text-indigo-700 font-bold">Assess Whole Course</span>
                           <span className="text-xs text-indigo-500 mt-1">Generate a quiz spanning all syllabus topics</span>
                       </button>
                   </div>
                   
                   <div className="flex items-center gap-4">
                       <span className="h-px bg-gray-100 flex-1"></span>
                       <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">OR SPECIFIC TOPICS</span>
                       <span className="h-px bg-gray-100 flex-1"></span>
                   </div>

                   <div className="space-y-2">
                       {getCourseTopics(selectedCourse.id).map(t => {
                           const isSelected = selectedTopicIds.includes(t.id);
                           return (
                               <button
                                  key={t.id}
                                  onClick={() => toggleTopicSelection(t.id)}
                                  className={`w-full flex items-center p-3 rounded-lg border text-left cursor-pointer transition ${isSelected ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                               >
                                   <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                                       {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                   </div>
                                   <span className={`text-sm ${isSelected ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{t.topic_name}</span>
                               </button>
                           )
                       })}
                   </div>

                   <button
                       disabled={selectedTopicIds.length === 0}
                       onClick={() => handleStartQuiz(false)}
                       className={`w-full py-3 rounded-xl font-bold transition-all shadow-sm ${selectedTopicIds.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                   >
                       Start Topic Quiz ({selectedTopicIds.length})
                   </button>

                   <button onClick={() => setQuizStep(1)} className="w-full text-center text-sm font-semibold text-gray-500 hover:text-gray-700 cursor-pointer pt-2">
                       ← Back to Courses
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
