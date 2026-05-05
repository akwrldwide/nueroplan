const fs = require('fs');
const file = 'frontend/src/pages/Dashboard.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 1. imports
lines.splice(7, 0, "import CalendarView from '../components/CalendarView';\nimport DailyDetail from '../components/DailyDetail';");

// 2. state
const idx = lines.findIndex(l => l.includes('const [loading, setLoading]'));
lines.splice(idx + 1, 0, "    const [selectedDate, setSelectedDate] = useState(new Date());");

// 3. UI
const startIdx = lines.findIndex(l => l.includes('{/* Study Plan Section */}'));
const endIdx = lines.findIndex(l => l.includes('{/* Sidebar Column */}')) - 2;

const newUI = `                        {/* Study Plan Header Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                            <div className="px-6 py-5 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50/50 gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Your Adaptive Study Plan</h3>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => window.location.href = '/onboarding'}
                                        className="flex items-center text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                                    >
                                        <List className="w-4 h-4 mr-1.5 text-gray-500" />
                                        Manage Topics
                                    </button>
                                    <button
                                        onClick={openBulkModal}
                                        className="flex items-center text-sm font-medium text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                                    >
                                        <CalendarDays className="w-4 h-4 mr-1.5 text-gray-500" />
                                        Manage Exam Dates
                                    </button>
                                    <button
                                        onClick={handleRecalculate}
                                        className="flex items-center text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-1.5" />
                                        Recalculate Plan
                                    </button>
                                </div>
                            </div>
                        </div>

                        {!plan || !plan.sessions || plan.sessions.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-6 p-6 text-center py-12">
                                <CalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No active plan found</h3>
                                <p className="mt-1 text-sm text-gray-500">Click recalculate to generate a new optimized schedule.</p>
                                <button
                                    onClick={handleRecalculate}
                                    className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl shadow hover:bg-indigo-700 transition cursor-pointer"
                                >
                                    Generate Plan Now
                                </button>
                            </div>
                        ) : (
                            <>
                                <CalendarView
                                    sessions={plan.sessions}
                                    courses={courses}
                                    selectedDate={selectedDate}
                                    onSelectDate={setSelectedDate}
                                />
                                <DailyDetail
                                    date={selectedDate}
                                    sessions={plan.sessions}
                                    courses={courses}
                                    onCompleteSession={handleCompleteSession}
                                />
                            </>
                        )}`;

lines.splice(startIdx, endIdx - startIdx + 1, newUI);
fs.writeFileSync(file, lines.join('\n'));
