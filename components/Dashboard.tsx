



import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { summarizeConversation, extractIdeas, createTasks, researchWithGoogle, generateImage, deepDiveOnIdea } from '../services/geminiService';
import { processAndSaveConversation, getConversations, getConversationById, deleteConversation, deleteAllUserData } from '../services/supabaseService';
import { calculateOpportunityScore, getSpeedToRevenueCandidates } from '../services/scoringService';
import { ConversationSummary, Idea, Task, RawIdea, RawTask, IdeaUpdatePayload, ConversationListItem } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ScaffoldIcon } from './icons/ScaffoldIcon';
import { ScaffoldModal } from './ScaffoldModal';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { FilterIcon } from './icons/FilterIcon';
import { SortIcon } from './icons/SortIcon';
import ConsentModal from './ConsentModal';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CheckBadgeIcon } from './icons/CheckBadgeIcon';
import { GoogleIcon } from './icons/GoogleIcon';
import { ImageIcon } from './icons/ImageIcon';
import { NetworkIntelligenceIcon } from './icons/NetworkIntelligenceIcon';
import { CloseIcon } from './icons/CloseIcon';
import { InfoIcon } from './icons/InfoIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { UserIcon } from './icons/UserIcon';
import { PlusIcon } from './icons/PlusIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { PauseIcon } from './icons/PauseIcon';
import { PlayIcon } from './icons/PlayIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import Chatbot from './Chatbot';


// Declare libraries loaded from CDN
declare const jspdf: any;
declare const html2canvas: any;
declare const docx: any;
declare const mammoth: any;

// Helper to read file content asynchronously
const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error("File is not valid."));
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const result = e.target?.result;
                if (!result) throw new Error("File could not be read.");

                if (file.name.endsWith('.docx')) {
                    const textResult = await mammoth.extractRawText({ arrayBuffer: result as ArrayBuffer });
                    resolve(textResult.value);
                } else if (file.name.endsWith('.xlsx')) {
                    const XLSX = (window as any).XLSX;
                    const data = new Uint8Array(result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    if (!firstSheetName) throw new Error("XLSX file has no sheets.");
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData: unknown[] = XLSX.utils.sheet_to_json(worksheet);
                    const textContent = jsonData.map((row: any) => Object.entries(row).map(([key, value]) => `${key}: ${value}`).join('\n')).join('\n\n---\n\n');
                    resolve(textContent);
                } else {
                    resolve(result as string);
                }
            } catch (err: any) {
                reject(new Error(`Failed to parse file: ${err.message}`));
            }
        };
        reader.onerror = () => reject(new Error(`Failed to read file: ${reader.error?.message}`));
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.docx')) {
             reader.readAsArrayBuffer(file);
        }
        else reader.readAsText(file);
    });
};

const ScoreBar: React.FC<{ score: number, label: string, color: string }> = ({ score, label, color }) => {
    const width = `${score * 10}%`;
    return (
        <div className="flex items-center gap-2">
            <span className="font-semibold text-sm w-4">{label}</span>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className={color} style={{ width: width, height: '100%', borderRadius: 'inherit' }}></div>
            </div>
            <span className="font-bold text-sm text-brand-text w-6 text-right">{score}</span>
        </div>
    );
};

const ScoringTooltip: React.FC = () => (
    <div className="absolute bottom-full mb-2 w-72 bg-brand-bg border border-gray-600 rounded-lg shadow-lg p-3 text-xs text-brand-text-muted z-10 invisible group-hover:visible transition-opacity opacity-0 group-hover:opacity-100">
        <h4 className="font-bold text-brand-text mb-1">Opportunity Score Formula</h4>
        <p>This score is a weighted average of four key metrics, designed to balance potential against feasibility.</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
            <li><span className="font-semibold text-teal-300">40% Reach (R):</span> Market size & revenue potential.</li>
            <li><span className="font-semibold text-amber-300">30% Urgency (U):</span> Market need & trend alignment.</li>
            <li><span className="font-semibold text-sky-300">20% Moat (M):</span> Defensibility & scalability.</li>
            <li><span className="font-semibold text-purple-300">10% Effort (E):</span> Ease of implementation.</li>
        </ul>
    </div>
);

const PrintableIdeaCard: React.FC<{ idea: Idea }> = ({ idea }) => {
    const [isAnalysisVisible, setIsAnalysisVisible] = useState(false);
    const confidenceColor = idea.confidence > 0.7 ? 'text-green-400' : idea.confidence > 0.4 ? 'text-amber-400' : 'text-red-400';

    return (
    <div className="bg-brand-surface p-4 rounded-lg border border-gray-700 mb-4 break-inside-avoid">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-lg text-brand-text">{idea.title}</h4>
                <p className="text-sm text-brand-text-muted italic mt-1">{idea.summary}</p>
                 <div className="flex flex-wrap gap-2 mt-3">
                    {idea.tags.map(tag => <span key={tag} className="text-xs bg-indigo-500/30 text-indigo-300 px-2 py-1 rounded-full">{tag}</span>)}
                </div>
            </div>
            <div className="text-center ml-4 flex-shrink-0 relative group">
                <div className="text-3xl font-bold text-brand-secondary">{idea.opportunityScore}</div>
                 <div className="text-xs text-brand-text-muted flex items-center justify-center gap-1 cursor-help">
                    Opportunity <InfoIcon />
                </div>
                <ScoringTooltip />
            </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <ScoreBar score={idea.rReachScore} label="R" color="bg-teal-500" />
            <ScoreBar score={idea.uUrgencyScore} label="U" color="bg-amber-500" />
            <ScoreBar score={idea.mMoatScore} label="M" color="bg-sky-500" />
            <ScoreBar score={idea.eEffortScore} label="E" color="bg-purple-500" />
        </div>

        <div className="mt-3 text-sm text-brand-text-muted grid grid-cols-3 gap-2">
             <div><strong>Day 1 Revenue:</strong> <span className="font-semibold text-green-400">${idea.day1RevenueTarget}</span></div>
            <div><strong>Setup Time:</strong> <span className="font-semibold text-cyan-400">{idea.initialSetupTimeHours} hours</span></div>
            <div><strong>Confidence:</strong> <span className={`font-semibold ${confidenceColor}`}>{(idea.confidence * 100).toFixed(0)}%</span></div>
        </div>

        <div className="mt-4">
            <button 
                onClick={() => setIsAnalysisVisible(!isAnalysisVisible)} 
                className="w-full text-left text-sm font-semibold text-brand-text-muted hover:text-brand-text flex items-center justify-between p-2 rounded-md hover:bg-white/5"
            >
                <span>Market Analysis</span>
                <ChevronDownIcon className={`h-5 w-5 transition-transform duration-300 ${isAnalysisVisible ? 'rotate-180' : ''}`} />
            </button>
        </div>

        {isAnalysisVisible && idea.marketAnalysis && (
            <div className="animate-fade-in-up mt-2 pt-3 border-t border-gray-700/50 space-y-4 px-2">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-brand-secondary pt-1"><UserGroupIcon /></div>
                    <div>
                        <h5 className="font-semibold text-brand-text">Target Audience</h5>
                        <p className="text-sm text-brand-text-muted">{idea.marketAnalysis.targetAudience}</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-brand-secondary pt-1"><ShieldCheckIcon /></div>
                    <div>
                        <h5 className="font-semibold text-brand-text">Competitors</h5>
                        <ul className="list-disc list-inside text-sm text-brand-text-muted">
                            {idea.marketAnalysis.competitors.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                    </div>
                </div>
                 <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-brand-secondary pt-1"><LightBulbIcon /></div>
                    <div>
                        <h5 className="font-semibold text-brand-text">Unique Selling Proposition</h5>
                        <p className="text-sm text-brand-text-muted">{idea.marketAnalysis.uniqueSellingProposition}</p>
                    </div>
                </div>
            </div>
        )}
    </div>
    );
};

const PrintableTaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const priorityClasses: { [key in Task['priority']]: string } = {
        H: 'text-red-400 font-bold',
        M: 'text-amber-400 font-bold',
        L: 'text-green-400 font-bold',
    };
    const priorityMap = { H: 'High', M: 'Medium', L: 'Low' };
    const containerClasses = task.completed ? 'opacity-50' : '';
    const titleClasses = task.completed ? 'line-through' : '';

    return (
        <li className={`py-2 border-b border-gray-700/50 break-inside-avoid ${containerClasses}`}>
            <div>
                <span className={priorityClasses[task.priority]}>[{priorityMap[task.priority]}]</span>
                <span className={`text-brand-text ml-2 font-semibold ${titleClasses}`}>{task.title}</span>
                <span className="text-xs text-brand-text-muted ml-2 italic">(Idea: {task.relatedIdeaTitle})</span>
            </div>
            <div className="pl-4 mt-1">
                <p className="text-sm text-brand-text-muted"><strong className="text-gray-400">Steps:</strong> {task.steps.join(', ')}</p>
                {task.prerequisites.length > 0 && <p className="text-sm text-brand-text-muted"><strong className="text-gray-400">Prerequisites:</strong> {task.prerequisites.join(', ')}</p>}
                <p className="text-sm text-brand-text-muted"><strong className="text-gray-400">Owner:</strong> {task.owner}</p>
            </div>
        </li>
    );
};


