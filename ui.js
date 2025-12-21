// ui.js
// Entry point: wires DOM events, dynamic rules UI, and coordinates modules.

import {
  DEFAULT_RULES,
  DEFAULT_RULES_EN,
  DEFAULT_RULES_AR,
  getDefaultRules,
  getFinalCertificateCatalog,
  getFinalTrainingCoursesCatalog,
} from "./constants.js";

import {
  saveChatHistory,
  loadChatHistory,
  saveUserRules,
  loadUserRules,
  saveLastRecommendations,
  loadLastRecommendations,
  loadCertificateCatalog,
  loadTrainingCoursesCatalog,
  calculateTotalExperience,
  calculateYearsFromPeriod,
  setPersistence,
  isPersistenceEnabled,
  saveSubmittedCvs, 
  loadSubmittedCvs, 
  saveLanguagePreference,
  loadLanguagePreference,
} from "./storage-catalog.js";

import {
  addMessage,
  showTypingIndicator,
  hideTypingIndicator,
  buildChatSystemPrompt,
  buildChatContextMessage,
  extractTextFromFile,
  parseCvIntoStructuredSections,
  parseAndApplyRules,
  analyzeCvsWithAI,
  displayRecommendations,
  callGeminiAPI,
  callGeminiProxyStream,
  analyzeSingleCvWithAI, 
} from "./ai.js";

// --- GLOBAL STATE ---
let currentLang = 'en';
let uploadedCvs = [];
let submittedCvData = [];
let allRecommendationsMap = {};
let lastRecommendations = { candidates: [] }; 
let userRules = [];
let abortController = null; 
let isGenerating = false;   

