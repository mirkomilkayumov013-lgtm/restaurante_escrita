/* ============================================
   CDI A2 Spanish Writing Checker - Script
   Gemini AI Integration
   ============================================ */

// ============ API CONFIGURATION ============
const apiKey = "PASTE_API_KEY_HERE";
const modelName = "gemini-2.0-flash";
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

// ============ DOM ELEMENTS ============
const essayInput = document.getElementById("essay-input");
const wordCountEl = document.getElementById("word-count");
const checkBtn = document.getElementById("check-btn");
const resetBtn = document.getElementById("reset-btn");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const timerEl = document.getElementById("timer");
const progressBar = document.getElementById("progress-bar");
const autosaveStatus = document.getElementById("autosave-status");
const resultsSection = document.getElementById("results-section");
const loadingOverlay = document.getElementById("loading-overlay");
const printBtn = document.getElementById("print-btn");

// Score elements
const scoreTotal = document.getElementById("score-total");
const scoreGrammar = document.getElementById("score-grammar");
const scoreVocabulary = document.getElementById("score-vocabulary");
const scoreTask = document.getElementById("score-task");
const scoreOrganization = document.getElementById("score-organization");
const scoreOrthography = document.getElementById("score-orthography");

// Result elements
const markedText = document.getElementById("marked-text");
const correctedText = document.getElementById("corrected-text");
const correctionsList = document.getElementById("corrections-list");
const taskChecklist = document.getElementById("task-checklist");
const strengthsList = document.getElementById("strengths-list");
const weaknessesList = document.getElementById("weaknesses-list");
const cefrFeedback = document.getElementById("cefr-feedback");

// ============ STATE ============
let timerMinutes = 45;
let timerSeconds = 0;
let timerInterval = null;
let autosaveInterval = null;

// ============ INITIALIZATION ============
function init() {
    loadSavedState();
    startTimer();
    startAutosave();
    setupEventListeners();
    updateWordCount();
}

function setupEventListeners() {
    essayInput.addEventListener("input", handleInput);
    checkBtn.addEventListener("click", checkEssay);
    resetBtn.addEventListener("click", resetEssay);
    darkModeToggle.addEventListener("click", toggleDarkMode);
    printBtn.addEventListener("click", function () {
        window.print();
    });
}

// ============ WORD COUNT & PROGRESS ============
function handleInput() {
    updateWordCount();
    updateProgressBar();
}

function countWords(text) {
    var trimmed = text.trim();
    if (trimmed === "") return 0;
    return trimmed.split(/\s+/).length;
}

function updateWordCount() {
    var count = countWords(essayInput.value);
    wordCountEl.textContent = count;

    if (count >= 80) {
        wordCountEl.classList.add("sufficient");
        checkBtn.disabled = false;
    } else {
        wordCountEl.classList.remove("sufficient");
        checkBtn.disabled = true;
    }
}

function updateProgressBar() {
    var count = countWords(essayInput.value);
    var percent = Math.min((count / 80) * 100, 100);
    progressBar.style.width = percent + "%";
}

// ============ TIMER ============
function startTimer() {
    var saved = localStorage.getItem("cdi_timer");
    if (saved) {
        var parts = saved.split(":");
        timerMinutes = parseInt(parts[0], 10);
        timerSeconds = parseInt(parts[1], 10);
    }

    updateTimerDisplay();

    timerInterval = setInterval(function () {
        if (timerSeconds === 0) {
            if (timerMinutes === 0) {
                clearInterval(timerInterval);
                timerEl.textContent = "00:00";
                timerEl.style.color = "var(--color-error)";
                return;
            }
            timerMinutes--;
            timerSeconds = 59;
        } else {
            timerSeconds--;
        }
        updateTimerDisplay();
        localStorage.setItem("cdi_timer", timerMinutes + ":" + timerSeconds);
    }, 1000);
}

function updateTimerDisplay() {
    var m = timerMinutes < 10 ? "0" + timerMinutes : timerMinutes;
    var s = timerSeconds < 10 ? "0" + timerSeconds : timerSeconds;
    timerEl.textContent = m + ":" + s;

    if (timerMinutes < 5) {
        timerEl.style.color = "var(--color-error)";
    }
}

// ============ AUTOSAVE ============
function startAutosave() {
    autosaveInterval = setInterval(function () {
        saveState();
        autosaveStatus.textContent = "Autosave: Saved at " + new Date().toLocaleTimeString();
    }, 15000);
}

function saveState() {
    localStorage.setItem("cdi_essay", essayInput.value);
}

function loadSavedState() {
    var savedEssay = localStorage.getItem("cdi_essay");
    if (savedEssay) {
        essayInput.value = savedEssay;
    }

    var savedDark = localStorage.getItem("cdi_dark_mode");
    if (savedDark === "true") {
        document.body.classList.add("dark-mode");
    }
}

