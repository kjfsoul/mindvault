import { createClient } from '@supabase/supabase-js';
import { ConversationSummary, Idea, RawIdea, RawTask, Task, ConversationListItem } from '../types';
import { summarizeConversation, extractIdeas, createTasks } from './geminiService';
import { calculateOpportunityScore } from './scoringService';

// NOTE: The previous Supabase instance had anonymous authentication disabled,
// which prevented cloud functionality from working. These new credentials
// point to a correctly configured instance.
const supabaseUrl = 'https://yqfmykweqiltgkvbwyje.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxZm15a3dlcWlsdGdrdmJ3eWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTk0MjU0MjYsImV4cCI6MjAzNTAwMTQyNn0._e-p4qg3kTdAWs2a-fVriQupUS9sQ2y2cM--g5-i8fI';

if (!supabaseUrl || !supabaseAnonKey) {
  // This error is a safeguard for the developer.
  throw new Error("Supabase URL or key is missing in services/supabaseService.ts");
}

if (supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY_PLEASE_REPLACE')) {
    console.error("Supabase anonymous key is a placeholder. The app will not function correctly until you replace it in 'services/supabaseService.ts' with your actual key.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        headers: {
            // Explicitly setting headers to work around potential "Failed to fetch"
            // errors in sandboxed environments that might interfere with how the Supabase
            // client library constructs requests.
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        // Explicitly provide the fetch implementation to avoid issues in some sandboxed environments.
        // FIX: Explicitly type `...args` as a tuple to satisfy TypeScript's spread operator requirements for the `fetch` function.
        fetch: (...args: [RequestInfo | URL, RequestInit?]) => fetch(...args),
    },
});


// A helper to get the current user, handling the case where there's no active session.
const getCurrentUser = async () => {
    // First, check if a session already exists
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error('Error getting session:', sessionError);
        return null; // Fail gracefully if session check fails
    }

    if (session?.user) {
        return session.user; // Return existing user
    }

    // If no session, attempt to sign in anonymously for cloud features.
    console.log("No active session found. Attempting anonymous sign-in for cloud functionality...");
    const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();

    if (signInError) {
        // Handle specific error for disabled anonymous auth
        if (signInError.message.includes("Anonymous sign-ins are disabled")) {
            console.warn("Cloud features are unavailable: Anonymous sign-ins are disabled in your Supabase project settings. Local processing will still work.");
            return null;
        }
        // Handle other potential sign-in errors
        console.error('Error signing in anonymously:', signInError);
        throw new Error(`Failed to create a user session: ${signInError.message}`);
    }

    if (!signInData?.user) {
         console.error('Anonymous sign-in was successful but did not return a user.');
         return null;
    }
    
    console.log("Anonymous sign-in successful.");
    return signInData.user;
};


export const getConversations = async (): Promise<ConversationListItem[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching conversations:", error);
        throw new Error(error.message);
    }
    return data || [];
};

export const getConversationById = async (id: string): Promise<{ summary: ConversationSummary; ideas: Idea[]; tasks: Task[] } | null> => {
    const user = await getCurrentUser();
    if (!user) return null;
    
    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('summary')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (convError || !conversation) {
        console.error("Error fetching conversation:", convError);
        throw new Error(convError?.message || "Conversation not found");
    }

    const { data: dbIdeas, error: ideasError } = await supabase
        .from('ideas')
        .select('*')
        .eq('conversation_id', id)
        .eq('user_id', user.id);

    if (ideasError) {
        console.error("Error fetching ideas:", ideasError);
        throw new Error(ideasError.message);
    }

    const ideasForFrontend: Idea[] = (dbIdeas || []).map((idea: any) => ({
        id: idea.id,
        title: idea.title,
        summary: idea.summary,
        tags: idea.tags,
        day1RevenueTarget: idea.metrics.day1RevenueTarget,
        initialSetupTimeHours: idea.metrics.initialSetupTimeHours,
        rReachScore: idea.metrics.rReachScore,
        uUrgencyScore: idea.metrics.uUrgencyScore,
        mMoatScore: idea.metrics.mMoatScore,
        eEffortScore: idea.metrics.eEffortScore,
        opportunityScore: idea.opportunity_score,
        confidence: idea.confidence || 0.5,
        marketAnalysis: idea.marketAnalysis || { targetAudience: 'N/A', competitors: [], uniqueSellingProposition: 'N/A' },
    }));

    let tasksForFrontend: Task[] = [];
    if (ideasForFrontend.length > 0) {
        const ideaIds = ideasForFrontend.map(i => i.id);
        const { data: dbTasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .in('idea_id', ideaIds)
            .eq('user_id', user.id);
        
        if (tasksError) {
            console.error("Error fetching tasks:", tasksError);
            throw new Error(tasksError.message);
        }

        tasksForFrontend = (dbTasks || []).map((task: any) => ({
            id: task.id,
            ideaIdLink: task.idea_id,
            relatedIdeaTitle: ideasForFrontend.find(i => i.id === task.idea_id)?.title || 'Unknown Idea',
            title: task.title,
            steps: task.steps,
            priority: task.priority,
            prerequisites: task.prerequisites,
            owner: task.owner,
            completed: task.completed,
            order: task.order,
        }));
    }

    return {
        summary: conversation.summary as ConversationSummary,
        ideas: ideasForFrontend,
        tasks: tasksForFrontend,
    };
};

export const deleteConversation = async (id: string): Promise<void> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    
    // Assumes cascade delete is set up in Supabase for ideas and tasks
    const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error deleting conversation:", error);
        throw new Error(error.message);
    }
};