const UI_TEXT = {
  en: {
    appTitle: "SkillMatch Pro",
    tagline: "AI-powered training and certification recommendations",
    chatTitle: "Chat Assistant",
    chatPlaceholder: "Ask about training programs, certificates, or uploaded CVs...",
    uploadTitle: "Upload CVs",
    dragDrop: "Drag & drop CV files here or click to browse",
    rulesTitle: "Business Rules",
    optional: "Optional",
    addRule: "Add Rule",
    generateBtn: "Generate Recommendations",
    uploadedCvs: "Uploaded CVs",
    reviewTitle: "CV Analysis Review",
    searchCv: "Search CV by name...",
    submit: "Submit",
    recommendationsTitle: "Recommendations",
    saveSession: "Keep My Data",
    downloadBtn: "Download Recommendations (PDF)",
    stopBtn: "Stop Recommendation Generation",
    generationStopped: "Recommendation generation was stopped by the user",
    welcomeMessage: `As-salamu alaykum! I'm your Training and Certification Assistant.
I'm here to help you identify the best learning paths for your team. Follow these steps to get started:
      <ol>
        <li><b>Upload CVs</b>: Begin by uploading the resumes of your candidates.</li>
        <li><b>Add Business Rules (Optional)</b>: Define specific criteria or requirements to tailor the analysis.</li>
        <li>click on <b>Generate Recommendations</b> button to see the results.</li>
      </ol>
      If you need assistance, I'm pleased to help!`,
    toggleBtnText: "العربية",
    enterRule: "Enter a business rule...",
    estTime: "Estimated time to complete:",
    total: "Total",
    hours: "hours",
    na: "N/A",
    rulesApplied: "Rules:",
    experience: "Experience",
    exp: "exp",
    education: "Education",
    certifications: "Certifications",
    skills: "Skills",
    jobTitle: "Job Title",
    company: "Company Name",
    description: "Description",
    years: "Years",
    degree: "Degree and Field of study",
    school: "School",
    certification: "Certification",
    skill: "Skill",
    add: "+ Add",
    submitSingle: "Submit CV",
    submitAll: "Submit all CVs",
    pdfTitle: "Training & Certification Recommendations",
    pdfGeneratedOn: "Generated on",
    pdfCandidate: "Candidate",
    pdfFile: "File",
    footerRights: "All rights reserved"
  },
  ar: {
    appTitle: "SkillMatch Pro",
    tagline: "توصيات التدريب والشهادات المدعومة بالذكاء الاصطناعي",
    chatTitle: "المساعد الذكي",
    chatPlaceholder: "اسأل عن البرامج أو الشّهادات أو السير الذاتيّة المرفوعة...",
    uploadTitle: "رفع السير الذاتية",
    dragDrop: "اسحب وأفلت الملفات هنا أو انقر للتصفح",
    rulesTitle: "قواعد العمل",
    optional: "اختياري",
    addRule: "إضافة قاعدة",
    stopBtn: "إيقاف إصدار التوصيات",
    generationStopped: "تم إيقاف إصدار التوصيات بواسطة المستخدم",
    generateBtn: "إصدار التوصيات",
    uploadedCvs: "السير الذاتية المرفوعة",
    reviewTitle: "مراجعة التحليل",
    searchCv: "بحث عن السيرة الذاتية...",
    submit: "إرسال",
    recommendationsTitle: "التوصيات",
    downloadBtn: "تحميل التوصيات (PDF)",
    welcomeMessage: `السّلام عليكم! أنا مساعدك الخاص بالتدريب والشهادات.
أنا هنا لمساعدتك في تحديد أفضل مسارات التعلم لفريقك. اتبع الخطوات التالية للبدء:
      <ul>
  <li><b>رفع السير الذاتية</b>: ابدأ برفع السير الذاتية الخاصة بالمرشحين.</li>
  <li><b>إضافة قواعد العمل (اختياري)</b>: حدد معايير أو متطلبات خاصة لتخصيص عملية التحليل.</li>
  <li>اضغط على <b>إصدار التوصيات</b> لعرض النتائج.</li>
</ul>
      إذا كنت بحاجة إلى مساعدة، أنا في خدمتك!`,
    toggleBtnText: "English",
    enterRule: "أدخل قاعدة عمل...",
    saveSession: "حفظ بياناتي",
    estTime: "الوقت التقديري لإكمال الشهادة:",
    total: "الإجمالي",
    hours: "ساعة",
    na: "غير متوفر",
    rulesApplied: "القواعد المطبقة:",
    experience: "الخبرة المهنية",
    exp: "خبرة",
    education: "التعليم",
    certifications: "الشهادات",
    skills: "المهارات",
    jobTitle: "المسمى الوظيفي",
    company: "اسم الشركة",
    description: "الوصف",
    years: "السنوات",
    degree: "الدرجة ومجال الدراسة",
    school: "الجامعة / المدرسة",
    certification: "اسم الشهادة",
    skill: "المهارة",
    add: "+ إضافة",
    submitSingle: "إرسال السيرة الذاتية",
    submitAll: "إرسال جميع السير الذاتية",
    pdfTitle: "توصيات التدريب والشهادات",
    pdfGeneratedOn: "تم الإصدار في",
    pdfCandidate: "المرشح",
    pdfFile: "الملف",
    footerRights: "جميع الحقوق محفوظة"
  }
};

const STATUS_MESSAGES = {
  en: {
    analyzing: "Parsing details in background...",
    extracting: "Reading files...",
    parsing: "Parsing CV into sections...",
    success: "Files ready! You can generate recommendations now.",
    error: "Failed to read files.",
    selectFile: "Please select at least one CV file.",
    generating: "Generating recommendations...",
    genSuccess: "Recommendations generated successfully!",
    rulesSaved: "Rules saved successfully.",
    rulesCleared: "Rules cleared.",
    completedCVs: "Completed CVs."
  },
  ar: {
    analyzing: "جاري تحليل التفاصيل في الخلفية...",
    extracting: "جاري قراءة الملفات...",
    parsing: "جاري تقسيم السيرة الذاتية إلى أقسام...",
    success: "الملفات جاهزة! يمكنك إصدار التوصيات الآن.",
    error: "فشل في قراءة الملفات.",
    selectFile: "يرجى اختيار ملف سيرة ذاتية واحد على الأقل.",
    generating: "جاري إصدار التوصيات...",
    genSuccess: "تم إصدار التوصيات بنجاح!",
    rulesSaved: "تم حفظ القواعد بنجاح.",
    rulesCleared: "تم مسح القواعد.",
    completedCVs: "تم الانتهاء من السير الذاتية."
  }
};