// ============ DARK MODE ============
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    var isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("cdi_dark_mode", isDark);
}

// ============ RESET ============
function resetEssay() {
    if (!confirm("Are you sure you want to reset? This will clear your essay.")) {
        return;
    }
    essayInput.value = "";
    updateWordCount();
    updateProgressBar();
    resultsSection.classList.add("hidden");
    localStorage.removeItem("cdi_essay");
    localStorage.removeItem("cdi_timer");
    clearInterval(timerInterval);
    timerMinutes = 45;
    timerSeconds = 0;
    timerEl.style.color = "";
    startTimer();
    autosaveStatus.textContent = "Autosave: Reset";
}

// ============ AI CHECK ============
async function checkEssay() {
    var essay = essayInput.value.trim();
    if (countWords(essay) < 80) {
        alert("Please write at least 80 words before checking.");
        return;
    }

    showLoading(true);

    try {
        var result = await callGemini(essay);
        displayResults(result);
    } catch (error) {
        console.error("Error calling Gemini:", error);
        alert("Error analyzing your essay. Please check your API key and try again.\n\nError: " + error.message);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove("hidden");
    } else {
        loadingOverlay.classList.add("hidden");
    }
}

// ============ GEMINI API ============
async function callGemini(essay) {
    var prompt = buildPrompt(essay);

    var requestBody = {
        contents: [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.3,
            topP: 0.8,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
        }
    };

    var response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        var errorData = await response.json().catch(function () { return {}; });
        throw new Error("API Error " + response.status + ": " + (errorData.error && errorData.error.message ? errorData.error.message : "Unknown error"));
    }

    var data = await response.json();
    var text = data.candidates[0].content.parts[0].text;

    // Parse the JSON response
    var parsed = JSON.parse(text);
    return parsed;
}

function buildPrompt(essay) {
    return `You are an expert CDI/DELE A2 Spanish language examiner. Analyze the following A2-level Spanish writing task and provide detailed corrections and scoring.

TASK GIVEN TO THE STUDENT:
"Usted tiene que escribir un texto sobre un restaurante en el que estuvo. Hable de:
- Como era, donde estaba, que tipo de comida servian.
- Quien se lo recomendo.
- Con quien fue.
- Que comio.
- Le gusto o no le gusto. Por que."

STUDENT'S ESSAY:
"""
${essay}
"""

SCORING CRITERIA (Total: 10 points):
- Grammar: 0-3 points (verb conjugation, tenses, agreement, sentence structure)
- Vocabulary: 0-2 points (range, appropriateness for A2 level, variety)
- Task completion: 0-3 points (all required topics addressed)
- Organization: 0-1 point (coherence, paragraphing, connectors)
- Orthography: 0-1 point (spelling, accents, punctuation)

INSTRUCTIONS:
1. Identify ALL errors: grammar, spelling, punctuation, missing accents, awkward phrases, and repeated vocabulary.
2. For each error, provide the original text, the correction, and a simple English explanation suitable for A2 students.
3. Check whether the student addressed each task requirement.
4. Score each category fairly based on A2 level expectations.
5. Provide strengths, weaknesses, and overall CEFR A2 feedback in simple English.

Respond with a JSON object in exactly this format:
{
  "scores": {
    "grammar": <number 0-3>,
    "vocabulary": <number 0-2>,
    "task_completion": <number 0-3>,
    "organization": <number 0-1>,
    "orthography": <number 0-1>,
    "total": <number 0-10>
  },
  "corrections": [
    {
      "original": "<exact text with error>",
      "corrected": "<corrected text>",
      "type": "<grammar|spelling|punctuation|accent|vocabulary|style>",
      "explanation": "<simple English explanation for A2 students>"
    }
  ],
  "corrected_essay": "<full corrected version of the essay>",
  "task_requirements": {
    "described_restaurant": <true/false>,
    "mentioned_location": <true/false>,
    "mentioned_food_type": <true/false>,
    "who_recommended": <true/false>,
    "who_went_with": <true/false>,
    "what_they_ate": <true/false>,
    "liked_or_not_and_why": <true/false>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "cefr_feedback": "<overall feedback paragraph in simple English about the student's A2 writing level, what they do well, and what they should practice>"
}

IMPORTANT:
- Keep ALL explanations in SIMPLE ENGLISH appropriate for A2 students.
- Be encouraging but honest.
- The "original" field in corrections must match exact text from the student's essay.
- Score fairly for A2 level - do not expect B1 or higher performance.
- If there are no errors in a category, still include the category with a score.`;
}

