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

  if (
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
    const hasCvs = (uploadedCvs && uploadedCvs.length > 0);
    generateBtn.disabled = !hasFiles && !hasCvs;
  }
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
// Modal helpers (CV review)
// ---------------------------------------------------------------------------

// Make helper functions globally accessible so they can be used by renderCvDetails
function createItemRow(item, fields) {
  const row = document.createElement("div");
  row.className = "item-row";
  const deleteBtn = document.createElement("span");
  deleteBtn.className = "delete-item-btn";
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => row.remove());
  row.appendChild(deleteBtn);

  fields.forEach((f) => {
    const field = typeof f === "string" ? { name: f } : f;
    const isTextarea = field.type === "textarea" || field.multiline;
    const input = document.createElement(isTextarea ? "textarea" : "input");
    if (!isTextarea) input.type = "text";
    
    input.placeholder = field.placeholder || field.name;
    input.value = item[field.name] || "";
    input.dataset.field = field.name || "";
    if (field.className) input.classList.add(field.className);
    row.appendChild(input);
  });
  return row;
}

function createSkillBubble(item, fields) {
  const bubble = document.createElement("div");
  bubble.className = "skill-bubble";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "skill-input";
  const primaryField = typeof fields[0] === "string" ? fields[0] : fields[0].name;
  const skillValue = item[primaryField] || item.title || item.name || "";
  input.value = skillValue;
  input.dataset.field = primaryField;
  const minWidth = 10;
  input.style.width = `${Math.max(minWidth, skillValue.length + 1)}ch`;
  input.addEventListener("input", (e) => {
    input.style.width = `${Math.max(minWidth, e.target.value.length + 1)}ch`;
  });
  bubble.appendChild(input);
  const deleteBtn = document.createElement("span");
  deleteBtn.className = "delete-item-btn";
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", (e) => { bubble.remove(); });
  bubble.appendChild(deleteBtn);
  return bubble;
}

function renderCvDetails(cv) {
  const container = document.getElementById("cvResultsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (cv.isParsing) { 
    container.innerHTML = `<div class="status-message"><div class="loader"></div> ${getStatusText('analyzing')}</div>`;
    return;
  }
  
  const sections = [
    {
      key: "experience",
      label: "Experience",
      fields: [
        { name: "jobTitle", placeholder: "Job Title", className: "cv-field-job-title" },
        { name: "company", placeholder: "Company", className: "cv-field-company" },
        { name: "description", placeholder: "Description", multiline: true, className: "cv-description-textarea" },
        { name: "years", placeholder: "Years/Period" },
      ],
    },
    {
      key: "education",
      label: "Education",
      fields: [
        { name: "degreeField", placeholder: "Degree", className: "education-degree-input" },
        { name: "school", placeholder: "School" },
      ],
    },
    { key: "certifications", label: "Certifications", fields: [{ name: "title", placeholder: "Certification" }] },
    { key: "skills", label: "Skills", fields: [{ name: "title", placeholder: "Skill" }] },
  ];

  sections.forEach((sec) => {
    const secDiv = document.createElement("div");
    secDiv.className = `cv-section cv-section-${sec.key}`;
    secDiv.innerHTML = `<h3>${sec.label}</h3>`;
    let listDiv = document.createElement("div");
    listDiv.id = `${cv.name}_${sec.key}_list`;
    
    if (sec.key === "skills") {
      listDiv.className = "skills-bubble-list";
      (cv[sec.key] || []).forEach((item) => listDiv.appendChild(createSkillBubble(item, sec.fields)));
    } else {
      (cv[sec.key] || []).forEach((item) => listDiv.appendChild(createItemRow(item, sec.fields)));
    }
    
    const addBtn = document.createElement("button");
    addBtn.className = "add-btn";
    addBtn.textContent = `+ Add ${sec.label}`;
    addBtn.onclick = () => {
        const item = {};
        if (sec.key === "skills") listDiv.appendChild(createSkillBubble(item, sec.fields));
        else listDiv.appendChild(createItemRow(item, sec.fields));
    };

    secDiv.appendChild(listDiv);
    secDiv.appendChild(addBtn);
    container.appendChild(secDiv);
  });
}

