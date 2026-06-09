import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';

    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API Key missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const user_id = user.id;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { isWholeCourse, topics, course_name, amount = 5, difficulty = 3 } = body;

    // Fetch recent mistakes for personalization
    let query = supabaseAdmin
      .from('MistakeLog')
      .select('*, UserTopic!inner(topic_name)')
      .eq('user_id', user_id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!isWholeCourse && topics && topics.length > 0) {
      query = query.in('UserTopic.topic_name', topics);
    }

    const { data: recentMistakes, error: mistakesErr } = await query;
    if (mistakesErr) {
      console.error("Error fetching mistake logs:", mistakesErr);
    }

    const mistakesContext = recentMistakes && recentMistakes.length > 0
        ? `\nFocus on these recent mistakes the user made:\n${recentMistakes.map((m: any) => `- Q: ${m.question}\nCorrect: ${m.correct_answer}\nUser answered: ${m.given_answer}`).join('\n')}`
        : '';

    const rangeText = isWholeCourse ? "the entire syllabus" : `the following specific topics: ${topics?.join(', ')}`;
    const prompt = `Generate exactly ${amount} multiple choice quiz questions covering ${rangeText} within the context of the course "${course_name || 'General'}" at college level. Difficulty out of 5: ${difficulty}.
${mistakesContext}

Provide the output strictly as a JSON array where each object has EXACTLY these keys:
- "Topic": string (the topic name)
- "Difficulty": number (1-5)
- "Cognitive Level": string (e.g. Remember, Understand, Apply, Analyze, Evaluate, Create)
- "Question": string (the actual question text)
- "Options": array of 4 strings
- "Correct Answer": string (must exactly match one of the Options)
- "Explanation": string`;

    console.log(`Requesting quiz from Gemini API for ${course_name}...`);

    // Direct HTTP request to Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errText}`);
    }

    const resJson = await response.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("Empty response from Gemini API");
    }

    const questions = JSON.parse(rawText.trim());

    return new Response(JSON.stringify({ questions }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error generating AI quiz:', error);
    
    // Fallback questions in case of API limits or errors
    const tName = req.body?.isWholeCourse ? "General Course Concepts" : (req.body?.topics?.[0] || "General");
    const fallbackQuestions = Array.from({ length: req.body?.amount || 5 }).map((_, i) => ({
        "Topic": tName,
        "Difficulty": req.body?.difficulty || 3,
        "Cognitive Level": "Apply",
        "Question": `[Fallback Question ${i+1}]: What is a key principle of ${tName}? (AI limit reached or invalid response)`,
        "Options": ["Correct Principle", "Wrong Answer 1", "Wrong Answer 2", "Wrong Answer 3"],
        "Correct Answer": "Correct Principle",
        "Explanation": "This is a locally generated fallback question due to AI service unavailability or parse error."
    }));

    return new Response(JSON.stringify({ questions: fallbackQuestions, isFallback: true }), {
      status: 200, // Return 200 with fallback so the app experience remains smooth
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