// ============ DISPLAY RESULTS ============
function displayResults(result) {
    // Show results section
    resultsSection.classList.remove("hidden");

    // Scroll to results
    setTimeout(function () {
        resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    // Display scores
    displayScores(result.scores);

    // Display marked text
    displayMarkedText(essayInput.value, result.corrections);

    // Display corrected text
    correctedText.textContent = result.corrected_essay || "";

    // Display corrections list
    displayCorrectionsList(result.corrections);

    // Display task checklist
    displayTaskChecklist(result.task_requirements);

    // Display strengths and weaknesses
    displayFeedbackLists(result.strengths, result.weaknesses);

    // Display CEFR feedback
    cefrFeedback.textContent = result.cefr_feedback || "";
}

function displayScores(scores) {
    animateScore(scoreTotal, scores.total || 0);
    animateScore(scoreGrammar, scores.grammar || 0);
    animateScore(scoreVocabulary, scores.vocabulary || 0);
    animateScore(scoreTask, scores.task_completion || 0);
    animateScore(scoreOrganization, scores.organization || 0);
    animateScore(scoreOrthography, scores.orthography || 0);
}

function animateScore(element, target) {
    var current = 0;
    var step = target / 20;
    var interval = setInterval(function () {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(interval);
        }
        element.textContent = Math.round(current * 10) / 10;
    }, 40);
}

function displayMarkedText(originalEssay, corrections) {
    if (!corrections || corrections.length === 0) {
        markedText.textContent = originalEssay;
        return;
    }

    var html = originalEssay;

    // Sort corrections by length of original (longest first) to avoid overlapping replacements
    var sorted = corrections.slice().sort(function (a, b) {
        return b.original.length - a.original.length;
    });

    // Replace each error with highlighted version
    sorted.forEach(function (correction) {
        if (!correction.original) return;
        var escapedOriginal = escapeRegex(correction.original);
        var regex = new RegExp(escapedOriginal, "gi");
        var replacement = '<span class="error-highlight">' +
            escapeHtml(correction.original) +
            '<span class="tooltip"><strong>Error:</strong> ' + escapeHtml(correction.original) +
            '<br><strong>Fix:</strong> ' + escapeHtml(correction.corrected) +
            '<br><strong>Why:</strong> ' + escapeHtml(correction.explanation) +
            '</span></span>';
        html = html.replace(regex, replacement);
    });

    markedText.innerHTML = html;
}

function displayCorrectionsList(corrections) {
    if (!corrections || corrections.length === 0) {
        correctionsList.innerHTML = '<p style="color: var(--color-success); font-weight: 600;">No errors found. Great job!</p>';
        return;
    }

    var html = "";
    corrections.forEach(function (correction, index) {
        html += '<div class="correction-item">';
        html += '<span class="correction-number">' + (index + 1) + '</span>';
        html += '<div class="correction-content">';
        html += '<div class="correction-original">' + escapeHtml(correction.original) + '</div>';
        html += '<div class="correction-fixed">' + escapeHtml(correction.corrected) + '</div>';
        html += '<div class="correction-explanation">' + escapeHtml(correction.explanation) + '</div>';
        html += '</div>';
        html += '</div>';
    });

    correctionsList.innerHTML = html;
}

function displayTaskChecklist(requirements) {
    if (!requirements) {
        taskChecklist.innerHTML = '<p>Task requirements could not be evaluated.</p>';
        return;
    }

    var items = [
        { key: "described_restaurant", label: "Described the restaurant (what it was like)" },
        { key: "mentioned_location", label: "Mentioned where it was located" },
        { key: "mentioned_food_type", label: "Mentioned the type of food served" },
        { key: "who_recommended", label: "Said who recommended it" },
        { key: "who_went_with", label: "Said who they went with" },
        { key: "what_they_ate", label: "Described what they ate" },
        { key: "liked_or_not_and_why", label: "Explained if they liked it and why" }
    ];

    var html = "";
    items.forEach(function (item) {
        var passed = requirements[item.key] === true;
        html += '<div class="checklist-item">';
        html += '<span class="checklist-icon ' + (passed ? "pass" : "fail") + '">';
        html += passed ? "&#10003;" : "&#10007;";
        html += '</span>';
        html += '<span>' + item.label + '</span>';
        html += '</div>';
    });

    taskChecklist.innerHTML = html;
}

function displayFeedbackLists(strengths, weaknesses) {
    var sHtml = "";
    if (strengths && strengths.length > 0) {
        strengths.forEach(function (s) {
            sHtml += '<li>' + escapeHtml(s) + '</li>';
        });
    } else {
        sHtml = '<li>Keep practicing!</li>';
    }
    strengthsList.innerHTML = sHtml;

    var wHtml = "";
    if (weaknesses && weaknesses.length > 0) {
        weaknesses.forEach(function (w) {
            wHtml += '<li>' + escapeHtml(w) + '</li>';
        });
    } else {
        wHtml = '<li>Great work - no major issues found!</li>';
    }
    weaknessesList.innerHTML = wHtml;
}

// ============ UTILITIES ============
function escapeHtml(text) {
    if (!text) return "";
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============ START APP ============
document.addEventListener("DOMContentLoaded", init);