const ReportForExport: React.FC<{
    summary: ConversationSummary;
    ideas: Idea[];
    tasks: Task[];
}> = ({ summary, ideas, tasks }) => (
    <div className="space-y-6">
        <h1 className="text-4xl font-bold text-brand-text text-center pb-4 border-b border-gray-600">MindVault Report</h1>
        
        <div className="bg-brand-surface rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-brand-secondary">60-Second Recap</h2>
            <div className="space-y-4 text-brand-text-muted">
                <div>
                    <h3 className="font-semibold text-brand-text text-lg">Rundown</h3>
                    <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                        {summary.rundown.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
                <div>
                    <h3 className="font-semibold text-brand-text text-lg">Artifacts</h3>
                    <div className="mt-1 space-y-3 pl-2">
                        {summary.artifacts.ideas.length > 0 && (
                            <div>
                                <h4 className="font-medium text-brand-text-muted">Ideas</h4>
                                <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                                    {summary.artifacts.ideas.map((item, index) => <li key={`idea-${index}`}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                        {summary.artifacts.tasks.length > 0 && (
                            <div>
                                <h4 className="font-medium text-brand-text-muted">Tasks</h4>
                                <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                                    {summary.artifacts.tasks.map((item, index) => <li key={`task-${index}`}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                        {summary.artifacts.decisions.length > 0 && (
                            <div>
                                <h4 className="font-medium text-brand-text-muted">Decisions</h4>
                                <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                                    {summary.artifacts.decisions.map((item, index) => <li key={`dec-${index}`}>{item}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-brand-text text-lg">Follow-ups</h3>
                    <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                        {summary.followups.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
            </div>
        </div>

        <div className="bg-brand-surface rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-brand-secondary">Ideas Extracted</h2>
            <div>
                {ideas.length > 0 ? ideas.map((idea) => (
                    <PrintableIdeaCard key={idea.id} idea={idea} />
                )) : <p className="text-brand-text-muted">No ideas were extracted.</p>}
            </div>
        </div>
        
        <div className="bg-brand-surface rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-brand-secondary">Tasks Generated</h2>
            <ul className="list-none p-0">
                {tasks.length > 0 ? tasks.map((task) => (
                    <PrintableTaskCard key={task.id} task={task} />
                )) : <p className="text-brand-text-muted">No tasks were generated.</p>}
            </ul>
        </div>
    </div>
);

type SortField = 'opportunityScore' | 'rReachScore' | 'uUrgencyScore' | 'mMoatScore' | 'eEffortScore' | 'day1RevenueTarget';
type SortDirection = 'asc' | 'desc';
interface FilterValues {
  min: number;
  max: number;
}
type RUMEScore = 'rReachScore' | 'uUrgencyScore' | 'mMoatScore' | 'eEffortScore';
type Filters = Record<RUMEScore, FilterValues>;

const TaskEditForm: React.FC<{
    task: Task;
    onSave: (updatedTask: Task) => void;
    onCancel: () => void;
}> = ({ task, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        title: task.title,
        steps: task.steps.join('\n'),
        priority: task.priority,
        owner: task.owner,
        prerequisites: task.prerequisites.join('\n'),
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...task,
            ...formData,
            steps: formData.steps.split('\n').map(s => s.trim()).filter(Boolean),
            prerequisites: formData.prerequisites.split('\n').map(p => p.trim()).filter(Boolean),
        });
    };

    return (
        <li className="bg-brand-bg/50 rounded-lg p-4 border border-brand-primary/50 animate-fade-in-up">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor={`title-${task.id}`} className="block text-sm font-medium text-brand-text-muted">Title</label>
                    <input type="text" name="title" id={`title-${task.id}`} value={formData.title} onChange={handleChange} className="mt-1 block w-full bg-brand-surface border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                </div>
                <div>
                    <label htmlFor={`steps-${task.id}`} className="block text-sm font-medium text-brand-text-muted">Steps (one per line)</label>
                    <textarea name="steps" id={`steps-${task.id}`} rows={3} value={formData.steps} onChange={handleChange} className="mt-1 block w-full bg-brand-surface border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor={`priority-${task.id}`} className="block text-sm font-medium text-brand-text-muted">Priority</label>
                        <select name="priority" id={`priority-${task.id}`} value={formData.priority} onChange={handleChange} className="mt-1 block w-full bg-brand-surface border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                            <option value="H">High</option>
                            <option value="M">Medium</option>
                            <option value="L">Low</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor={`owner-${task.id}`} className="block text-sm font-medium text-brand-text-muted">Owner</label>
                         <select name="owner" id={`owner-${task.id}`} value={formData.owner} onChange={handleChange} className="mt-1 block w-full bg-brand-surface border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                            <option value="Founder">Founder</option>
                            <option value="Dev Partner">Dev Partner</option>
                            <option value="AI Agent">AI Agent</option>
                        </select>
                    </div>
                </div>
                 <div>
                    <label htmlFor={`prerequisites-${task.id}`} className="block text-sm font-medium text-brand-text-muted">Prerequisites (one per line)</label>
                    <textarea name="prerequisites" id={`prerequisites-${task.id}`} rows={2} value={formData.prerequisites} onChange={handleChange} className="mt-1 block w-full bg-brand-surface border-gray-600 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors text-sm">Cancel</button>
                    <button type="submit" className="bg-brand-secondary text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-500 transition-colors text-sm">Save Changes</button>
                </div>
            </form>
        </li>
    );
};


const InteractiveTaskCard: React.FC<{
    task: Task;
    onToggle: (id: string) => void;
    onDragStart: (e: React.DragEvent<HTMLLIElement>, id: string) => void;
    onDragOver: (e: React.DragEvent<HTMLLIElement>) => void;
    onDrop: (e: React.DragEvent<HTMLLIElement>, id: string) => void;
    onEdit: () => void;
    isSelected: boolean;
    onSelect: (id: string) => void;
}> = ({ task, onToggle, onDragStart, onDragOver, onDrop, onEdit, isSelected, onSelect }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const priorityClasses: { [key in Task['priority']]: string } = {
        H: 'border-red-500/50',
        M: 'border-amber-500/50',
        L: 'border-green-500/50',
    };

    return (
        <li
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, task.id)}
            className={`bg-brand-bg/50 rounded-lg border-l-4 transition-all duration-300 cursor-grab ${isSelected ? 'border-brand-primary' : priorityClasses[task.priority]} ${task.completed ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start gap-3 p-3">
                 <div className="flex-shrink-0 cursor-default flex items-center gap-3 pt-0.5" onClick={(e) => {e.stopPropagation()}}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(task.id)}
                        className="h-5 w-5 rounded bg-brand-surface border-gray-600 text-brand-primary focus:ring-brand-primary cursor-pointer"
                        aria-label={`Select task ${task.title}`}
                    />
                    <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggle(task.id)}
                        className="h-5 w-5 rounded bg-brand-surface border-gray-600 text-brand-secondary focus:ring-brand-secondary cursor-pointer"
                        aria-label={`Mark task ${task.title} as complete`}
                    />
                </div>
                <div 
                    className="flex-1 flex justify-between items-center cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <p className={`font-semibold text-brand-text ${task.completed ? 'line-through' : ''}`}>
                        {task.title}
                    </p>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                            className="p-1 text-brand-text-muted hover:text-brand-text rounded-full hover:bg-white/10"
                            aria-label="Edit task"
                        >
                            <PencilIcon />
                        </button>
                        <div className="flex-shrink-0 text-brand-text-muted">
                            <ChevronDownIcon className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="px-3 pb-3 ml-16 cursor-auto animate-fade-in-up">
                   <div className="pt-3 border-t border-gray-700/50 space-y-3">
                        <div>
                            <h5 className="font-semibold text-sm text-brand-text mb-1">Steps</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm text-brand-text-muted">
                                {task.steps.map((step, index) => <li key={index}>{step}</li>)}
                            </ul>
                        </div>
                        <div className="flex items-center gap-6 text-xs text-brand-text-muted">
                            <span>Owner: <strong className="font-medium text-gray-300 bg-gray-700/50 px-2 py-0.5 rounded">{task.owner}</strong></span>
                            {task.prerequisites.length > 0 && 
                                <span>Prerequisites: <strong className="font-medium text-gray-300">{task.prerequisites.join(', ')}</strong></span>
                            }
                        </div>
                    </div>
                </div>
            )}
        </li>
    );
};

const FileQueueItem: React.FC<{ file: File; onRemove: () => void; }> = ({ file, onRemove }) => (
    <div className="bg-brand-bg/50 p-2 rounded-md flex items-center justify-between text-sm animate-fade-in-up">
        <div className="flex items-center gap-2 truncate">
            <DocumentTextIcon />
            <span className="text-brand-text truncate">{file.name}</span>
            <span className="text-brand-text-muted text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
        </div>
        <button onClick={onRemove} className="p-1 text-brand-text-muted hover:text-red-400 rounded-full hover:bg-red-500/10">
            <CloseIcon />
        </button>
    </div>
);

const UploadView: React.FC<{
    onProcess: (textContent: string, files: File[]) => void;
    isLoading: boolean;
}> = ({ onProcess, isLoading }) => {
    const [textContent, setTextContent] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleProcessClick = () => {
        onProcess(textContent, files);
    };

    const canProcess = (textContent.trim().length > 0 || files.length > 0);

    return (
        <div className="h-full flex flex-col justify-center items-center p-8">
            <div className="w-full max-w-2xl text-center">
                 <div className="bg-brand-surface p-6 rounded-xl shadow-2xl">
                     <h2 className="text-3xl font-bold mb-2 text-brand-text">MindVault</h2>
                     <p className="text-lg text-brand-text-muted mb-6">Turn Conversations into Actionable Insights.</p>
                     
                     <textarea 
                        value={textContent} 
                        onChange={e => setTextContent(e.target.value)}
                        rows={6}
                        placeholder="Paste a conversation transcript here..."
                        className="w-full bg-brand-bg border border-gray-600 rounded-md p-3 text-brand-text-muted focus:ring-brand-primary focus:border-brand-primary"
                     />
                     
                     <div className="my-4 text-center text-sm text-brand-text-muted">OR</div>

                     <div className="space-y-3">
                         {files.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-brand-bg rounded-md">
                                {files.map((file, index) => (
                                    <FileQueueItem key={`${file.name}-${index}`} file={file} onRemove={() => handleRemoveFile(index)} />
                                ))}
                            </div>
                         )}

                         <label htmlFor="file-upload" className="cursor-pointer w-full bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-500 transition-colors flex items-center justify-center gap-2">
                             <UploadIcon />
                             <span>Add Memory Files</span>
                         </label>
                         <input id="file-upload" ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} accept=".txt,.md,.json,.xlsx,.docx" />
                     </div>

                     <div className="mt-6">
                        <button 
                            onClick={handleProcessClick}
                            disabled={!canProcess || isLoading} 
                            className="w-full bg-brand-secondary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-emerald-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center min-w-[180px]"
                        >
                            {isLoading ? <LoaderIcon /> : 'Start Analysis'}
                        </button>
                     </div>
                </div>
            </div>
        </div>
    );
};

const ResultsView: React.FC<{
    summary: ConversationSummary | null;
    ideas: Idea[];
    tasks: Task[];
    filteredAndSortedIdeas: Idea[];
    speedToRevenueCandidates: Idea[];
    tasksByIdea: Record<string, { title: string; tasks: Task[] }>;
    onDownloadPdf: () => void;
    onDownloadDocx: () => void;
    onDownloadHtml: () => void;
    onDeepDive: (idea: Idea) => void;
    onScaffold: (idea: Idea) => void;
    onToggleTaskCompletion: (taskId: string) => void;
    onTaskUpdate: (updatedTask: Task) => void;
    handleDragStart: (e: React.DragEvent<HTMLLIElement>, id: string) => void;
    handleDragOver: (e: React.DragEvent<HTMLLIElement>) => void;
    handleDrop: (e: React.DragEvent<HTMLLIElement>, targetId: string) => void;
    handleSelectTask: (taskId: string) => void;
    handleSelectAllForIdea: (ideaTasks: Task[]) => void;
    selectedTaskIds: Set<string>;
    editingTaskId: string | null;
    setEditingTaskId: (id: string | null) => void;
    sortField: SortField;
    setSortField: (field: SortField) => void;
    sortDirection: SortDirection;
    setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
    filters: Filters;
    handleFilterChange: (score: keyof Filters, type: 'min' | 'max', value: string) => void;
}> = (props) => {
    const { summary, ideas, tasks, filteredAndSortedIdeas, speedToRevenueCandidates, tasksByIdea } = props;
    const { onDownloadPdf, onDownloadDocx, onDownloadHtml, onDeepDive, onScaffold } = props;
    const { onToggleTaskCompletion, onTaskUpdate, handleDragStart, handleDragOver, handleDrop } = props;
    const { handleSelectTask, handleSelectAllForIdea, selectedTaskIds, editingTaskId, setEditingTaskId } = props;
    const { sortField, setSortField, sortDirection, setSortDirection, filters, handleFilterChange } = props;

    const [activeTab, setActiveTab] = useState<'ideas' | 'tasks' | 'studio'>('ideas');
    const [showDownloadOptions, setShowDownloadOptions] = useState<boolean>(false);
    const [showFilters, setShowFilters] = useState<boolean>(false);

    // AI Studio State
    const [activeStudioTab, setActiveStudioTab] = useState<'research' | 'image'>('research');
    const [researchQuery, setResearchQuery] = useState('');
    const [researchResult, setResearchResult] = useState<{ text: string; sources: any[] } | null>(null);
    const [isResearching, setIsResearching] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
    const [generatedImageUrl, setGeneratedImageUrl] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    
    const SelectAllForIdeaCheckbox = ({ ideaTasks }: { ideaTasks: Task[] }) => {
        const checkboxRef = useRef<HTMLInputElement>(null);
        const areAllSelected = ideaTasks.length > 0 && ideaTasks.every(t => selectedTaskIds.has(t.id));
        const areSomeSelected = ideaTasks.length > 0 && ideaTasks.some(t => selectedTaskIds.has(t.id));

        useEffect(() => {
            if (checkboxRef.current) {
                checkboxRef.current.checked = areAllSelected;
                checkboxRef.current.indeterminate = areSomeSelected && !areAllSelected;
            }
        }, [areAllSelected, areSomeSelected]);
        
        return (
            <input
                ref={checkboxRef}
                type="checkbox"
                onChange={() => handleSelectAllForIdea(ideaTasks)}
                className="h-5 w-5 rounded bg-brand-surface border-gray-600 text-brand-primary focus:ring-brand-primary cursor-pointer"
                aria-label="Select all tasks for this idea"
            />
        );
    };

    const handleDoResearch = async () => {
        if (!researchQuery) return;
        setIsResearching(true);
        setResearchResult(null);
        try {
            const result = await researchWithGoogle(researchQuery);
            setResearchResult(result);
        } catch (e: any) {
            console.error(`Research failed: ${e.message}`);
        } finally {
            setIsResearching(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt) return;
        setIsGeneratingImage(true);
        setGeneratedImageUrl('');
        try {
            const url = await generateImage(imagePrompt, imageAspectRatio);
            setGeneratedImageUrl(url);
        } catch (e: any) {
             console.error(`Image generation failed: ${e.message}`);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const filterOptions: {label: string, value: RUMEScore}[] = [
        { label: 'Reach (R)', value: 'rReachScore' },
        { label: 'Urgency (U)', value: 'uUrgencyScore' },
        { label: 'Moat (M)', value: 'mMoatScore' },
        { label: 'Effort (E)', value: 'eEffortScore' },
    ];

    return (
        <div className="animate-fade-in-up">
            {speedToRevenueCandidates.length > 0 && (
                <div className="mb-8">
                    <div className="bg-brand-surface rounded-lg shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-amber-400 mb-4">🚀 Quick Wins: Fastest to Revenue</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            {speedToRevenueCandidates.map(idea => (
                                <div key={idea.id} className="bg-brand-bg/50 p-4 rounded-lg border border-amber-400/30 transition-transform hover:scale-105">
                                    <h3 className="font-bold text-brand-text truncate">{idea.title}</h3>
                                    <p className="text-sm text-brand-text-muted mt-1 h-10 overflow-hidden">{idea.summary}</p>
                                    <div className="mt-3 flex justify-between items-center text-sm">
                                        <span className="font-semibold text-green-400 bg-green-500/20 px-2 py-1 rounded">${idea.day1RevenueTarget} <span className="text-xs text-green-300/80">Day 1</span></span>
                                        <span className="font-semibold text-cyan-400 bg-cyan-500/20 px-2 py-1 rounded">{idea.initialSetupTimeHours} hrs <span className="text-xs text-cyan-300/80">Setup</span></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {summary && (
                <div className="bg-brand-surface rounded-lg shadow-xl p-6 mb-8">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-brand-secondary">60-Second Recap</h2>
                        <div className="relative">
                            <button
                                onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                                className="bg-brand-primary/80 hover:bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <DownloadIcon />
                                <span>Export Report</span>
                                <ChevronDownIcon />
                            </button>
                            {showDownloadOptions && (
                                <div className="absolute right-0 mt-2 w-48 bg-brand-surface border border-gray-600 rounded-md shadow-lg z-10">
                                    <a onClick={onDownloadPdf} className="block px-4 py-2 text-sm text-brand-text hover:bg-brand-primary/20 cursor-pointer">Export as PDF</a>
                                    <a onClick={onDownloadDocx} className="block px-4 py-2 text-sm text-brand-text hover:bg-brand-primary/20 cursor-pointer">Export as DOCX</a>
                                    <a onClick={onDownloadHtml} className="block px-4 py-2 text-sm text-brand-text hover:bg-brand-primary/20 cursor-pointer">Export as HTML</a>
                                </div>
                            )}
                        </div>
                    </div>
                    {summary && (
                        <div className="grid md:grid-cols-3 gap-6 mt-4 text-sm text-brand-text-muted">
                            <div>
                                <h3 className="font-semibold text-brand-text mb-1">Rundown</h3>
                                <ul className="list-disc list-inside space-y-1">
                                    {summary.rundown.map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-brand-text mb-1">Artifacts</h3>
                                <ul className="list-disc list-inside space-y-1">
                                {summary.artifacts.ideas.length > 0 && <li>{summary.artifacts.ideas.length} Ideas Proposed</li>}
                                {summary.artifacts.tasks.length > 0 && <li>{summary.artifacts.tasks.length} Tasks Proposed</li>}
                                {summary.artifacts.decisions.length > 0 && <li>{summary.artifacts.decisions.length} Decisions Made</li>}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-semibold text-brand-text mb-1">Follow-ups</h3>
                                <ul className="list-disc list-inside space-y-1">
                                    {summary.followups.map((item, index) => <li key={index}>{item}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            <div className="bg-brand-surface rounded-lg shadow-xl p-6">
                <div className="flex items-center border-b border-gray-700 mb-4">
                    <button onClick={() => setActiveTab('ideas')} className={`py-2 px-4 font-semibold ${activeTab === 'ideas' ? 'border-b-2 border-brand-secondary text-brand-text' : 'text-brand-text-muted'}`}>Ideas ({filteredAndSortedIdeas.length})</button>
                    <button onClick={() => setActiveTab('tasks')} className={`py-2 px-4 font-semibold ${activeTab === 'tasks' ? 'border-b-2 border-brand-secondary text-brand-text' : 'text-brand-text-muted'}`}>Tasks ({tasks.length})</button>
                    <button onClick={() => setActiveTab('studio')} className={`py-2 px-4 font-semibold ${activeTab === 'studio' ? 'border-b-2 border-brand-secondary text-brand-text' : 'text-brand-text-muted'}`}>AI Studio</button>
                </div>
                
                {activeTab === 'ideas' && (
                   <div>
                        <div className="flex flex-wrap gap-4 items-center mb-4 p-3 bg-brand-bg rounded-md">
                            <div className="flex items-center gap-2">
                                <label htmlFor="sort-by" className="text-sm font-medium text-brand-text-muted">Sort by:</label>
                                <select
                                    id="sort-by"
                                    value={sortField}
                                    onChange={e => setSortField(e.target.value as SortField)}
                                    className="bg-brand-surface border border-gray-600 rounded-md py-1 px-2 text-sm"
                                >
                                    <option value="opportunityScore">Opportunity Score</option>
                                    <option value="day1RevenueTarget">Day 1 Revenue</option>
                                    <option value="rReachScore">Reach (R)</option>
                                    <option value="uUrgencyScore">Urgency (U)</option>
                                    <option value="mMoatScore">Moat (M)</option>
                                    <option value="eEffortScore">Effort (E)</option>
                                </select>
                            </div>
                            <button
                                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                className="p-1.5 bg-brand-surface border border-gray-600 rounded-md hover:bg-gray-700"
                                aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                            >
                                <SortIcon direction={sortDirection} />
                            </button>
                             <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-1.5 rounded-md flex items-center gap-1.5 text-sm ${showFilters ? 'bg-brand-primary text-white' : 'bg-brand-surface border border-gray-600 hover:bg-gray-700'}`}
                            >
                                <FilterIcon />
                                Filters
                            </button>
                        </div>
                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-brand-bg/50 rounded-md border border-gray-700/50">
                                {filterOptions.map(({label, value}) => (
                                    <div key={value}>
                                        <label className="block text-sm font-medium text-brand-text-muted mb-1">{label}</label>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number"
                                                min="1" max="10"
                                                value={filters[value].min}
                                                onChange={e => handleFilterChange(value, 'min', e.target.value)}
                                                className="w-full bg-brand-surface border border-gray-600 rounded-md p-1 text-sm text-center"
                                                placeholder="Min"
                                            />
                                            <span className="text-brand-text-muted">-</span>
                                             <input 
                                                type="number"
                                                min="1" max="10"
                                                value={filters[value].max}
                                                onChange={e => handleFilterChange(value, 'max', e.target.value)}
                                                className="w-full bg-brand-surface border border-gray-600 rounded-md p-1 text-sm text-center"
                                                placeholder="Max"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <h3 className="text-xl font-bold mb-4 text-brand-text">Hot Ideas</h3>
                        {filteredAndSortedIdeas.length > 0 ? (
                            <div className="space-y-4">
                                {filteredAndSortedIdeas.map(idea => (
                                    <div key={idea.id} className="bg-brand-bg/50 p-4 rounded-lg">
                                        <PrintableIdeaCard idea={idea} />
                                        <div className="flex justify-end items-center gap-2 mt-2">
                                             <button 
                                                onClick={() => onDeepDive(idea)}
                                                className="bg-purple-600/80 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
                                            >
                                                <NetworkIntelligenceIcon />
                                                <span>Deep Dive</span>
                                            </button>
                                            <button 
                                                onClick={() => onScaffold(idea)}
                                                className="bg-brand-primary/80 hover:bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
                                            >
                                                <ScaffoldIcon />
                                                <span>Scaffold with AppSmithGPT</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-brand-text-muted text-center py-8">No ideas match the current filters.</p>
                        )}
                    </div>
                )}
                 {activeTab === 'tasks' && (
                    <div>
                        <h3 className="text-xl font-bold mb-4 text-brand-text">Action Plan</h3>
                        {Object.keys(tasksByIdea).length > 0 ? (
                            <div className="space-y-6">
                                {Object.entries(tasksByIdea).map(([ideaId, { title, tasks: ideaTasks }]) => (
                                    <div key={ideaId}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <SelectAllForIdeaCheckbox ideaTasks={ideaTasks} />
                                            <h4 className="font-semibold text-lg text-brand-secondary">{title}</h4>
                                        </div>
                                        <ul className="space-y-2">
                                            {ideaTasks.map(task => (
                                                 editingTaskId === task.id ? (
                                                    <TaskEditForm
                                                        key={task.id}
                                                        task={task}
                                                        onSave={onTaskUpdate}
                                                        onCancel={() => setEditingTaskId(null)}
                                                    />
                                                ) : (
                                                    <InteractiveTaskCard 
                                                        key={task.id} 
                                                        task={task}
                                                        onToggle={onToggleTaskCompletion}
                                                        onDragStart={handleDragStart}
                                                        onDragOver={handleDragOver}
                                                        onDrop={handleDrop}
                                                        onEdit={() => setEditingTaskId(task.id)}
                                                        isSelected={selectedTaskIds.has(task.id)}
                                                        onSelect={handleSelectTask}
                                                    />
                                                )
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-brand-text-muted text-center py-8">No tasks were generated.</p>
                        )}
                   </div>
                )}
                {activeTab === 'studio' && (
                     <div>
                        <div className="flex items-center border-b border-gray-800 mb-4">
                            <button onClick={() => setActiveStudioTab('research')} className={`py-2 px-4 font-semibold flex items-center gap-2 ${activeStudioTab === 'research' ? 'border-b-2 border-brand-primary text-brand-text' : 'text-brand-text-muted'}`}><GoogleIcon /> Research</button>
                            <button onClick={() => setActiveStudioTab('image')} className={`py-2 px-4 font-semibold flex items-center gap-2 ${activeStudioTab === 'image' ? 'border-b-2 border-brand-primary text-brand-text' : 'text-brand-text-muted'}`}><ImageIcon /> Image Generation</button>
                        </div>
                        {activeStudioTab === 'research' && (
                            <div className="animate-fade-in-up">
                                <h3 className="text-xl font-bold mb-2 text-brand-text">Research with Google Search</h3>
                                <p className="text-brand-text-muted mb-4 text-sm">Get up-to-date information by grounding the model with Google Search.</p>
                                <div className="flex gap-2 mb-4">
                                    <input 
                                        type="text"
                                        value={researchQuery}
                                        onChange={e => setResearchQuery(e.target.value)}
                                        placeholder="Ask a question..."
                                        className="flex-grow bg-brand-surface border border-gray-600 rounded-md py-2 px-3 focus:ring-brand-primary focus:border-brand-primary"
                                    />
                                    <button onClick={handleDoResearch} disabled={isResearching || !researchQuery} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-gray-500 flex items-center justify-center min-w-[120px]">
                                        {isResearching ? <LoaderIcon /> : 'Research'}
                                    </button>
                                </div>
                                {researchResult && (
                                    <div className="mt-6 bg-brand-bg/50 p-4 rounded-lg">
                                        <p className="whitespace-pre-wrap text-brand-text">{researchResult.text}</p>
                                        {researchResult.sources.length > 0 && (
                                            <div className="mt-4 pt-3 border-t border-gray-700">
                                                <h4 className="font-semibold text-sm text-brand-text-muted">Sources:</h4>
                                                <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                                    {researchResult.sources.map((source, index) => (
                                                        <li key={index}>
                                                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                                {source.web.title}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeStudioTab === 'image' && (
                             <div className="animate-fade-in-up">
                                <h3 className="text-xl font-bold mb-2 text-brand-text">Generate an Image</h3>
                                <p className="text-brand-text-muted mb-4 text-sm">Create an image from a text prompt using Imagen.</p>
                                <div className="space-y-4">
                                    <textarea
                                        value={imagePrompt}
                                        onChange={e => setImagePrompt(e.target.value)}
                                        placeholder="Enter a prompt for your image..."
                                        rows={3}
                                        className="w-full bg-brand-surface border border-gray-600 rounded-md py-2 px-3 focus:ring-brand-primary focus:border-brand-primary"
                                    />
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <label htmlFor="aspect-ratio" className="text-sm font-medium text-brand-text-muted mr-2">Aspect Ratio:</label>
                                            <select
                                                id="aspect-ratio"
                                                value={imageAspectRatio}
                                                onChange={e => setImageAspectRatio(e.target.value)}
                                                className="bg-brand-surface border border-gray-600 rounded-md py-2 px-2 text-sm"
                                            >
                                                <option value="1:1">Square (1:1)</option>
                                                <option value="16:9">Landscape (16:9)</option>
                                                <option value="9:16">Portrait (9:16)</option>
                                                <option value="4:3">Standard (4:3)</option>
                                                <option value="3:4">Tall (3:4)</option>
                                            </select>
                                        </div>
                                        <button onClick={handleGenerateImage} disabled={isGeneratingImage || !imagePrompt} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-indigo-500 disabled:bg-gray-500 flex items-center justify-center min-w-[120px]">
                                            {isGeneratingImage ? <LoaderIcon /> : 'Generate'}
                                        </button>
                                    </div>
                                </div>
                                 {generatedImageUrl && (
                                     <div className="mt-6 text-center">
                                        <img src={generatedImageUrl} alt="Generated image" className="max-w-full md:max-w-lg mx-auto rounded-lg shadow-lg" />
                                    </div>
                                 )}
                            </div>
                        )}
                     </div>
                )}
            </div>
        </div>
    );
};

type ProcessingQueueItem = {
  id: string;
  name: string;
  source: 'text' | File;
  status: 'Queued' | 'Reading' | 'Summarizing' | 'Extracting Ideas' | 'Creating Tasks' | 'Done' | 'Error';
  error?: string;
  textContent?: string; // Only for text source
};

const ProcessingStatus: React.FC<{
    queue: ProcessingQueueItem[];
    isPaused: boolean;
    onPause: () => void;
    onResume: () => void;
    onCancel: () => void;
}> = ({ queue, isPaused, onPause, onResume, onCancel }) => {
    const completedCount = queue.filter(item => item.status === 'Done').length;
    const progress = queue.length > 0 ? (completedCount / queue.length) * 100 : 0;
    
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-brand-surface border-t border-gray-700 p-4 shadow-2xl animate-fade-in-up z-30">
            <div className="max-w-screen-xl mx-auto">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg text-brand-text">Analysis in Progress...</h3>
                    <div className="flex items-center gap-2">
                        {isPaused ? (
                            <button onClick={onResume} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                <PlayIcon /> Resume
                            </button>
                        ) : (
                            <button onClick={onPause} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                <PauseIcon /> Pause
                            </button>
                        )}
                        <button onClick={onCancel} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                            <XCircleIcon/> Cancel
                        </button>
                    </div>
                </div>

                <div className="w-full bg-brand-bg rounded-full h-2.5 mb-2">
                    <div className="bg-brand-secondary h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                 <p className="text-sm text-brand-text-muted text-center mb-3">Completed {completedCount} of {queue.length} items</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {queue.map(item => (
                        <div key={item.id} className="bg-brand-bg/50 p-2 rounded-md text-sm">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-brand-text truncate pr-2">{item.name}</span>
                                {item.status === 'Queued' && <span className="text-gray-400 font-medium">Queued</span>}
                                {item.status.includes('ing') && <div className="flex items-center gap-1 text-cyan-400"><LoaderIcon/> {item.status}</div>}
                                {item.status === 'Done' && <span className="text-green-400 font-medium">Done</span>}
                                {item.status === 'Error' && <span className="text-red-400 font-medium" title={item.error}>Error</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// FIX: Added mergeSummaries function definition to resolve "Cannot find name 'mergeSummaries'" error.
// This function combines multiple conversation summaries. Using Set to avoid duplicate entries.
const mergeSummaries = (
    existing: ConversationSummary | null,
    toAdd: ConversationSummary
): ConversationSummary => {
    if (!existing) return toAdd;

    return {
        rundown: [...new Set([...existing.rundown, ...toAdd.rundown])],
        artifacts: {
            ideas: [...new Set([...existing.artifacts.ideas, ...toAdd.artifacts.ideas])],
            tasks: [...new Set([...existing.artifacts.tasks, ...toAdd.artifacts.tasks])],
            decisions: [...new Set([...existing.artifacts.decisions, ...toAdd.artifacts.decisions])],
        },
        followups: [...new Set([...existing.followups, ...toAdd.followups])],
    };
};

const Dashboard: React.FC = () => {
    // Current Session State
    const [summary, setSummary] = useState<ConversationSummary | null>(null);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [error, setError] = useState<string>('');

    // App-wide State
    const [conversations, setConversations] = useState<ConversationListItem[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isLoadingConversation, setIsLoadingConversation] = useState(false);
    const [sessionId, setSessionId] = useState<string>(`local-${Date.now()}`);

    // UI State
    const [scaffoldingIdea, setScaffoldingIdea] = useState<Idea | null>(null);
    const [showConsentModal, setShowConsentModal] = useState<boolean>(false);
    const [pendingContent, setPendingContent] = useState<{textContent: string, files: File[]} | null>(null);
    const [showAccountMenu, setShowAccountMenu] = useState(false);

    // Refs
    const reportExportRef = useRef<HTMLDivElement>(null);
    const draggedTaskId = useRef<string | null>(null);

    // AI Studio State
    const [deepDiveIdea, setDeepDiveIdea] = useState<Idea | null>(null);
    const [deepDiveResult, setDeepDiveResult] = useState('');
    const [isDeepDiving, setIsDeepDiving] = useState(false);

    // Task editing state
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

    // Bulk task actions state
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

    // Scoring Insights
    const [speedToRevenueCandidates, setSpeedToRevenueCandidates] = useState<Idea[]>([]);

    // Sorting and Filtering State
    const [sortField, setSortField] = useState<SortField>('opportunityScore');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [filters, setFilters] = useState<Filters>({
        rReachScore: { min: 1, max: 10 },
        uUrgencyScore: { min: 1, max: 10 },
        mMoatScore: { min: 1, max: 10 },
        eEffortScore: { min: 1, max: 10 },
    });
    
    // Processing Queue State
    const [processingQueue, setProcessingQueue] = useState<ProcessingQueueItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const processingControl = useRef({ isCancelled: false });

    const fetchConversations = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const data = await getConversations();
            setConversations(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    // Load session from localStorage on initial mount
    useEffect(() => {
        if (!selectedConversationId) {
            try {
                const savedSession = localStorage.getItem('mindvault_local_session');
                if (savedSession) {
                    const data = JSON.parse(savedSession);
                    setSummary(data.summary || null);
                    setIdeas(data.ideas || []);
                    setTasks(data.tasks || []);
                    setSpeedToRevenueCandidates(getSpeedToRevenueCandidates(data.ideas || []));
                }
            } catch (e) {
                console.error("Failed to load local session:", e);
                localStorage.removeItem('mindvault_local_session');
            }
        }
    }, [selectedConversationId]); 

    // Save session to localStorage when local data changes
    useEffect(() => {
        if (!selectedConversationId && (ideas.length > 0 || tasks.length > 0)) {
            const sessionToSave = {
                summary,
                ideas,
                tasks,
            };
            localStorage.setItem('mindvault_local_session', JSON.stringify(sessionToSave));
        }
    }, [summary, ideas, tasks, selectedConversationId]);


    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const handleSelectConversation = useCallback(async (id: string) => {
        if (selectedConversationId === id) return;
        
        localStorage.removeItem('mindvault_local_session');
        setIsLoadingConversation(true);
        setSelectedConversationId(id);
        setSessionId(id);
        setError('');
        setSummary(null);
        setIdeas([]);
        setTasks([]);
        setIsProcessing(false);

        try {
            const data = await getConversationById(id);
            if (data) {
                setSummary(data.summary);
                setIdeas(data.ideas || []);
                setTasks(data.tasks || []);
                setSpeedToRevenueCandidates(getSpeedToRevenueCandidates(data.ideas || []));
            } else {
                throw new Error("Conversation data could not be loaded.")
            }
        } catch (err: any) {
            setError(err.message);
            setSelectedConversationId(null);
        } finally {
            setIsLoadingConversation(false);
        }
    }, [selectedConversationId]);

    const handleDeleteConversation = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) return;
        
        try {
            await deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (selectedConversationId === id) {
                handleNewSession();
            }
        } catch (err: any) {
            setError(err.message);
        }
    };
    
    const handleDeleteAllData = async () => {
        if (!window.confirm("Are you sure you want to delete ALL your data? This will permanently remove all conversations, ideas, and tasks. This action cannot be undone.")) return;

        try {
            await deleteAllUserData();
            setConversations([]);
            handleNewSession();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setShowAccountMenu(false);
        }
    };

    const handleNewSession = () => {
        setSelectedConversationId(null);
        setSummary(null);
        setIdeas([]);
        setTasks([]);
        setIsProcessing(false);
        setError('');
        setProcessingQueue([]);
        setSessionId(`local-${Date.now()}`);
        localStorage.removeItem('mindvault_local_session');
    };


    const handleFilterChange = (
        score: keyof Filters,
        type: 'min' | 'max',
        value: string
    ) => {
        const numValue = parseInt(value, 10);
        if (value !== '' && (isNaN(numValue) || numValue < 1 || numValue > 10)) return;

        setFilters(prev => ({
            ...prev,
            [score]: {
                ...prev[score],
                [type]: value === '' ? (type === 'min' ? 1 : 10) : numValue
            }
        }));
    };

    const filteredAndSortedIdeas = useMemo(() => {
        return ideas
            .filter(idea => 
                idea.rReachScore >= filters.rReachScore.min && idea.rReachScore <= filters.rReachScore.max &&
                idea.uUrgencyScore >= filters.uUrgencyScore.min && idea.uUrgencyScore <= filters.uUrgencyScore.max &&
                idea.mMoatScore >= filters.mMoatScore.min && idea.mMoatScore <= filters.mMoatScore.max &&
                idea.eEffortScore >= filters.eEffortScore.min && idea.eEffortScore <= filters.eEffortScore.max
            )
            .sort((a, b) => {
                const valA = a[sortField];
                const valB = b[sortField];
                if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
    }, [ideas, sortField, sortDirection, filters]);
    
    const tasksByIdea = useMemo(() => {
        return ideas.reduce((acc, idea) => {
            const ideaTasks = tasks
                .filter(task => task.ideaIdLink === idea.id)
                .sort((a, b) => a.order - b.order);
            if (ideaTasks.length > 0) {
                acc[idea.id] = { title: idea.title, tasks: ideaTasks };
            }
            return acc;
        // FIX: Explicitly casting the initial value of reduce to fix incorrect type inference for the accumulator, resolving "Property does not exist on type '{}'" errors.
        }, {} as Record<string, { title: string; tasks: Task[] }>);
    }, [ideas, tasks]);

    const handleToggleTaskCompletion = (taskId: string) => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
            )
        );
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        setEditingTaskId(null);
    };

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, id: string) => {
        draggedTaskId.current = id;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
        e.preventDefault();
        if (!draggedTaskId.current || draggedTaskId.current === targetId) {
            draggedTaskId.current = null;
            return;
        }

        const draggedTask = tasks.find(t => t.id === draggedTaskId.current);
        const targetTask = tasks.find(t => t.id === targetId);

        if (!draggedTask || !targetTask || draggedTask.ideaIdLink !== targetTask.ideaIdLink) {
             draggedTaskId.current = null;
             return;
        }

        const ideaTasks = tasks
            .filter(t => t.ideaIdLink === draggedTask.ideaIdLink)
            .sort((a, b) => a.order - b.order);
        
        const otherTasks = tasks.filter(t => t.ideaIdLink !== draggedTask.ideaIdLink);
        
        const draggedIndex = ideaTasks.findIndex(t => t.id === draggedTaskId.current);
        const targetIndex = ideaTasks.findIndex(t => t.id === targetId);
        
        const [removed] = ideaTasks.splice(draggedIndex, 1);
        ideaTasks.splice(targetIndex, 0, removed);
        
        const updatedIdeaTasks = ideaTasks.map((task, index) => ({ ...task, order: index }));

        setTasks([...otherTasks, ...updatedIdeaTasks]);
        draggedTaskId.current = null;
    };

    const handleSelectTask = (taskId: string) => {
        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const handleSelectAllForIdea = (ideaTasks: Task[]) => {
        const taskIdsInGroup = new Set(ideaTasks.map(t => t.id));
        const selectedInGroupCount = ideaTasks.filter(t => selectedTaskIds.has(t.id)).length;

        setSelectedTaskIds(prev => {
            const newSet = new Set(prev);
            if (selectedInGroupCount === taskIdsInGroup.size) { // all are selected, so deselect them
                taskIdsInGroup.forEach(id => newSet.delete(id));
            } else { // not all are selected, so select them all
                taskIdsInGroup.forEach(id => newSet.add(id));
            }
            return newSet;
        });
    };

    const handleBulkComplete = () => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                selectedTaskIds.has(task.id) ? { ...task, completed: true } : task
            )
        );
        setSelectedTaskIds(new Set());
    };

    const handleBulkDelete = () => {
        setTasks(prevTasks => prevTasks.filter(task => !selectedTaskIds.has(task.id)));
        setSelectedTaskIds(new Set());
    };

    const handleStartAnalysis = (textContent: string, files: File[]) => {
        const isConsented = localStorage.getItem('mindvault_consent') === 'true';
        if (!isConsented) {
            setPendingContent({ textContent, files });
            setShowConsentModal(true);
        } else {
            localProcessing(textContent, files);
        }
    };
    
    const localProcessing = useCallback(async (textContent: string, files: File[]) => {
        const newQueue: ProcessingQueueItem[] = [];
        if (textContent.trim()) {
            newQueue.push({
                id: `text-${Date.now()}`,
                name: 'Pasted Text',
                status: 'Queued',
                source: 'text',
                textContent: textContent,
            });
        }
        files.forEach(file => {
            newQueue.push({
                id: `${file.name}-${file.lastModified}`,
                name: file.name,
                status: 'Queued',
                source: file,
            });
        });
        
        if (newQueue.length === 0) return;

        handleNewSession();
        setProcessingQueue(newQueue);
        setIsProcessing(true);
        processingControl.current.isCancelled = false;

    }, []);

    useEffect(() => {
        if (!isProcessing) return;

        const processItem = async (item: ProcessingQueueItem) => {
            try {
                // Get content
                setProcessingQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Reading' } : p));
                const content = item.source === 'text' ? item.textContent! : await readFileAsText(item.source);
                
                // Summarize
                setProcessingQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Summarizing' } : p));
                const conversationSummary = await summarizeConversation(content);
                setSummary(prev => mergeSummaries(prev, conversationSummary));

                // Extract Ideas
                setProcessingQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Extracting Ideas' } : p));
                const rawIdeas: RawIdea[] = await extractIdeas(conversationSummary, content);
                
                // FIX: Completed the logic for processing ideas and tasks which was previously missing.
                if (rawIdeas.length > 0) {
                    const newIdeas: Idea[] = rawIdeas.map((rawIdea) => {
                        const metrics = {
                            rReachScore: rawIdea.r_reach_score,
                            uUrgencyScore: rawIdea.u_urgency_score,
                            mMoatScore: rawIdea.m_moat_score,
                            eEffortScore: rawIdea.e_effort_score,
                            day1RevenueTarget: rawIdea.day_1_revenue_target,
                        };
                        return {
                            id: `local-${rawIdea.title.replace(/\s+/g, '-')}-${Math.random().toString(36).substr(2, 5)}`,
                            title: rawIdea.title,
                            summary: rawIdea.summary,
                            tags: rawIdea.tags,
                            day1RevenueTarget: rawIdea.day_1_revenue_target,
                            initialSetupTimeHours: rawIdea.initial_setup_time_hours,
                            confidence: rawIdea.confidence,
                            marketAnalysis: {
                                targetAudience: rawIdea.market_analysis.target_audience,
                                competitors: rawIdea.market_analysis.competitors,
                                uniqueSellingProposition: rawIdea.market_analysis.unique_selling_proposition,
                            },
                            ...metrics,
                            opportunityScore: calculateOpportunityScore(metrics),
                        };
                    });
                    setIdeas(prev => [...prev, ...newIdeas]);
                    
                    setProcessingQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Creating Tasks' } : p));
                    const rawTasks = await createTasks(newIdeas);
                    if (rawTasks.length > 0) {
                        const newTasks: Task[] = rawTasks.map((rawTask, index) => {
                            const parentIdea = newIdeas.find(i => i.id === rawTask.idea_id_link);
                            return {
                                id: rawTask.task_id || `task-local-${Date.now()}-${index}`,
                                ideaIdLink: parentIdea?.id || 'unlinked',
                                relatedIdeaTitle: parentIdea?.title || 'Unknown Idea',
                                title: rawTask.title,
                                steps: rawTask.steps,
                                priority: rawTask.priority,
                                prerequisites: rawTask.prerequisites ?? [],
                                owner: rawTask.owner ?? 'Founder',
                                completed: false,
                                order: (tasks.length || 0) + index,
                            };
                        });
                        setTasks(prev => [...prev, ...newTasks]);
                    }
                }
                setProcessingQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Done' } : p));
            } catch (err: any) {
                 console.error(`Error processing item ${item.name}:`, err);
                 setProcessingQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'Error', error: err.message } : p));
            }
        };

        const runQueue = async () => {
            for (const item of processingQueue) {
                if (processingControl.current.isCancelled) {
                    setIsProcessing(false);
                    setProcessingQueue([]);
                    break;
                }

                while (isPaused) {
                     if (processingControl.current.isCancelled) break;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                if (item.status === 'Queued') {
                    await processItem(item);
                }
            }
            if (!processingControl.current.isCancelled) {
                setIsProcessing(false);
            }
        };

        runQueue();
    }, [isProcessing, isPaused, localProcessing, tasks.length]);

    const handleDeepDive = async (idea: Idea) => {
        setDeepDiveIdea(idea);
        setIsDeepDiving(true);
        setDeepDiveResult('');
        try {
            const result = await deepDiveOnIdea(idea);
            setDeepDiveResult(result);
        } catch (e: any) {
            setError(`Deep dive failed: ${e.message}`);
        } finally {
            setIsDeepDiving(false);
        }
    };
    
    // --- EXPORT HANDLERS ---
    const handleDownloadHtml = useCallback(() => {
        if (reportExportRef.current) {
            const htmlContent = reportExportRef.current.innerHTML;
            const fullHtml = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>MindVault Report</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'brand-bg': '#111827',
                  'brand-surface': '#1F2937',
                  'brand-primary': '#4F46E5',
                  'brand-secondary': '#10B981',
                  'brand-text': '#E5E7EB',
                  'brand-text-muted': '#9CA3AF',
                }
              }
            }
          }
        </script>
    </head>
    <body class="bg-brand-bg text-brand-text p-8">${htmlContent}</body>
    </html>`;
            const blob = new Blob([fullHtml], { type: 'text/html' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'mindvault-report.html';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }, [summary, ideas, tasks]);

    const handleDownloadPdf = useCallback(() => {
        if (reportExportRef.current) {
            const { jsPDF } = jspdf;
            const reportElement = reportExportRef.current;
            
            html2canvas(reportElement, {
                scale: 2,
                backgroundColor: '#111827',
                useCORS: true,
                windowWidth: reportElement.scrollWidth,
                windowHeight: reportElement.scrollHeight
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'pt', 'a4');
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                let heightLeft = pdfHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();

                while (heightLeft > 0) {
                    position = position - pdf.internal.pageSize.getHeight();
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                    heightLeft -= pdf.internal.pageSize.getHeight();
                }
                pdf.save('mindvault-report.pdf');
            });
        }
    }, [summary, ideas, tasks]);

    const generateDocxBlob = (summaryData: ConversationSummary, ideasData: Idea[], tasksData: Task[]): Promise<Blob> => {
        const docxLib = (window as any).docx;
        if (!docxLib) {
          return Promise.reject(new Error("DOCX export library failed to load. Please try again."));
        }
        const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, PageBreak } = docxLib;

        const children = [];

        children.push(new Paragraph({ text: "MindVault Report", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 300 } }));
        
        children.push(new Paragraph({ text: "60-Second Recap", heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
        children.push(new Paragraph({ text: "Rundown", heading: HeadingLevel.HEADING_2 }));
        summaryData.rundown.forEach(item => children.push(new Paragraph({ text: item, bullet: { level: 0 } })));
        
        children.push(new Paragraph({ text: "Artifacts", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }));
        if (summaryData.artifacts.ideas.length > 0) {
            children.push(new Paragraph({ text: "Ideas:", heading: HeadingLevel.HEADING_3 }));
            summaryData.artifacts.ideas.forEach(item => children.push(new Paragraph({ text: item, bullet: { level: 1 } })));
        }
        if (summaryData.artifacts.tasks.length > 0) {
            children.push(new Paragraph({ text: "Tasks:", heading: HeadingLevel.HEADING_3, spacing: { before: 100 } }));
            summaryData.artifacts.tasks.forEach(item => children.push(new Paragraph({ text: item, bullet: { level: 1 } })));
        }
        if (summaryData.artifacts.decisions.length > 0) {
            children.push(new Paragraph({ text: "Decisions:", heading: HeadingLevel.HEADING_3, spacing: { before: 100 } }));
            summaryData.artifacts.decisions.forEach(item => children.push(new Paragraph({ text: item, bullet: { level: 1 } })));
        }
        
        children.push(new Paragraph({ text: "Follow-ups", heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }));
        summaryData.followups.forEach(item => children.push(new Paragraph({ text: item, bullet: { level: 0 } })));

        children.push(new Paragraph({ children: [new PageBreak()] }));

        children.push(new Paragraph({ text: "Ideas Extracted", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
        ideasData.forEach(idea => {
            children.push(new Paragraph({ text: idea.title, heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }));
            children.push(new Paragraph({ children: [new TextRun({ text: idea.summary, italics: true })], spacing: { after: 100 } }));
            children.push(new Paragraph({ text: `Opportunity Score: ${idea.opportunityScore}`, style: "strong" }));
            children.push(new Paragraph({ text: `Day 1 Revenue Target: $${idea.day1RevenueTarget}` }));
            children.push(new Paragraph({ text: `Setup Time: ${idea.initialSetupTimeHours} hours` }));
            children.push(new Paragraph({ text: `Confidence: ${(idea.confidence * 100).toFixed(0)}%`, spacing: { after: 200 } }));
        });

        children.push(new Paragraph({ children: [new PageBreak()] }));

        children.push(new Paragraph({ text: "Tasks Generated", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }));
        tasksData.forEach(task => {
            children.push(new Paragraph({ text: `[${task.priority}] ${task.title}`, heading: HeadingLevel.HEADING_3, spacing: { after: 50 } }));
            children.push(new Paragraph({ children: [new TextRun({ text: "Idea: ", bold: true }), new TextRun(task.relatedIdeaTitle)] }));
            children.push(new Paragraph({ children: [new TextRun({ text: "Steps: ", bold: true }), new TextRun(task.steps.join(', '))] }));
            if (task.prerequisites.length > 0) {
                children.push(new Paragraph({ children: [new TextRun({ text: "Prerequisites: ", bold: true }), new TextRun(task.prerequisites.join(', '))] }));
            }
            children.push(new Paragraph({ children: [new TextRun({ text: "Owner: ", bold: true }), new TextRun(task.owner)], spacing: { after: 200 } }));
        });
        
        const doc = new Document({
            styles: {
                paragraphStyles: [{ id: "strong", name: "Strong", basedOn: "Normal", next: "Normal", run: { bold: true } }],
            },
            sections: [{ children }]
        });

        return Packer.toBlob(doc);
    };

    const handleDownloadDocx = useCallback(async () => {
        if (!summary) return;
        try {
            const blob = await generateDocxBlob(summary, ideas, tasks);
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'mindvault-report.docx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            setError(err.message);
        }
    }, [summary, ideas, tasks]);

    const showResults = summary || ideas.length > 0 || tasks.length > 0 || isProcessing;

    return (
        <div className="flex h-screen bg-brand-bg text-brand-text font-sans">
            <div className="w-72 bg-brand-surface flex flex-col p-4 border-r border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                    <SparklesIcon />
                    <h1 className="text-2xl font-bold">MindVault</h1>
                </div>

                <button
                    onClick={handleNewSession}
                    className="w-full bg-brand-secondary text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 mb-6 shadow-md"
                >
                    <PlusIcon /> New Session
                </button>
                
                <h2 className="text-sm font-semibold text-brand-text-muted mb-2 px-2 flex items-center gap-2"><HistoryIcon /> History</h2>
                {isLoadingHistory ? <div className="text-center p-4"><LoaderIcon /></div> : (
                    <ul className="space-y-1 overflow-y-auto flex-1 -mr-2 pr-2">
                        {conversations.map(c => (
                            <li key={c.id}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleSelectConversation(c.id); }}
                                    className={`block p-2 rounded-md text-sm truncate relative group ${selectedConversationId === c.id ? 'bg-brand-primary/20 text-brand-text font-semibold' : 'text-brand-text-muted hover:bg-white/5'}`}
                                    title={c.title}
                                >
                                    {c.title}
                                    <button onClick={(e) => {e.stopPropagation(); e.preventDefault(); handleDeleteConversation(c.id)}} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-500 hover:bg-red-500/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon />
                                    </button>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-auto relative">
                    <button 
                        onClick={() => setShowAccountMenu(!showAccountMenu)}
                        className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/5"
                    >
                        <SettingsIcon />
                        <span className="font-semibold text-sm">Settings & Account</span>
                    </button>
                    {showAccountMenu && (
                         <div className="absolute bottom-full mb-2 w-full bg-brand-surface border border-gray-600 rounded-md shadow-lg z-10 p-2">
                             <button onClick={handleDeleteAllData} className="w-full text-left text-sm text-red-400 hover:bg-red-500/10 p-2 rounded-md flex items-center gap-2">
                                 <TrashIcon /> Delete All Data
                             </button>
                         </div>
                    )}
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-8 relative">
                {error && <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-md animate-fade-in-up flex items-center gap-2">
                    {error} 
                    <button onClick={() => setError('')}><CloseIcon/></button>
                </div>}
                
                {isLoadingConversation ? (
                    <div className="h-full flex items-center justify-center">
                        <LoaderIcon />
                    </div>
                ) : showResults ? (
                    <ResultsView 
                        summary={summary}
                        ideas={ideas}
                        tasks={tasks}
                        filteredAndSortedIdeas={filteredAndSortedIdeas}
                        speedToRevenueCandidates={speedToRevenueCandidates}
                        tasksByIdea={tasksByIdea}
                        onDownloadPdf={handleDownloadPdf}
                        onDownloadDocx={handleDownloadDocx}
                        onDownloadHtml={handleDownloadHtml}
                        onDeepDive={handleDeepDive}
                        onScaffold={setScaffoldingIdea}
                        onToggleTaskCompletion={handleToggleTaskCompletion}
                        onTaskUpdate={handleTaskUpdate}
                        handleDragStart={handleDragStart}
                        handleDragOver={handleDragOver}
                        handleDrop={handleDrop}
                        handleSelectTask={handleSelectTask}
                        handleSelectAllForIdea={handleSelectAllForIdea}
                        selectedTaskIds={selectedTaskIds}
                        editingTaskId={editingTaskId}
                        setEditingTaskId={setEditingTaskId}
                        sortField={sortField}
                        setSortField={setSortField}
                        sortDirection={sortDirection}
                        setSortDirection={setSortDirection}
                        filters={filters}
                        handleFilterChange={handleFilterChange}
                    />
                ) : (
                    <UploadView onProcess={handleStartAnalysis} isLoading={isProcessing} />
                )}
                
                <div className="absolute -left-[9999px] top-0" aria-hidden="true">
                    <div ref={reportExportRef} className="bg-brand-bg text-brand-text p-8" style={{ width: '800px' }}>
                        {summary && <ReportForExport summary={summary} ideas={ideas} tasks={tasks} />}
                    </div>
                </div>

                {isProcessing && (
                    <ProcessingStatus 
                        queue={processingQueue}
                        isPaused={isPaused}
                        onPause={() => setIsPaused(true)}
                        onResume={() => setIsPaused(false)}
                        onCancel={() => {
                            processingControl.current.isCancelled = true;
                            setIsProcessing(false);
                            setProcessingQueue([]);
                        }}
                    />
                )}
                 {scaffoldingIdea && <ScaffoldModal idea={scaffoldingIdea} onClose={() => setScaffoldingIdea(null)} />}
                 {showConsentModal && pendingContent && (
                    <ConsentModal 
                        onImportAndIndex={async () => {
                           if (!pendingContent) return;
                            setShowConsentModal(false);
                            setIsProcessing(true);
                            try {
                                let content = pendingContent.textContent;
                                let title = "Pasted Content";

                                if (pendingContent.files.length > 0) {
                                    // For now, process first file. A real implementation might merge or queue them.
                                    content = await readFileAsText(pendingContent.files[0]);
                                    title = pendingContent.files[0].name;
                                }

                                if (!content) throw new Error("No content to process.");
                                
                                const result = await processAndSaveConversation(content, title);
                                setSummary(result.summary);
                                setIdeas(result.ideas);
                                setTasks(result.tasks);
                                setSpeedToRevenueCandidates(getSpeedToRevenueCandidates(result.ideas));
                                await fetchConversations();
                                setSelectedConversationId(result.conversationId);

                            } catch (e: any) {
                                setError(e.message);
                            } finally {
                                setPendingContent(null);
                                setIsProcessing(false);
                            }
                        }}
                        onImportLocal={() => {
                            localStorage.setItem('mindvault_consent', 'true');
                            setShowConsentModal(false);
                            if (pendingContent) {
                                localProcessing(pendingContent.textContent, pendingContent.files);
                            }
                        }}
                        onCancel={() => {
                            setShowConsentModal(false);
                            setPendingContent(null);
                        }}
                    />
                 )}
                  {deepDiveIdea && (
                    <div className="fixed inset-0 bg-black/75 z-40 flex items-center justify-center p-4">
                        <div className="bg-brand-surface p-6 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                                 <h3 className="text-xl font-bold text-brand-secondary">Deep Dive: {deepDiveIdea.title}</h3>
                                 <button onClick={() => setDeepDiveIdea(null)}><CloseIcon /></button>
                            </div>
                            <div className="overflow-y-auto prose prose-invert prose-sm max-w-none">
                                {isDeepDiving ? <div className="flex justify-center p-8"><LoaderIcon /></div> : <pre className="whitespace-pre-wrap font-sans">{deepDiveResult}</pre>}
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <Chatbot sessionId={sessionId} />
        </div>
    );
};

// FIX: Added default export for the Dashboard component to resolve the import error in App.tsx.
export default Dashboard;