function getStatusText(key) {
  return STATUS_MESSAGES[currentLang][key] || STATUS_MESSAGES['en'][key];
}

function getUiText(key) {
  return UI_TEXT[currentLang][key] || UI_TEXT['en'][key];
}

// ===========================================================================
// LANGUAGE HANDLING
// ===========================================================================

function updateLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;

  if (lang === 'ar') {
    document.body.classList.add('keep-ltr-layout');
    document.body.classList.remove('ltr-layout');
  } else {
    document.body.classList.add('ltr-layout');
    document.body.classList.remove('keep-ltr-layout');
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el && UI_TEXT[lang][key]) {
      const icon = el.querySelector('i');
      if (icon) {
        const iconClone = icon.cloneNode(true);
        el.textContent = " " + UI_TEXT[lang][key];
        el.prepend(iconClone);
      } else {
        el.textContent = UI_TEXT[lang][key];
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (el && UI_TEXT[lang][key]) {
      el.placeholder = UI_TEXT[lang][key];
    }
  });

  const langTextSpan = document.getElementById('lang-text');
  if (langTextSpan) langTextSpan.textContent = UI_TEXT[lang].toggleBtnText;

  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    const firstMsg = chatMessages.querySelector('.bot-message');
    if (chatMessages.children.length === 1 && firstMsg) {
      firstMsg.innerHTML = UI_TEXT[lang].welcomeMessage;
    }
  }

  const currentRulesFromUI = getRulesFromUI();
  
  if (currentRulesFromUI.length > 0 || (userRules && userRules.length > 0)) {
    const rulesToTranslate = currentRulesFromUI.length > 0 ? currentRulesFromUI : userRules;
    const prevLang = lang === 'en' ? 'ar' : 'en';
    const prevDefaults = prevLang === 'en' ? DEFAULT_RULES_EN : DEFAULT_RULES_AR;
    const newDefaults = lang === 'en' ? DEFAULT_RULES_EN : DEFAULT_RULES_AR;

    const defaultMap = new Map();
    if (prevDefaults && newDefaults) {
      prevDefaults.forEach((rule, index) => {
        if (newDefaults[index]) {
          defaultMap.set(rule, newDefaults[index]);
        }
      });
    }

    const updatedRules = rulesToTranslate.map(rule => {
      return defaultMap.has(rule) ? defaultMap.get(rule) : rule;
    });

    userRules = updatedRules;
    initializeRulesUI(userRules);
    saveUserRules(userRules);
  }

  if (submittedCvData.length > 0) {
    renderSubmittedCvBubbles(submittedCvData);
  }

  const recommendationsContainer = document.getElementById("recommendations-container");
  const resultsSection = document.getElementById("results-section");
  const selectedCvs = submittedCvData.filter(cv => cv.selected);
  const generateBtn = document.getElementById("generate-recommendations-btn");
  
  if (selectedCvs.length > 0 && generateBtn && !generateBtn.disabled) {
    // Note: Automatic re-generation on language toggle can be expensive/interruptive. 
    // Usually preferred to let user click again, but kept as per existing logic.
  } else if (
    recommendationsContainer &&
    lastRecommendations &&
    lastRecommendations.candidates &&
    lastRecommendations.candidates.length > 0
  ) {
    recommendationsContainer.innerHTML = `<div class="loader"></div>`;
    updateDownloadButtonVisibility(lastRecommendations);

    (async () => {
      try {
        const { translateRecommendations } = await import("./ai.js");
        const translatedRecommendations = await translateRecommendations(lastRecommendations, lang);
        lastRecommendations = translatedRecommendations;
        saveLastRecommendations(lastRecommendations);
        recommendationsContainer.innerHTML = "";
        displayRecommendations(translatedRecommendations, recommendationsContainer, resultsSection, lang);
        updateDownloadButtonVisibility(lastRecommendations);
      } catch (err) {
        recommendationsContainer.innerHTML = "";
        displayRecommendations(lastRecommendations, recommendationsContainer, resultsSection, lang);
        updateDownloadButtonVisibility(lastRecommendations);
      }
    })();
  }
  saveLanguagePreference(lang);
}