function readCvFromDom(cv) {
  const updated = { ...cv };
  ["experience", "education", "certifications", "skills"].forEach((sec) => {
    const list = document.getElementById(`${cv.name}_${sec}_list`);
    if (!list) return;
    updated[sec] = [];
    if (sec === "skills") {
      list.querySelectorAll(".skill-bubble").forEach(b => {
        const inp = b.querySelector("input");
        if (inp) updated[sec].push({ title: inp.value });
      });
    } else {
      list.querySelectorAll(".item-row").forEach(row => {
        const entry = {};
        row.querySelectorAll("input, textarea").forEach(inp => {
          entry[inp.dataset.field] = inp.value;
        });
        updated[sec].push(entry);
      });
    }
  });
  return updated;
}

function openCvModal(allCvResults, initialIndex = 0) {
  const modal = document.getElementById("cvModal");
  const tabs = document.getElementById("cvTabsContainer");
  if (!modal || !tabs) return;

  submittedCvData = allCvResults;
  modal.style.display = "flex";
  tabs.innerHTML = "";

  submittedCvData.forEach((cv, idx) => {
    const tab = document.createElement("div");
    tab.className = "cv-tab" + (idx === initialIndex ? " active" : "");
    tab.textContent = cv.name;
    tab.onclick = () => {
      document.querySelectorAll(".cv-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderCvDetails(submittedCvData[idx]);
    };
    tabs.appendChild(tab);
  });

  renderCvDetails(submittedCvData[initialIndex]);
}

function upsertByName(existing, incoming) {
  const map = new Map();
  existing.forEach((cv) => map.set(cv.name, cv));
  incoming.forEach((cv) => map.set(cv.name, cv));
  return Array.from(map.values());
}

function upsertAndRenderSubmittedCvs(cvResults) {
  submittedCvData = upsertByName(submittedCvData, cvResults);
  renderSubmittedCvBubbles(submittedCvData);
}

function renderSubmittedCvBubbles(allResults) {
  const container = document.getElementById("submitted-cv-bubbles");
  const countEl = document.getElementById("uploaded-cv-count");
  if (countEl) countEl.textContent = allResults.length;
  if (!container) return;
  container.innerHTML = "";

  allResults.forEach((cv, idx) => {
    const bubble = document.createElement("div");
    bubble.className = "cv-summary-bubble";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "cv-select-checkbox";
    checkbox.checked = cv.selected !== false;
    checkbox.onclick = (e) => e.stopPropagation();
    checkbox.onchange = (e) => { cv.selected = e.target.checked; updateGenerateButton(submittedCvData); };
    
    const nameSpan = document.createElement("span");
    nameSpan.className = "bubble-name";
    nameSpan.textContent = cv.name;

    const metaSpan = document.createElement("span");
    metaSpan.className = "bubble-meta";
    if (cv.isParsing) {
      metaSpan.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Parsing...`;
    } else {
      metaSpan.textContent = `${(cv.experience || []).length} exp | ${(cv.skills || []).length} skills`;
    }

    const delBtn = document.createElement("button");
    delBtn.className = "delete-bubble-btn";
    delBtn.innerHTML = "×";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      submittedCvData.splice(idx, 1);
      renderSubmittedCvBubbles(submittedCvData);
      saveSubmittedCvs(submittedCvData);
      updateGenerateButton(submittedCvData);
    };

    bubble.appendChild(checkbox);
    bubble.appendChild(nameSpan);
    bubble.appendChild(metaSpan);
    bubble.appendChild(delBtn);
    bubble.onclick = () => openCvModal(submittedCvData, idx);
    container.appendChild(bubble);
  });
}

// ---------------------------------------------------------------------------
// Main bootstrap
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  let chatHistory = []; 
  
  const persistedRules = loadUserRules();
  const savedLang = loadLanguagePreference();

  if (persistedRules && persistedRules.length > 0) {
      userRules = persistedRules;
  } else {
      userRules = [...getDefaultRules(savedLang)];
  }
  
  initializeRulesUI(userRules);
  initializeLanguage();
  clearChatHistoryDom(); 
  
  await loadCertificateCatalog();
  await loadTrainingCoursesCatalog();

  if (isPersistenceEnabled()) {
    chatHistory = loadChatHistory();
    lastRecommendations = loadLastRecommendations() || { candidates: [] };
    if (chatHistory.length > 0) {
      chatHistory.forEach(msg => addMessage(msg.text, msg.isUser));
    }
    if (lastRecommendations?.candidates?.length > 0) {
      const recContainer = document.getElementById("recommendations-container");
      const resSection = document.getElementById("results-section");
      displayRecommendations(lastRecommendations, recContainer, resSection, currentLang);
      updateDownloadButtonVisibility(lastRecommendations);
    }
  }

  const savedCvs = loadSubmittedCvs();
  if (savedCvs && savedCvs.length > 0) {
    submittedCvData = savedCvs;
    renderSubmittedCvBubbles(submittedCvData);
    updateGenerateButton(submittedCvData);
  }
  
  const fileInput = document.getElementById("file-input");
  const cvUploadArea = document.getElementById("cv-upload-area");
  const uploadStatus = document.getElementById("upload-status");
  const generateBtn = document.getElementById("generate-recommendations-btn");

  // File Processing
  async function runFastFileProcessing() {
    if (!fileInput.files.length) return;
    const files = Array.from(fileInput.files);
    showLoading(uploadStatus, "extracting");

    try {
      const extracted = await Promise.all(files.map(async (file) => {
        const rawText = await extractTextFromFile(file);
        return { 
          name: file.name, 
          text: rawText, 
          isParsing: true, 
          selected: true,
          experience: [],
          education: [],
          certifications: [],
          skills: []
        };
      }));

      upsertAndRenderSubmittedCvs(extracted);
      saveSubmittedCvs(submittedCvData);
      updateStatus(uploadStatus, "success");
      updateGenerateButton(submittedCvData);

      // Start background parsing
      extracted.forEach(async (cvRef) => {
        try {
          const structured = await parseCvIntoStructuredSections(cvRef.text);
          if (structured) {
            // MAP DATA TO TOP LEVEL SO UI CAN SEE IT
            cvRef.experience = structured.experience || [];
            cvRef.education = structured.education || [];
            cvRef.certifications = structured.certifications || [];
            // Normalize skills to objects for the modal
            cvRef.skills = (structured.skills || []).map(s => typeof s === 'string' ? { title: s } : s);
            cvRef.structured = structured;
          }
        } catch (err) {
          console.error(`Failed to parse CV ${cvRef.name}:`, err);
        } finally {
          cvRef.isParsing = false;
          renderSubmittedCvBubbles(submittedCvData);
          saveSubmittedCvs(submittedCvData);
        }
      });
    } catch (err) {
      console.error("Fast processing error:", err);
      updateStatus(uploadStatus, "error", true);
    }
  }

  if (fileInput) fileInput.addEventListener("change", runFastFileProcessing);
  if (cvUploadArea) cvUploadArea.addEventListener("click", () => fileInput.click());

  // Generate Logic
  if (generateBtn) {
    generateBtn.onclick = async () => {
      abortController = new AbortController();
      isGenerating = true;
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<div class="loader"></div>';
      
      const recContainer = document.getElementById("recommendations-container");
      const resSection = document.getElementById("results-section");
      recContainer.innerHTML = "";
      resSection.classList.remove("hidden");
      
      const rules = getRulesFromUI();
      const cvArray = submittedCvData.filter(cv => cv.selected);
      
      try {
        allRecommendationsMap = {};
        for (const cv of cvArray) {
          const placeholder = document.createElement("div");
          placeholder.className = "candidate-result";
          placeholder.innerHTML = `<h3>${cv.name}</h3><div class="loader"></div>`;
          recContainer.appendChild(placeholder);
          
          const result = await analyzeSingleCvWithAI(cv, rules, currentLang, 3, abortController.signal);
          const resultCard = createCandidateCard(result, currentLang);
          recContainer.replaceChild(resultCard, placeholder);
          
          allRecommendationsMap[cv.name] = result;
          lastRecommendations = { candidates: Object.values(allRecommendationsMap) };
          saveLastRecommendations(lastRecommendations);
        }
      } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = getUiText('generateBtn');
        isGenerating = false;
        updateDownloadButtonVisibility(lastRecommendations);
      }
    };
  }

  // Modals
  document.getElementById("submitCvReview")?.addEventListener("click", () => {
    const activeTab = document.querySelector(".cv-tab.active");
    if (activeTab) {
        const name = activeTab.textContent;
        const cv = submittedCvData.find(c => c.name === name);
        if (cv) {
            const updated = readCvFromDom(cv);
            Object.assign(cv, updated);
            renderSubmittedCvBubbles(submittedCvData);
            saveSubmittedCvs(submittedCvData);
        }
    }
    document.getElementById("cvModal").style.display = "none";
  });
  
  document.getElementById("closeCvModalBtn")?.addEventListener("click", () => document.getElementById("cvModal").style.display = "none");
  document.getElementById("add-rule-btn")?.addEventListener("click", () => {
    const container = document.getElementById("rules-container");
    container.appendChild(createRuleInput());
    saveUserRules(getRulesFromUI());
  });
});
