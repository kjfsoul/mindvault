
import React, { useState, useCallback } from 'react';
import { summarizeConversation, extractIdeas, createTasks } from '../services/geminiService';
import { calculateOpportunityScore } from '../services/scoringService';
import { ConversationSummary, Idea, Task, RawIdea, RawTask, IdeaUpdatePayload } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { LoaderIcon } from './icons/LoaderIcon';

const Dashboard: React.FC = () => {
    const [fileContent, setFileContent] = useState<string>('');
    const [fileName, setFileName] = useState<string>('');
    const [summary, setSummary] = useState<ConversationSummary | null>(null);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'ideas' | 'tasks'>('ideas');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setFileContent(text);
            };
            reader.readAsText(file);
        }
    };

    const processMemory = useCallback(async () => {
        if (!fileContent) {
            setError('Please upload a file first.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSummary(null);
        setIdeas([]);
        setTasks([]);

        try {
            // Pass #1: Summarize
            const conversationSummary = await summarizeConversation(fileContent);
            setSummary(conversationSummary);

            // Pass #2: Extract Ideas
            const rawIdeas: RawIdea[] = await extractIdeas(conversationSummary);
            const initialIdeas: Idea[] = rawIdeas.map((rawIdea) => {
                 // Seed initial R and E values manually, U and M are also seeded for demo
                const ideaMetrics = {
                    reach: 50,
                    urgency: 50,
                    marketSize: 50,
                    effort: 50,
                };
                return {
                    ...rawIdea,
                    id: `idea-${Math.random().toString(36).substr(2, 9)}`,
                    ...ideaMetrics,
                    opportunityScore: calculateOpportunityScore(ideaMetrics),
                };
            });
            setIdeas(initialIdeas);

            // Pass #3: Taskifier
            if(rawIdeas.length > 0) {
                const rawTasks: RawTask[] = await createTasks(rawIdeas);
                const processedTasks: Task[] = rawTasks.map((rawTask) => ({
                    ...rawTask,
                    id: `task-${Math.random().toString(36).substr(2, 9)}`,
                }));
                setTasks(processedTasks);
            }

        } catch (e: any) {
            console.error(e);
            setError(`An error occurred during processing: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [fileContent]);

    const handleIdeaUpdate = useCallback((payload: IdeaUpdatePayload) => {
        setIdeas(prevIdeas => {
            const newIdeas = prevIdeas.map(idea => {
                if (idea.id === payload.id) {
                    const updatedIdea = { ...idea, [payload.field]: payload.value };
                    const newScore = calculateOpportunityScore(updatedIdea);
                    return { ...updatedIdea, opportunityScore: newScore };
                }
                return idea;
            });
            return newIdeas.sort((a, b) => b.opportunityScore - a.opportunityScore);
        });
    }, []);

    const topIdeas = ideas.slice(0, 5);

    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-brand-text tracking-tight flex items-center justify-center gap-3">
                    <SparklesIcon /> MindVault Core
                </h1>
                <p className="text-brand-text-muted mt-2">Bring your memory, extract the future.</p>
            </header>

            <div className="bg-brand-surface rounded-lg shadow-xl p-6 mb-8 max-w-3xl mx-auto">
                <h2 className="text-2xl font-semibold mb-4 text-center">Bring My Memory</h2>
                <div className="flex flex-col items-center gap-4">
                    <label htmlFor="file-upload" className="w-full cursor-pointer bg-brand-primary/10 text-brand-primary font-semibold py-3 px-4 rounded-lg border-2 border-dashed border-brand-primary/50 hover:bg-brand-primary/20 hover:border-brand-primary transition-colors flex items-center justify-center gap-3">
                        <UploadIcon />
                        <span>{fileName || 'Upload Conversation Transcript'}</span>
                    </label>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md" />
                    <button
                        onClick={processMemory}
                        disabled={isLoading || !fileContent}
                        className="w-full bg-brand-primary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <><LoaderIcon /> Processing...</> : 'Instantiate MindVault'}
                    </button>
                    {error && <p className="text-red-400 mt-2 text-center">{error}</p>}
                </div>
            </div>

            {isLoading && (
                 <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
                    <p className="mt-4 text-brand-text-muted">Analyzing memory streams... this may take a moment.</p>
                 </div>
            )}

            {summary && !isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-brand-surface rounded-lg shadow-xl p-6">
                        <h3 className="text-2xl font-bold mb-4 text-brand-secondary">60-Second Recap</h3>
                        <div className="space-y-4 text-brand-text-muted">
                            <div>
                                <h4 className="font-semibold text-brand-text">Rundown</h4>
                                <p>{summary.rundown}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-brand-text">Artifacts</h4>
                                <p>{summary.artifacts}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-brand-text">Follow-ups</h4>
                                <p>{summary.followUps}</p>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-brand-surface rounded-lg shadow-xl p-6">
                        <div className="flex border-b border-gray-700 mb-4">
                            <button onClick={() => setActiveTab('ideas')} className={`py-2 px-4 font-semibold transition-colors ${activeTab === 'ideas' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-muted'}`}>Hot Ideas (Top 5)</button>
                            <button onClick={() => setActiveTab('tasks')} className={`py-2 px-4 font-semibold transition-colors ${activeTab === 'tasks' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-brand-text-muted'}`}>Open Loops</button>
                        </div>
                        
                        {activeTab === 'ideas' && (
                            <div className="space-y-4">
                                {topIdeas.length > 0 ? topIdeas.map((idea) => (
                                    <IdeaCard key={idea.id} idea={idea} onUpdate={handleIdeaUpdate} />
                                )) : <p className="text-brand-text-muted">No ideas were extracted from this memory.</p>}
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                             <div className="space-y-2">
                                {tasks.length > 0 ? tasks.map((task) => (
                                    <TaskCard key={task.id} task={task} />
                                )) : <p className="text-brand-text-muted">No tasks were generated.</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

interface IdeaCardProps {
    idea: Idea;
    onUpdate: (payload: IdeaUpdatePayload) => void;
}

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, onUpdate }) => {
    
    const handleInputChange = (field: 'reach' | 'urgency' | 'marketSize' | 'effort', value: string) => {
        const numValue = parseInt(value, 10);
        if(!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
            onUpdate({ id: idea.id, field, value: numValue });
        }
    };
    
    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-lg text-brand-text">{idea.title}</h4>
                    <p className="text-sm text-brand-text-muted">{idea.summary}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {idea.tags.map(tag => <span key={tag} className="text-xs bg-brand-primary/20 text-brand-primary px-2 py-1 rounded-full">{tag}</span>)}
                    </div>
                </div>
                <div className="text-center ml-4 flex-shrink-0">
                    <div className="text-3xl font-bold text-brand-secondary">{idea.opportunityScore}</div>
                    <div className="text-xs text-brand-text-muted">Opportunity</div>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                {(['reach', 'urgency', 'marketSize', 'effort'] as const).map(field => (
                    <div key={field}>
                        <label htmlFor={`${idea.id}-${field}`} className="font-semibold capitalize text-brand-text-muted">{field}</label>
                        <input
                            type="number"
                            id={`${idea.id}-${field}`}
                            min="1"
                            max="100"
                            value={idea[field]}
                            onChange={(e) => handleInputChange(field, e.target.value)}
                            className="w-full mt-1 bg-gray-900 border border-gray-600 rounded-md p-1.5 text-center focus:ring-brand-primary focus:border-brand-primary"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};


interface TaskCardProps {
    task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
    const priorityColors = {
        High: 'bg-red-500/20 text-red-300',
        Medium: 'bg-yellow-500/20 text-yellow-300',
        Low: 'bg-green-500/20 text-green-300',
    };
    return (
         <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 flex items-center justify-between">
            <div>
                <p className="text-brand-text">{task.title}</p>
                <p className="text-xs text-brand-text-muted">Idea: {task.relatedIdeaTitle}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${priorityColors[task.priority]}`}>{task.priority}</span>
        </div>
    );
}

export default Dashboard;