function initializeLanguage() {
  const toggleBtn = document.getElementById('language-toggle');
  const savedLang = loadLanguagePreference();
  updateLanguage(savedLang);
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const newLang = currentLang === 'en' ? 'ar' : 'en';
      updateLanguage(newLang);
    });
  }
}

// ===========================================================================
// Rules UI
// ===========================================================================

function createRuleInput(ruleText = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "rule-input-wrapper";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = getUiText('enterRule');
  input.value = ruleText;
  input.className = "rule-input";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-rule-btn";
  deleteBtn.innerHTML = "×";
  deleteBtn.title = "Delete this rule";

  // --- FIX: Use 'input' event to save on every keystroke so nothing is lost on refresh ---
  input.addEventListener("input", () => {
    const updatedRules = getRulesFromUI();
    saveUserRules(updatedRules);
  });

  deleteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    wrapper.remove();
    const updatedRules = getRulesFromUI();
    saveUserRules(updatedRules);
  });

  wrapper.appendChild(input);
  wrapper.appendChild(deleteBtn);
  return wrapper;
}

function initializeRulesUI(rules) {
  const container = document.getElementById("rules-container");
  if (!container) return;

  const statusOverlay = container.querySelector("#rules-status");
  container.innerHTML = "";
  if (statusOverlay) {
    container.appendChild(statusOverlay);
  }

  if (rules && rules.length > 0) {
    rules.forEach((rule) => {
      container.appendChild(createRuleInput(rule));
    });
  } else {
    container.appendChild(createRuleInput());
  }
}

function getRulesFromUI() {
  const container = document.getElementById("rules-container");
  if (!container) return [];

  const inputs = container.querySelectorAll(".rule-input");
  const rules = [];
  inputs.forEach((input) => {
    const value = input.value.trim();
    if (value) {
      rules.push(value);
    }
  });
  return rules;
}

function updateGenerateButton(uploadedCvs) {
  const generateBtn = document.getElementById("generate-recommendations-btn");
  const fileInput = document.getElementById("file-input");
  if (generateBtn) {
    const hasFiles = fileInput && fileInput.files && fileInput.files.length > 0;
    const hasCvs = uploadedCvs.length > 0;
    generateBtn.disabled = !hasFiles && !hasCvs;
  }
}

