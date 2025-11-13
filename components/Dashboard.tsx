import React, { useState, useCallback, useRef } from 'react';
import { summarizeConversation, extractIdeas, createTasks } from '../services/geminiService';
import { calculateOpportunityScore } from '../services/scoringService';
import { ConversationSummary, Idea, Task, RawIdea, RawTask, IdeaUpdatePayload } from '../types';
import { UploadIcon } from './icons/UploadIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import { ScaffoldIcon } from './icons/ScaffoldIcon';
import { ScaffoldModal } from './ScaffoldModal';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

// Declare libraries loaded from CDN
declare const jspdf: any;
declare const html2canvas: any;
declare const docx: any;

// New component for rendering a styled, non-interactive Idea card for exports.
const PrintableIdeaCard: React.FC<{ idea: Idea }> = ({ idea }) => (
    <div className="bg-brand-surface p-4 rounded-lg border border-gray-700 mb-4 break-inside-avoid">
        <div className="flex justify-between items-start">
            <div>
                <h4 className="font-bold text-lg text-brand-text">{idea.title}</h4>
                <p className="text-sm text-brand-text-muted italic mt-1">{idea.summary}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                    {idea.tags.map(tag => <span key={tag} className="text-xs bg-indigo-500/30 text-indigo-300 px-2 py-1 rounded-full">{tag}</span>)}
                </div>
            </div>
            <div className="text-center ml-4 flex-shrink-0">
                <div className="text-3xl font-bold text-brand-secondary">{idea.opportunityScore}</div>
                <div className="text-xs text-brand-text-muted">Opportunity</div>
            </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-700/50 text-sm text-brand-text-muted">
            <strong>Metrics:</strong> Reach: {idea.reach}, Urgency: {idea.urgency}, Market Size: {idea.marketSize}, Effort: {idea.effort}
        </div>
    </div>
);

// New component for rendering a styled Task item for exports.
const PrintableTaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const priorityClasses: { [key in Task['priority']]: string } = {
        High: 'text-red-400 font-bold',
        Medium: 'text-amber-400 font-bold',
        Low: 'text-green-400 font-bold',
    };
    return (
        <li className="py-2 border-b border-gray-700/50">
            <span className={priorityClasses[task.priority]}>[{task.priority}]</span>
            <span className="text-brand-text ml-2">{task.title}</span>
            <span className="text-xs text-brand-text-muted ml-2 italic">(Idea: {task.relatedIdeaTitle})</span>
        </li>
    );
};


// A dedicated component for rendering the full report for export.
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
                    <p>{summary.rundown}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-brand-text text-lg">Artifacts</h3>
                    <p>{summary.artifacts}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-brand-text text-lg">Follow-ups</h3>
                    <p>{summary.followUps}</p>
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