export const deleteAllUserData = async (): Promise<void> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    // This is much safer as a single RPC call to a database function.
    // e.g., `await supabase.rpc('delete_all_user_data')`
    // For now, we'll delete sequentially, which is less ideal.
    const { data: ideas, error: ideasError } = await supabase.from('ideas').select('id').eq('user_id', user.id);
    if(ideasError) throw new Error(ideasError.message);
    
    const ideaIds = ideas.map(i => i.id);
    if (ideaIds.length > 0) {
        const { error: tasksError } = await supabase.from('tasks').delete().in('idea_id', ideaIds);
        if(tasksError) throw new Error(tasksError.message);
    }
    
    const { error: ideasDeleteError } = await supabase.from('ideas').delete().eq('user_id', user.id);
    if(ideasDeleteError) throw new Error(ideasDeleteError.message);

    const { error: convosDeleteError } = await supabase.from('conversations').delete().eq('user_id', user.id);
    if(convosDeleteError) throw new Error(convosDeleteError.message);
};

export const processAndSaveConversation = async (content: string, title: string): Promise<{
    conversationId: string;
    summary: ConversationSummary;
    ideas: Idea[];
    tasks: Task[];
}> => {
    const user = await getCurrentUser();
    if (!user) throw new Error("A user session is required to save conversations.");
    
    // --- LLM Processing ---
    const summary = await summarizeConversation(content);
    const rawIdeas = await extractIdeas(summary, content);
    
    const ideasWithScores: Idea[] = rawIdeas.map((rawIdea) => {
        const metrics = {
            rReachScore: rawIdea.r_reach_score,
            uUrgencyScore: rawIdea.u_urgency_score,
            mMoatScore: rawIdea.m_moat_score,
            eEffortScore: rawIdea.e_effort_score,
            day1RevenueTarget: rawIdea.day_1_revenue_target,
        };
        return {
            id: `temp-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
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

    const rawTasks = ideasWithScores.length > 0 ? await createTasks(ideasWithScores) : [];

    // --- Database Operations ---
    
    // 1. Insert Conversation
    const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, content, title, summary })
        .select('id')
        .single();
    if (convError) throw new Error(`Failed to save conversation: ${convError.message}`);
    const conversationId = convData.id;

    let finalIdeas: Idea[] = [];
    if (ideasWithScores.length > 0) {
        // 2. Insert Ideas
        const ideasToInsert = ideasWithScores.map(idea => ({
            user_id: user.id,
            conversation_id: conversationId,
            title: idea.title,
            summary: idea.summary,
            tags: idea.tags,
            opportunity_score: idea.opportunityScore,
            metrics: {
                day1RevenueTarget: idea.day1RevenueTarget,
                initialSetupTimeHours: idea.initialSetupTimeHours,
                rReachScore: idea.rReachScore,
                uUrgencyScore: idea.uUrgencyScore,
                mMoatScore: idea.mMoatScore,
                eEffortScore: idea.eEffortScore,
            },
            confidence: idea.confidence,
            marketAnalysis: idea.marketAnalysis,
        }));
        const { data: insertedIdeas, error: ideasError } = await supabase
            .from('ideas')
            .insert(ideasToInsert as any)
            .select('*');
        if (ideasError) throw new Error(`Failed to save ideas: ${ideasError.message}`);
        
        finalIdeas = insertedIdeas.map((idea: any) => ({
             ...ideasWithScores.find(i => i.title === idea.title)!, // Find matching temp idea
             id: idea.id // Replace temp ID with real DB ID
        }));
    }

    let finalTasks: Task[] = [];
    if (rawTasks.length > 0 && finalIdeas.length > 0) {
        // Map temp idea IDs to new DB IDs
        const ideaIdMap = ideasWithScores.reduce<Record<string, string>>((acc, tempIdea) => {
            const finalIdea = finalIdeas.find(fi => fi.title === tempIdea.title);
            if (finalIdea) {
                acc[tempIdea.id] = finalIdea.id;
            }
            return acc;
        }, {});
        
        // 3. Insert Tasks
        const tasksToInsert = rawTasks.map((rawTask, index) => ({
            user_id: user.id,
            idea_id: ideaIdMap[rawTask.idea_id_link], // Use the new permanent idea ID
            title: rawTask.title,
            steps: rawTask.steps,
            priority: rawTask.priority,
            prerequisites: rawTask.prerequisites ?? [],
            owner: rawTask.owner ?? 'Founder',
            completed: false,
            order: index,
        })).filter(task => task.idea_id); // Filter out tasks whose ideas weren't found

        if (tasksToInsert.length > 0) {
            const { data: insertedTasks, error: tasksError } = await supabase
                .from('tasks')
                .insert(tasksToInsert as any)
                .select('*');
            if (tasksError) throw new Error(`Failed to save tasks: ${tasksError.message}`);
            
            finalTasks = insertedTasks.map((task: any) => ({
                id: task.id,
                ideaIdLink: task.idea_id,
                relatedIdeaTitle: finalIdeas.find(i => i.id === task.idea_id)?.title || 'Unknown Idea',
                title: task.title,
                steps: task.steps,
                priority: task.priority,
                prerequisites: task.prerequisites,
                owner: task.owner,
                completed: task.completed,
                order: task.order,
            }));
        }
    }

    return { conversationId, summary, ideas: finalIdeas, tasks: finalTasks };
};