// ---------------------------------------------------------------------------
// Candidate Card Creation (With Timeline)
// ---------------------------------------------------------------------------
function createCandidateCard(candidateData, language = 'en') {
  const catalog = getFinalCertificateCatalog();
  const trainingCatalog = getFinalTrainingCoursesCatalog();
  const candidateDiv = document.createElement("div");
  candidateDiv.className = "candidate-result";
  candidateDiv.style.opacity = "0"; 
  candidateDiv.style.animation = "slideIn 0.5s forwards"; 

  let displayCandidateName = candidateData.candidateName;
  if (!displayCandidateName || displayCandidateName === "N/A" || displayCandidateName === "n/a") {
      displayCandidateName = candidateData.cvName || (language === 'ar' ? "مرشح" : "Candidate");
  }

  const nameDiv = document.createElement("h3");
  nameDiv.className = "candidate-name";
  nameDiv.textContent = displayCandidateName;
  candidateDiv.appendChild(nameDiv);

  if (candidateData.cvName && candidateData.cvName !== displayCandidateName) {
    const fileDiv = document.createElement("div");
    fileDiv.className = "candidate-cv-name";
    fileDiv.textContent = `File: ${candidateData.cvName}`;
    candidateDiv.appendChild(fileDiv);
  }

  const introDiv = document.createElement("div");
  introDiv.className = "recommendation-intro";
  let introText = candidateData.recommendationIntro || candidateData.recommendationSummary || "";
  if (!introText) {
    introText = language === "ar" ? "بناءً على خبرات المرشح الحالية، تم ترشيح التوصيات التالية:" : "Based on the candidate's background, the following are recommended:";
  }
  introDiv.textContent = introText;
  candidateDiv.appendChild(introDiv);

  // Certificates Section
  const certificatesSubsection = document.createElement("div");
  certificatesSubsection.className = "recommendations-subsection";
  const certTitle = document.createElement("h4");
  certTitle.className = "subsection-title";
  certTitle.textContent = language === "ar" ? "الشهادات" : "Certificates";
  certificatesSubsection.appendChild(certTitle);

  const certTimeline = [];
  let certTotalHours = 0;

  if (candidateData.recommendations && candidateData.recommendations.length > 0) {
    candidateData.recommendations.forEach((rec) => {
      let displayName = rec.certName;
      let catalogEntry = catalog.find(c => c.id === rec.certId) || catalog.find(c => c.name === rec.certName || c.Certificate_Name_EN === rec.certName);
      if (language === 'ar' && catalogEntry && catalogEntry.nameAr) displayName = catalogEntry.nameAr;
      let hours = Number(catalogEntry?.Estimated_Hours_To_Complete || catalogEntry?.estimatedHours) || 0;
      certTimeline.push({ name: displayName, hours });
      certTotalHours += hours;

      const hourWord = getUiText('hours');
      const hoursText = hours > 0 ? `${hours} ${hourWord}` : getUiText('na');
      const card = document.createElement("div");
      card.className = "recommendation-card";
      card.innerHTML = `
        <div class="recommendation-title">${displayName}</div>
        <div class="recommendation-reason"><i class="fas fa-lightbulb"></i> ${rec.reason}</div>
        <div class="recommendation-hours">
          <i class="far fa-clock"></i> <span>${getUiText('estTime')}</span> <strong>${hoursText}</strong>
          ${rec.rulesApplied && rec.rulesApplied.length > 0 ? `<span class="recommendation-rule-inline"><i class="fas fa-gavel"></i> ${getUiText('rulesApplied')} ${rec.rulesApplied.join(", ")}</span>` : ""}
        </div>`;
      certificatesSubsection.appendChild(card);
    });
  } else {
    const msg = document.createElement("p");
    msg.textContent = language === 'ar' ? "لم يتم العثور على توصيات للشهادات." : "No certificate recommendations found.";
    certificatesSubsection.appendChild(msg);
  }
  
  if (certTimeline.length > 0 && certTotalHours > 0) {
    const timelineWrapper = document.createElement("div");
    timelineWrapper.className = "timeline-wrapper";
    const titleText = language === "ar" ? "الوقت التقريبي لإكمال الشهادات المقترحة" : "Estimated timeline for certificates";
    const isArabic = language === "ar";
    timelineWrapper.innerHTML = `<h4 class="timeline-title">${titleText} (${getUiText('total')}: ${certTotalHours} ${getUiText('hours')})</h4>`;
    certificatesSubsection.appendChild(timelineWrapper);
  }
  candidateDiv.appendChild(certificatesSubsection);

  // Training Section
  const trainingSubsection = document.createElement("div");
  trainingSubsection.className = "recommendations-subsection";
  const trainingTitle = document.createElement("h4");
  trainingTitle.className = "subsection-title";
  trainingTitle.textContent = language === "ar" ? "الدورات التدريبية" : "Training Courses";
  trainingSubsection.appendChild(trainingTitle);

  if (candidateData.trainingCourses && candidateData.trainingCourses.length > 0) {
    candidateData.trainingCourses.forEach((rec) => {
      let displayName = rec.courseName;
      let catalogEntry = trainingCatalog.find(c => c.id === rec.courseId) || trainingCatalog.find(c => c.name === rec.courseName);
      if (language === 'ar' && catalogEntry && catalogEntry.nameAr) displayName = catalogEntry.nameAr;
      const card = document.createElement("div");
      card.className = "recommendation-card";
      card.innerHTML = `<div class="recommendation-title">${displayName}</div><div class="recommendation-reason">${rec.reason}</div>`;
      trainingSubsection.appendChild(card);
    });
  } else {
    const msg = document.createElement("p");
    msg.textContent = language === 'ar' ? "لا توجد توصيات للدورات التدريبية." : "No training course recommendations found.";
    trainingSubsection.appendChild(msg);
  }
  candidateDiv.appendChild(trainingSubsection);

  return candidateDiv;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateStatus(element, messageKey, isError = false, rawText = null) {
  if (!element) return;
  const text = rawText || getStatusText(messageKey) || messageKey;
  element.innerHTML = `<div class="status-message ${isError ? "status-error" : "status-success"}">${text}</div>`;
  setTimeout(() => { element.innerHTML = ""; }, 8000);
}

function showLoading(element, messageKey, rawText = null) {
  if (!element) return;
  const text = rawText || getStatusText(messageKey) || messageKey;
  element.innerHTML = `<div class="loader"></div>${text}`;
}

function hideLoading(element) {
  if (!element) return;
  element.innerHTML = "";
}

function clearChatHistoryDom() {
  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    chatMessages.innerHTML = `<div class="message bot-message">${getUiText('welcomeMessage')}</div>`;
  }
}