const Dashboard: React.FC = () => {
    const [fileContent, setFileContent] = useState<string>('');
    const [fileName, setFileName] = useState<string>('');
    const [summary, setSummary] = useState<ConversationSummary | null>(null);
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'ideas' | 'tasks'>('ideas');
    const [scaffoldingIdea, setScaffoldingIdea] = useState<Idea | null>(null);
    const [showDownloadOptions, setShowDownloadOptions] = useState<boolean>(false);

    const reportExportRef = useRef<HTMLDivElement>(null);


    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setError('');
        setIsProcessingComplete(false);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (!result) {
                    throw new Error("File could not be read.");
                }
                // Handle XLSX files by converting them to text for processing
                if (file.name.endsWith('.xlsx')) {
                    const XLSX = (window as any).XLSX;
                    const data = new Uint8Array(result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    if (!firstSheetName) {
                        throw new Error("The XLSX file contains no sheets.");
                    }
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData: unknown[] = XLSX.utils.sheet_to_json(worksheet);

                    if (jsonData.length === 0) {
                        throw new Error("The sheet contains no data rows.");
                    }
                    
                    const textContent = jsonData.map((row: any) => {
                        return Object.entries(row)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join('\n');
                    }).join('\n\n---\n\n');

                    setFileContent(textContent);
                } else {
                    setFileContent(result as string);
                }
            } catch (err: any) {
                setError(`Failed to parse file: ${err.message}`);
                setFileContent('');
                setFileName('');
            }
        };

        reader.onerror = () => {
             setError(`Failed to read file: ${reader.error?.message}`);
             setFileContent('');
             setFileName('');
        }

        if (file.name.endsWith('.xlsx')) {
            reader.readAsArrayBuffer(file);
        } else {
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
        setIsProcessingComplete(false);

        try {
            const conversationSummary = await summarizeConversation(fileContent);
            setSummary(conversationSummary);

            const rawIdeas: RawIdea[] = await extractIdeas(conversationSummary);
            const initialIdeas: Idea[] = rawIdeas.map((rawIdea) => {
                const ideaMetrics = {
                    reach: rawIdea.reach,
                    urgency: rawIdea.urgency,
                    marketSize: rawIdea.marketSize,
                    effort: rawIdea.effort,
                };
                return {
                    ...rawIdea,
                    id: `idea-${Math.random().toString(36).substr(2, 9)}`,
                    opportunityScore: calculateOpportunityScore(ideaMetrics),
                };
            });
            initialIdeas.sort((a,b) => b.opportunityScore - a.opportunityScore);
            setIdeas(initialIdeas);

            if(rawIdeas.length > 0) {
                const rawTasks: RawTask[] = await createTasks(rawIdeas);
                const processedTasks: Task[] = rawTasks.map((rawTask) => ({
                    ...rawTask,
                    id: `task-${Math.random().toString(36).substr(2, 9)}`,
                }));
                setTasks(processedTasks);
            }
            
            setIsProcessingComplete(true);
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

    const getReportFileName = (extension: string) => `MindVault_Report_${fileName.replace(/\.[^/.]+$/, "")}.${extension}`;

    const saveBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPdf = async () => {
        if (!reportExportRef.current) return;
        setShowDownloadOptions(false);
        const canvas = await html2canvas(reportExportRef.current, { 
            scale: 2,
            backgroundColor: '#111827'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({
            orientation: 'p',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(getReportFileName('pdf'));
    };

    const handleDownloadDocx = async () => {
        if (!summary) return;
        setShowDownloadOptions(false);

        const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } = docx;
        
        const PRIORITY_COLORS = {
            High: "F87171",
            Medium: "FBBF24",
            Low: "34D399",
        };

        const doc = new Document({
            styles: {
                paragraphStyles: [
                    { id: "h1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 48, bold: true, color: "E5E7EB" } },
                    { id: "h2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, color: "10B981" } },
                    { id: "h3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, color: "E5E7EB" } },
                    { id: "p", name: "Paragraph", basedOn: "Normal", run: { color: "9CA3AF" } },
                ],
            },
            sections: [{
                children: [
                    new Paragraph({ text: "MindVault Report", style: "h1", alignment: AlignmentType.CENTER }),
                    new Paragraph(" "),
                    new Paragraph({ text: "Summary", style: "h2" }),
                    new Paragraph({ text: "Rundown", style: "h3" }),
                    new Paragraph({ text: summary.rundown, style: "p" }),
                    new Paragraph({ text: "Artifacts", style: "h3" }),
                    new Paragraph({ text: summary.artifacts, style: "p" }),
                    new Paragraph({ text: "Follow-ups", style: "h3" }),
                    new Paragraph({ text: summary.followUps, style: "p" }),
                    new Paragraph(" "),
                    new Paragraph({ text: "Ideas Extracted", style: "h2" }),
                    ...ideas.flatMap(idea => [
                        new Paragraph({ text: `${idea.title} (Score: ${idea.opportunityScore})`, style: "h3" }),
                        new Paragraph({ children: [new TextRun({ text: idea.summary, italics: true, color: "9CA3AF" })] }),
                        new Paragraph({ children: [
                            new TextRun({ text: "Metrics: ", bold: true, color: "E5E7EB" }),
                            new TextRun({ text: `Reach: ${idea.reach}, Urgency: ${idea.urgency}, Market Size: ${idea.marketSize}, Effort: ${idea.effort}`, color: "9CA3AF" }),
                        ]}),
                        new Paragraph({ children: [
                            new TextRun({ text: "Tags: ", bold: true, color: "E5E7EB" }),
                            new TextRun({ text: idea.tags.join(', '), color: "9CA3AF" }),
                        ]}),
                        new Paragraph(" "),
                    ]),
                    new Paragraph({ text: "Tasks Generated", style: "h2" }),
                    ...tasks.map(task => 
                        new Paragraph({
                            bullet: { level: 0 },
                            children: [
                                new TextRun({ text: `[${task.priority}] `, bold: true, color: PRIORITY_COLORS[task.priority] }),
                                new TextRun({ text: task.title, color: "E5E7EB" }),
                                new TextRun({ text: ` (Idea: ${task.relatedIdeaTitle})`, italics: true, color: "9CA3AF" }),
                            ]
                        })
                    ),
                ],
            }],
        });

        const blob = await Packer.toBlob(doc);
        saveBlob(blob, getReportFileName('docx'));
    };

    const handleDownloadHtml = () => {
        if (!summary) return;
        setShowDownloadOptions(false);
        const styles = `
            <style>
                body { font-family: sans-serif; background-color: #111827; color: #E5E7EB; padding: 2rem; }
                .container { max-width: 1024px; margin: 0 auto; }
                h1 { font-size: 2.25rem; font-weight: bold; color: #E5E7EB; border-bottom: 1px solid #4B5563; padding-bottom: 1rem; margin-bottom: 1.5rem; }
                h2 { font-size: 1.5rem; font-weight: bold; color: #10B981; margin-top: 2rem; margin-bottom: 1rem; }
                h3 { font-size: 1.25rem; font-weight: bold; color: #E5E7EB; margin-top: 1rem; margin-bottom: 0.5rem; }
                p { line-height: 1.6; color: #9CA3AF; }
                .card { background-color: #1F2937; border: 1px solid #374151; border-radius: 0.5rem; padding: 1.5rem; margin-bottom: 1rem; }
                .tag { display: inline-block; background-color: #4F46E533; color: #A5B4FC; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; margin-right: 0.5rem; }
                .priority-High { color: #F87171; }
                .priority-Medium { color: #FBBF24; }
                .priority-Low { color: #34D399; }
                ul { list-style-position: inside; padding-left: 0; }
            </style>
        `;
        const ideasHtml = ideas.map(idea => `
            <div class="card">
                <h3>${idea.title} (Score: ${idea.opportunityScore})</h3>
                <p><em>${idea.summary}</em></p>
                <p><strong>Metrics:</strong> Reach: ${idea.reach}, Urgency: ${idea.urgency}, Market Size: ${idea.marketSize}, Effort: ${idea.effort}</p>
                <div>${idea.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            </div>
        `).join('');

        const tasksHtml = `<ul>${tasks.map(task => `
            <li><strong class="priority-${task.priority}">[${task.priority}]</strong> ${task.title} <em>(Idea: ${task.relatedIdeaTitle})</em></li>
        `).join('')}</ul>`;

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>MindVault Report: ${fileName}</title>
                ${styles}
            </head>
            <body>
                <div class="container">
                    <h1>MindVault Report</h1>
                    <div class="card">
                        <h2>Summary</h2>
                        <h3>Rundown</h3><p>${summary.rundown}</p>
                        <h3>Artifacts</h3><p>${summary.artifacts}</p>
                        <h3>Follow-ups</h3><p>${summary.followUps}</p>
                    </div>
                    <h2>Ideas</h2>
                    ${ideasHtml}
                    <h2>Tasks</h2>
                    <div class="card">
                        ${tasksHtml}
                    </div>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        saveBlob(blob, getReportFileName('html'));
    };

    const topIdeas = ideas.slice(0, 5);

    return (
        <div className="container mx-auto p-4 md:p-8">
            {/* Element for PDF export rendering (hidden from view) */}
            {summary && (
                 <div className="absolute top-0 left-0" style={{ zIndex: -1, pointerEvents: 'none', opacity: 0 }}>
                    <div ref={reportExportRef} className="p-8 bg-brand-bg" style={{ width: '1200px' }}>
                        <ReportForExport summary={summary} ideas={ideas} tasks={tasks} />
                    </div>
                </div>
            )}

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
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.xlsx" />
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
                <div>
                     {isProcessingComplete && (
                        <div className="flex justify-end mb-4 relative">
                            <button
                                onClick={() => setShowDownloadOptions(prev => !prev)}
                                className="bg-brand-secondary/20 text-brand-secondary font-semibold py-2 px-4 rounded-lg border border-brand-secondary/50 hover:bg-brand-secondary/30 transition-colors flex items-center justify-center gap-2"
                            >
                                <DownloadIcon />
                                <span>Download Report</span>
                                <ChevronDownIcon />
                            </button>
                            {showDownloadOptions && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-brand-surface rounded-lg shadow-lg z-20 border border-gray-700">
                                    <button onClick={handleDownloadPdf} className="w-full text-left px-4 py-2 hover:bg-brand-primary/20 transition-colors">As PDF</button>
                                    <button onClick={handleDownloadDocx} className="w-full text-left px-4 py-2 hover:bg-brand-primary/20 transition-colors">As DOCX</button>
                                    <button onClick={handleDownloadHtml} className="w-full text-left px-4 py-2 hover:bg-brand-primary/20 transition-colors">As HTML</button>
                                </div>
                            )}
                        </div>
                    )}
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
                                        <IdeaCard key={idea.id} idea={idea} onUpdate={handleIdeaUpdate} onScaffold={setScaffoldingIdea} />
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
                </div>
            )}
             {scaffoldingIdea && (
                <ScaffoldModal 
                    idea={scaffoldingIdea} 
                    onClose={() => setScaffoldingIdea(null)} 
                />
            )}
        </div>
    );
};

interface IdeaCardProps {
    idea: Idea;
    onUpdate?: (payload: IdeaUpdatePayload) => void;
    onScaffold?: (idea: Idea) => void;
}

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, onUpdate, onScaffold }) => {
    
    const handleInputChange = (field: 'reach' | 'urgency' | 'marketSize' | 'effort', value: string) => {
        const numValue = parseInt(value, 10);
        if(!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
            onUpdate?.({ id: idea.id, field, value: numValue });
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
            {onScaffold && (
                 <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <button
                        onClick={() => onScaffold(idea)}
                        className="w-full bg-brand-secondary/20 text-brand-secondary font-semibold py-2 px-4 rounded-lg border border-brand-secondary/50 hover:bg-brand-secondary/30 transition-colors flex items-center justify-center gap-2"
                    >
                        <ScaffoldIcon />
                        <span>Scaffold with AppSmithGPT</span>
                    </button>
                </div>
            )}
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