function updateDownloadButtonVisibility(recommendations) {
  const downloadBtn = document.getElementById("download-recommendations-btn");
  if (!downloadBtn) return;
  if (!recommendations || !recommendations.candidates || recommendations.candidates.length === 0) {
    downloadBtn.classList.add("hidden");
    return;
  }
  downloadBtn.classList.remove("hidden");
}

// ---------------------------------------------------------------------------
// Main bootstrap
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  let chatHistory = []; 
  
  // --- FIX: LOAD RULES BEFORE DOING ANYTHING ELSE ---
  const persistedRules = loadUserRules();
  const savedLang = loadLanguagePreference();

  // If we have saved rules, use them. Otherwise, initialize with defaults.
  if (persistedRules && persistedRules.length > 0) {
      userRules = persistedRules;
  } else {
      userRules = [...getDefaultRules(savedLang)];
  }
  
  // Render rules to UI immediately
  initializeRulesUI(userRules);

  // Now handle language and welcome messages
  initializeLanguage();
  clearChatHistoryDom(); 
  
  await loadCertificateCatalog();
  await loadTrainingCoursesCatalog();

  // Restore session data
  if (isPersistenceEnabled()) {
    chatHistory = loadChatHistory();
    lastRecommendations = loadLastRecommendations() || { candidates: [] };
    const chatContainer = document.getElementById("chat-messages");
    if (chatContainer && chatHistory.length > 0) {
      chatHistory.forEach(msg => addMessage(msg.text, msg.isUser));
    }
    if (lastRecommendations?.candidates?.length > 0) {
      const recommendationsContainer = document.getElementById("recommendations-container");
      const resultsSection = document.getElementById("results-section");
      displayRecommendations(lastRecommendations, recommendationsContainer, resultsSection, currentLang);
      updateDownloadButtonVisibility(lastRecommendations);
    }
  }

  const savedCvs = loadSubmittedCvs();
  if (savedCvs && savedCvs.length > 0) {
    submittedCvData = savedCvs;
    renderSubmittedCvBubbles(submittedCvData);
    updateGenerateButton(submittedCvData);
  }
  
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const fileInput = document.getElementById("file-input");
  const cvUploadArea = document.getElementById("cv-upload-area");
  const uploadStatus = document.getElementById("upload-status");
  const resultsSection = document.getElementById("results-section");
  const recommendationsContainer = document.getElementById("recommendations-container");
  const addRuleBtn = document.getElementById("add-rule-btn");
  const generateBtn = document.getElementById("generate-recommendations-btn");

  const persistenceToggle = document.getElementById("persistence-toggle");
  if (persistenceToggle) {
    persistenceToggle.checked = isPersistenceEnabled();
    persistenceToggle.addEventListener("change", (e) => {
      const isEnabled = e.target.checked;
      setPersistence(isEnabled);
      if (isEnabled) {
        saveUserRules(getRulesFromUI());
        saveChatHistory(chatHistory);
        saveLastRecommendations(lastRecommendations);
        saveSubmittedCvs(submittedCvData);
      }
    });
  }

  if (addRuleBtn) {
    addRuleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const container = document.getElementById("rules-container");
      if (container) {
        const newInput = createRuleInput();
        container.appendChild(newInput);
        newInput.querySelector('input')?.focus();
        // Since we are creating a new input, let's ensure storage reflects the new state
        saveUserRules(getRulesFromUI());
      }
    });
  }

  // Generate Recommendations
  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      const stopBtn = document.getElementById("stop-generation-btn");
      if (stopBtn) stopBtn.classList.remove("hidden");
      abortController = new AbortController();
      isGenerating = true;
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<div class="loader"></div>';
      recommendationsContainer.innerHTML = "";
      resultsSection.classList.remove("hidden");
      const rules = getRulesFromUI();
      const cvArray = submittedCvData.filter(cv => cv.selected);
      if (cvArray.length === 0) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = getUiText('generateBtn');
        if (stopBtn) stopBtn.classList.add("hidden");
        isGenerating = false;
        alert("Please select at least one CV");
        return;
      }
      try {
        allRecommendationsMap = {};
        for (const cv of cvArray) {
          if (abortController.signal.aborted) break;
          const placeholder = document.createElement("div");
          placeholder.className = "candidate-result";
          placeholder.innerHTML = `<h3 class="candidate-name">${cv.name}</h3><div class="loader"></div>`;
          recommendationsContainer.appendChild(placeholder);
          const result = await analyzeSingleCvWithAI(cv, rules, currentLang, 3, abortController.signal);
          if (abortController.signal.aborted) { placeholder.remove(); break; }
          const resultCard = createCandidateCard(result, currentLang);
          recommendationsContainer.replaceChild(resultCard, placeholder);
          allRecommendationsMap[cv.name] = result;
          lastRecommendations = { candidates: Object.values(allRecommendationsMap) };
          saveLastRecommendations(lastRecommendations);
        }
      } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = getUiText('generateBtn');
        isGenerating = false;
        if (stopBtn) stopBtn.classList.add("hidden");
        updateDownloadButtonVisibility(lastRecommendations);
      }
    });
  }

  // Close Modals
  document.getElementById("closeCvModalBtn")?.addEventListener("click", () => {
    document.getElementById("cvModal").style.display = "none";
  });
  document.getElementById("closeRulesModal")?.addEventListener("click", () => {
    document.getElementById("rulesModal").style.display = "none";
  });
  
  // File Processing
  if (fileInput) fileInput.addEventListener("change", runFastFileProcessing);
  if (cvUploadArea) cvUploadArea.addEventListener("click", () => fileInput.click());

  async function runFastFileProcessing() {
    if (!fileInput.files.length) return;
    showLoading(uploadStatus, "extracting");
    const extracted = await Promise.all(Array.from(fileInput.files).map(async (file) => {
      const rawText = await extractTextFromFile(file);
      return { name: file.name, text: rawText, isParsing: true, selected: true };
    }));
    upsertAndRenderSubmittedCvs(extracted);
    saveSubmittedCvs(submittedCvData);
    updateStatus(uploadStatus, "success");
    extracted.forEach(async (cv) => {
        const structured = await parseCvIntoStructuredSections(cv.text);
        cv.structured = structured;
        cv.isParsing = false;
        renderSubmittedCvBubbles(submittedCvData);
        saveSubmittedCvs(submittedCvData);
    });
  }
});

// Re-expose required functions for bubbles
window.renderSubmittedCvBubbles = renderSubmittedCvBubbles;
