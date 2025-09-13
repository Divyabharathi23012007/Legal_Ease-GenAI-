// Global variables
let currentDocument = '';
let analysisResults = {};
let documentType = '';
let confidence = 0;
let useRealAI = false;
let openaiApiKey = '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';

// AI Configuration
const AI_CONFIG = {
    openaiEndpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    maxTokens: 2000,
    temperature: 0.3
};

// Legal terms glossary
const legalGlossary = {
    'liability': 'Legal responsibility for damages or losses that may occur',
    'indemnify': 'To compensate someone for harm or loss they have suffered',
    'breach': 'Failure to fulfill a legal obligation or contract term',
    'jurisdiction': 'The legal authority of a court to hear and decide a case',
    'governing law': 'The law that applies to interpret and enforce a contract',
    'termination': 'The ending or cancellation of a contract or agreement',
    'intellectual property': 'Creations of the mind, such as inventions, literary works, designs, and symbols',
    'confidentiality': 'The obligation to keep information secret or private',
    'non-disclosure': 'Agreement not to reveal confidential information to third parties',
    'force majeure': 'Unforeseeable circumstances that prevent fulfilling a contract',
    'arbitration': 'Resolution of disputes outside of court by an impartial third party',
    'consideration': 'Something of value exchanged between parties in a contract',
    'warranty': 'A guarantee or assurance about the quality or performance of something',
    'disclaimer': 'A statement that denies responsibility or liability',
    'covenant': 'A formal agreement or promise in a contract',
    'remedy': 'A legal solution or compensation for a breach of contract',
    'statute of limitations': 'Time limit within which legal action must be taken',
    'due diligence': 'Reasonable investigation or care taken before entering an agreement'
};

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const textInput = document.getElementById('textInput');
const analyzeTextBtn = document.getElementById('analyzeTextBtn');
const analysisSection = document.getElementById('analysisSection');
const loadingIndicator = document.getElementById('loadingIndicator');
const results = document.getElementById('results');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');
const downloadBtn = document.getElementById('downloadBtn');
const newAnalysisBtn = document.getElementById('newAnalysisBtn');
const shareBtn = document.getElementById('shareBtn');
const configToggle = document.getElementById('configToggle');
const configContent = document.getElementById('configContent');
const useRealAICheckbox = document.getElementById('useRealAI');
const apiKeyInput = document.getElementById('apiKey');
const apiKeySection = document.getElementById('apiKeySection');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatMessages = document.getElementById('chatMessages');
const chatStatus = document.getElementById('chatStatus');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    // File upload events
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    
    // Text analysis
    analyzeTextBtn.addEventListener('click', analyzeText);
    
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Action buttons
    downloadBtn.addEventListener('click', downloadAnalysis);
    newAnalysisBtn.addEventListener('click', resetAnalysis);
    shareBtn.addEventListener('click', shareResults);
    
    // AI Configuration
    configToggle.addEventListener('click', toggleConfig);
    useRealAICheckbox.addEventListener('change', handleAIToggle);
    apiKeyInput.addEventListener('input', handleApiKeyInput);
    
    // Chatbot events
    sendChatBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // Suggestion buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-btn')) {
            const question = e.target.dataset.question;
            chatInput.value = question;
            sendChatMessage();
        }
    });
    
    // Load saved settings
    loadAISettings();
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// File processing
async function handleFile(file) {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.txt')) {
        alert('Please upload a supported file type: PDF, DOC, DOCX, or TXT');
        return;
    }
    
    try {
        let text = '';
        if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
            text = await readTextFile(file);
        } else if (file.type === 'application/pdf') {
            text = await extractPDFText(file);
        } else if (file.type === 'application/msword' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            text = await extractDocText(file);
        } else {
            // Fallback for unsupported formats
            text = await promptUserForText(file.name);
        }
        
        if (text.trim()) {
            currentDocument = text;
            textInput.value = text.substring(0, 1000) + (text.length > 1000 ? '...' : '');
            await performAnalysis(text);
        }
    } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing file. Please try again or paste the text manually.');
    }
}

function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const text = e.target.result;
            if (text.trim().length < 10) {
                reject(new Error('File appears to be empty or too short'));
            } else {
                resolve(text);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Extract text from PDF files using PDF.js
async function extractPDFText(file) {
    try {
        // Load PDF.js library dynamically if not already loaded
        if (typeof pdfjsLib === 'undefined') {
            await loadPDFJS();
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) { // Limit to first 10 pages
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        
        if (fullText.trim().length < 50) {
            throw new Error('Could not extract sufficient text from PDF');
        }
        
        return fullText;
    } catch (error) {
        console.error('PDF extraction failed:', error);
        return await promptUserForText(file.name);
    }
}

// Extract text from DOC/DOCX files using mammoth.js
async function extractDocText(file) {
    try {
        // Load mammoth.js library dynamically if not already loaded
        if (typeof mammoth === 'undefined') {
            await loadMammothJS();
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        if (result.value.trim().length < 50) {
            throw new Error('Could not extract sufficient text from document');
        }
        
        return result.value;
    } catch (error) {
        console.error('DOC extraction failed:', error);
        return await promptUserForText(file.name);
    }
}

// Load PDF.js library dynamically
async function loadPDFJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Load mammoth.js library dynamically
async function loadMammothJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Prompt user to manually paste text when automatic extraction fails
async function promptUserForText(filename) {
    const userText = prompt(
        `Unable to automatically extract text from "${filename}".\n\n` +
        `Please copy and paste the text content from your document below:`,
        ''
    );
    
    if (!userText || userText.trim().length < 10) {
        throw new Error('No text provided by user');
    }
    
    return userText;
}

// Text analysis
async function analyzeText() {
    const text = textInput.value.trim();
    if (!text) {
        alert('Please enter some text to analyze');
        return;
    }
    
    currentDocument = text;
    await performAnalysis(text);
}

// Main analysis function
async function performAnalysis(text) {
    showAnalysisSection();
    showLoading();
    
    try {
        // Simulate progressive analysis with steps
        await simulateProgressiveAnalysis();
        
        // Detect document type and confidence
        const typeResult = detectDocumentTypeWithConfidence(text);
        documentType = typeResult.type;
        confidence = typeResult.confidence;
        
        // Generate analysis results
        analysisResults = await generateAnalysis(text);
        
        // Generate risk assessment
        const riskData = generateRiskAssessment(text);
        analysisResults.riskData = riskData;
        
        // Display results
        displayResults();
        hideLoading();
        
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Error analyzing document. Please try again.');
        hideLoading();
    }
}

// Simulate progressive analysis with animated progress
async function simulateProgressiveAnalysis() {
    const steps = [
        { id: 'step1', progress: 25, delay: 800 },
        { id: 'step2', progress: 50, delay: 1000 },
        { id: 'step3', progress: 75, delay: 1200 },
        { id: 'step4', progress: 100, delay: 800 }
    ];
    
    for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        updateProgress(step.progress);
        updateStepStatus(step.id, 'active');
        
        if (step.progress < 100) {
            await new Promise(resolve => setTimeout(resolve, 200));
            updateStepStatus(step.id, 'completed');
        }
    }
}

function updateProgress(percentage) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = percentage + '%';
}

function updateStepStatus(stepId, status) {
    const step = document.getElementById(stepId);
    step.classList.remove('active', 'completed');
    step.classList.add(status);
}

// AI Analysis - Real AI or Simulation
async function generateAnalysis(text) {
    if (useRealAI && openaiApiKey) {
        return await generateRealAIAnalysis(text);
    } else {
        return await generateSimulatedAnalysis(text);
    }
}

// Real AI Analysis using OpenAI API
async function generateRealAIAnalysis(text) {
    try {
        const analyses = await Promise.all([
            callOpenAI(createSummaryPrompt(text)),
            callOpenAI(createSimplifiedPrompt(text)),
            callOpenAI(createKeyPointsPrompt(text)),
            callOpenAI(createRisksPrompt(text))
        ]);
        
        return {
            summary: analyses[0],
            simplified: analyses[1],
            keypoints: analyses[2],
            risks: analyses[3]
        };
    } catch (error) {
        console.error('Real AI analysis failed, falling back to simulation:', error);
        return await generateSimulatedAnalysis(text);
    }
}

// OpenAI API Call
async function callOpenAI(prompt) {
    if (!openaiApiKey || openaiApiKey.trim() === '') {
        throw new Error('OpenAI API key is required');
    }

    try {
        const response = await fetch(AI_CONFIG.openaiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: AI_CONFIG.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: AI_CONFIG.maxTokens,
                temperature: AI_CONFIG.temperature
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(`OpenAI API error: ${errorMessage}`);
        }
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response format from OpenAI API');
        }
        
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API call failed:', error);
        throw error;
    }
}

// AI Prompts for different analysis types
function createSummaryPrompt(text) {
    return `As a legal expert, provide a comprehensive summary of this legal document. Include:
1. Document type and purpose
2. Key parties involved
3. Main sections and their purposes
4. Overall complexity level
5. Word count: approximately ${text.split(' ').length} words

Document text:
${text.substring(0, 3000)}...`;
}

function createSimplifiedPrompt(text) {
    return `Translate this legal document into plain English that a non-lawyer can understand. Use simple language, bullet points, and clear explanations. Highlight important obligations and rights in an easy-to-understand format.

Document text:
${text.substring(0, 3000)}...`;
}

function createKeyPointsPrompt(text) {
    return `Extract and list the most important key points from this legal document. Focus on:
1. Main obligations for each party
2. Important rights and restrictions
3. Critical deadlines or conditions
4. Financial implications
5. Termination conditions

Document text:
${text.substring(0, 3000)}...`;
}

function createRisksPrompt(text) {
    return `Analyze this legal document for potential risks and obligations. Identify:
1. Potential legal risks for the user
2. Financial liabilities
3. Compliance requirements
4. Termination risks
5. Recommended protective measures

Document text:
${text.substring(0, 3000)}...`;
}

// Simulated AI Analysis (fallback)
async function generateSimulatedAnalysis(text) {
    const wordCount = text.split(' ').length;
    const hasTermination = text.toLowerCase().includes('terminat');
    const hasLiability = text.toLowerCase().includes('liabilit');
    const hasIntellectualProperty = text.toLowerCase().includes('intellectual property') || text.toLowerCase().includes('copyright');
    
    return {
        summary: generateSummary(text, wordCount),
        simplified: generateSimplified(text),
        keypoints: generateKeyPoints(text, hasTermination, hasLiability, hasIntellectualProperty),
        risks: generateRisksAndObligations(text, hasTermination, hasLiability)
    };
}

function generateSummary(text, wordCount) {
    const docType = detectDocumentType(text);
    const lower = text.toLowerCase();
    
    // Extract key themes from the actual document
    const themes = [];
    if (lower.includes('payment') || lower.includes('fee') || lower.includes('cost')) themes.push('Financial Terms');
    if (lower.includes('termination') || lower.includes('cancel')) themes.push('Termination Clauses');
    if (lower.includes('liability') || lower.includes('damages')) themes.push('Liability Provisions');
    if (lower.includes('confidential') || lower.includes('non-disclosure')) themes.push('Confidentiality');
    if (lower.includes('intellectual property') || lower.includes('copyright')) themes.push('Intellectual Property');
    if (lower.includes('dispute') || lower.includes('arbitration')) themes.push('Dispute Resolution');
    
    // Determine complexity based on document characteristics
    let complexity = 'Low';
    const legalTerms = ['whereas', 'heretofore', 'pursuant', 'notwithstanding', 'indemnify'];
    const legalTermCount = legalTerms.filter(term => lower.includes(term)).length;
    
    if (wordCount > 2000 || legalTermCount > 2) complexity = 'High';
    else if (wordCount > 1000 || legalTermCount > 0) complexity = 'Medium';
    
    return `
        <h4>Document Overview</h4>
        <p>This legal document contains approximately <strong>${wordCount} words</strong> and appears to be a <strong>${docType}</strong>.</p>
        
        <h4>Main Purpose</h4>
        <p>${generatePurposeFromContent(text, docType)}</p>
        
        <h4>Key Sections Identified</h4>
        <ul>
            ${themes.map(theme => `<li><strong>${theme}:</strong> Present in this document</li>`).join('')}
            ${themes.length === 0 ? '<li><strong>General Legal Terms:</strong> Standard legal provisions and obligations</li>' : ''}
        </ul>
        
        <h4>Complexity Level</h4>
        <p><span class="${complexity === 'High' ? 'critical' : complexity === 'Medium' ? 'warning' : 'positive'}">${complexity} Complexity</span> - ${getComplexityDescription(complexity)}</p>
    `;
}

function generatePurposeFromContent(text, docType) {
    const lower = text.toLowerCase();
    
    if (docType.includes('Employment')) {
        return 'This document establishes the employment relationship, including job responsibilities, compensation, and workplace policies.';
    } else if (docType.includes('Privacy')) {
        return 'This document explains how personal information is collected, used, stored, and protected.';
    } else if (docType.includes('Lease')) {
        return 'This document establishes the rental agreement between landlord and tenant, including terms, conditions, and responsibilities.';
    } else if (docType.includes('Purchase')) {
        return 'This document outlines the terms and conditions for the purchase or sale of goods or services.';
    } else if (docType.includes('Non-Disclosure')) {
        return 'This document establishes confidentiality obligations and restrictions on sharing sensitive information.';
    } else if (lower.includes('service')) {
        return 'This document establishes the terms for using a service, including user obligations and provider responsibilities.';
    } else {
        return 'This document establishes legal relationships and obligations between the parties involved.';
    }
}

function getComplexityDescription(complexity) {
    switch(complexity) {
        case 'High': return 'Contains complex legal language that likely requires professional legal review.';
        case 'Medium': return 'Contains standard legal language that may require clarification for general users.';
        default: return 'Written in relatively straightforward language with minimal legal jargon.';
    }
}

function generateSimplified(text) {
    const lower = text.toLowerCase();
    const docType = detectDocumentType(text);
    
    // Extract actual content themes
    const restrictions = extractRestrictions(text);
    const obligations = extractObligations(text);
    const rights = extractRights(text);
    
    return `
        <h4>What This Document Means in Plain English</h4>
        
        <div style="background: #e6fffa; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="color: #234e52;">🤝 The Basic Agreement</h4>
            <p>${getBasicAgreementText(docType, text)}</p>
        </div>
        
        ${restrictions.length > 0 ? `
        <div style="background: #fff5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="color: #742a2a;">⚠️ What You Can't Do</h4>
            <ul>
                ${restrictions.map(restriction => `<li>${restriction}</li>`).join('')}
            </ul>
        </div>` : ''}
        
        ${rights.length > 0 ? `
        <div style="background: #f0fff4; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="color: #22543d;">✅ What You Should Know</h4>
            <ul>
                ${rights.map(right => `<li>${right}</li>`).join('')}
            </ul>
        </div>` : ''}
        
        ${obligations.length > 0 ? `
        <div style="background: #fef5e7; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="color: #744210;">📋 Your Responsibilities</h4>
            <ul>
                ${obligations.map(obligation => `<li>${obligation}</li>`).join('')}
            </ul>
        </div>` : ''}
        
        <p><strong>Bottom Line:</strong> ${getBottomLineText(docType, text)}</p>
    `;
}

function getBasicAgreementText(docType, text) {
    if (docType.includes('Employment')) {
        return 'This is an employment contract that defines your job, pay, benefits, and workplace rules.';
    } else if (docType.includes('Privacy')) {
        return 'This explains how your personal information will be handled and what rights you have regarding your data.';
    } else if (docType.includes('Lease')) {
        return 'This is a rental agreement that sets the rules for living in or using the property.';
    } else if (docType.includes('Purchase')) {
        return 'This is a purchase agreement that outlines what you\'re buying and the terms of the sale.';
    } else if (docType.includes('Non-Disclosure')) {
        return 'This is a confidentiality agreement that requires you to keep certain information secret.';
    } else {
        return 'This is a legal agreement that creates binding obligations between the parties involved.';
    }
}

function extractRestrictions(text) {
    const lower = text.toLowerCase();
    const restrictions = [];
    
    if (lower.includes('not permitted') || lower.includes('prohibited') || lower.includes('shall not')) {
        if (lower.includes('illegal') || lower.includes('unlawful')) restrictions.push('Engage in any illegal or unlawful activities');
        if (lower.includes('spam') || lower.includes('unsolicited')) restrictions.push('Send spam or unsolicited communications');
        if (lower.includes('impersonate') || lower.includes('misrepresent')) restrictions.push('Impersonate others or misrepresent your identity');
        if (lower.includes('interfere') || lower.includes('disrupt')) restrictions.push('Interfere with or disrupt the service');
        if (lower.includes('reverse engineer') || lower.includes('decompile')) restrictions.push('Reverse engineer or attempt to extract source code');
    }
    
    // If no specific restrictions found, extract from context
    if (restrictions.length === 0 && (lower.includes('agree not to') || lower.includes('you may not'))) {
        restrictions.push('Violate the terms and conditions outlined in this document');
        restrictions.push('Use the service in ways that could cause harm or damage');
    }
    
    return restrictions;
}

function extractObligations(text) {
    const lower = text.toLowerCase();
    const obligations = [];
    
    if (lower.includes('you must') || lower.includes('you shall') || lower.includes('required to')) {
        if (lower.includes('accurate') || lower.includes('truthful')) obligations.push('Provide accurate and truthful information');
        if (lower.includes('comply') || lower.includes('follow')) obligations.push('Comply with all applicable laws and regulations');
        if (lower.includes('maintain') || lower.includes('keep')) obligations.push('Maintain the confidentiality of sensitive information');
        if (lower.includes('notify') || lower.includes('inform')) obligations.push('Notify relevant parties of any changes or issues');
    }
    
    return obligations;
}

function extractRights(text) {
    const lower = text.toLowerCase();
    const rights = [];
    
    if (lower.includes('you have the right') || lower.includes('entitled to') || lower.includes('may')) {
        if (lower.includes('access') || lower.includes('use')) rights.push('Access and use the service as outlined in this agreement');
        if (lower.includes('terminate') || lower.includes('cancel')) rights.push('Terminate or cancel this agreement under specified conditions');
        if (lower.includes('data') || lower.includes('information')) rights.push('Request information about how your data is being used');
    }
    
    // Default rights based on document type
    if (rights.length === 0) {
        rights.push('Receive the services or benefits outlined in this document');
        rights.push('Expect the other party to fulfill their obligations');
    }
    
    return rights;
}

function getBottomLineText(docType, text) {
    const lower = text.toLowerCase();
    
    if (docType.includes('Employment')) {
        return 'Understand your job responsibilities, follow company policies, and know your rights as an employee.';
    } else if (docType.includes('Privacy')) {
        return 'Know how your personal information is used and what control you have over it.';
    } else if (docType.includes('Lease')) {
        return 'Pay rent on time, take care of the property, and follow the rules to avoid problems.';
    } else if (lower.includes('payment') || lower.includes('fee')) {
        return 'Understand all costs involved and make sure you can meet the financial obligations.';
    } else {
        return 'Read carefully, understand your obligations, and make sure you can comply with all terms.';
    }
}

function generateKeyPoints(text, hasTermination, hasLiability, hasIntellectualProperty) {
    const lower = text.toLowerCase();
    const docType = detectDocumentType(text);
    const points = [];
    
    // Extract actual key points from the document
    if (lower.includes('payment') || lower.includes('fee') || lower.includes('cost')) {
        points.push('<span class="warning">Financial Obligations:</span> This document includes payment terms and financial responsibilities.');
    }
    
    if (lower.includes('deadline') || lower.includes('due date') || lower.includes('within')) {
        points.push('<span class="critical">Time Limits:</span> There are specific deadlines and time requirements you must meet.');
    }
    
    if (hasTermination) {
        points.push('<span class="highlight">Termination Rights:</span> The agreement can be terminated under specific conditions outlined in the document.');
    }
    
    if (hasLiability) {
        points.push('<span class="highlight">Liability Provisions:</span> There are limitations on responsibility for damages or losses.');
    }
    
    if (hasIntellectualProperty) {
        points.push('<span class="positive">Intellectual Property:</span> Ownership and usage rights for intellectual property are defined.');
    }
    
    if (lower.includes('confidential') || lower.includes('non-disclosure')) {
        points.push('<span class="warning">Confidentiality:</span> You have obligations to keep certain information confidential.');
    }
    
    if (lower.includes('dispute') || lower.includes('arbitration') || lower.includes('court')) {
        points.push('<span class="highlight">Dispute Resolution:</span> Specific procedures are outlined for handling disagreements.');
    }
    
    if (lower.includes('governing law') || lower.includes('jurisdiction')) {
        points.push('<span class="positive">Legal Framework:</span> This agreement is governed by specific laws and jurisdictions.');
    }
    
    // Add default points if none found
    if (points.length === 0) {
        points.push('<span class="positive">Legal Agreement:</span> This document creates binding legal obligations.');
        points.push('<span class="highlight">Compliance Required:</span> You must follow all terms and conditions outlined.');
    }
    
    // Generate action items based on document type
    const actionItems = generateActionItems(docType, text);
    
    return `
        <h4>Most Important Things to Remember</h4>
        <ul>
            ${points.map(point => `<li>${point}</li>`).join('')}
        </ul>
        
        <h4>Action Items for You</h4>
        <ul>
            ${actionItems.map(item => `<li>${item}</li>`).join('')}
        </ul>
    `;
}

function generateActionItems(docType, text) {
    const lower = text.toLowerCase();
    const items = [];
    
    if (docType.includes('Employment')) {
        items.push('Review your job responsibilities and performance expectations');
        items.push('Understand your compensation and benefits package');
        items.push('Familiarize yourself with company policies and procedures');
    } else if (docType.includes('Privacy')) {
        items.push('Understand what personal data is being collected');
        items.push('Know your rights regarding data access and deletion');
        items.push('Review privacy settings and opt-out options');
    } else if (docType.includes('Lease')) {
        items.push('Note all payment due dates and amounts');
        items.push('Understand maintenance and repair responsibilities');
        items.push('Review move-in and move-out procedures');
    } else {
        items.push('Read through all terms and conditions carefully');
        items.push('Identify any deadlines or time-sensitive requirements');
        items.push('Keep a copy of this document for your records');
        items.push('Consult legal counsel if you have questions about complex terms');
    }
    
    return items;
}

function generateRisksAndObligations(text, hasTermination, hasLiability) {
    const lower = text.toLowerCase();
    const docType = detectDocumentType(text);
    
    const risks = extractRisks(text, docType);
    const obligations = extractDetailedObligations(text, docType);
    const protections = generateProtectiveMeasures(docType, text);
    const redFlags = identifyRedFlags(text, docType);
    
    return `
        <h4>⚠️ Potential Risks for You</h4>
        <ul>
            ${risks.map(risk => `<li>${risk}</li>`).join('')}
        </ul>
        
        <h4>📋 Your Key Obligations</h4>
        <ul>
            ${obligations.map(obligation => `<li>${obligation}</li>`).join('')}
        </ul>
        
        <h4>🛡️ Protective Measures You Should Take</h4>
        <ul>
            ${protections.map(protection => `<li>${protection}</li>`).join('')}
        </ul>
        
        <div style="background: #fed7d7; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4 style="color: #742a2a;">🚨 Red Flags to Watch For</h4>
            <p>${redFlags}</p>
        </div>
    `;
}

function extractRisks(text, docType) {
    const lower = text.toLowerCase();
    const risks = [];
    
    // Check for termination clauses
    const hasTermination = lower.includes('terminat') || lower.includes('cancel') || lower.includes('end this agreement');
    const hasLiability = lower.includes('liabilit') || lower.includes('damages') || lower.includes('limitation of liability');
    
    if (hasTermination) {
        risks.push('<span class="critical">Termination Risk:</span> The agreement can be ended, potentially affecting your access or benefits');
    }
    
    if (lower.includes('penalty') || lower.includes('fine') || lower.includes('damages')) {
        risks.push('<span class="critical">Financial Penalties:</span> You may face financial consequences for violations');
    }
    
    if (hasLiability) {
        risks.push('<span class="highlight">Limited Recourse:</span> Your ability to seek compensation may be restricted');
    }
    
    if (lower.includes('personal') || lower.includes('data') || lower.includes('information')) {
        risks.push('<span class="warning">Privacy Risk:</span> Your personal information may be collected and used');
    }
    
    if (lower.includes('automatic renewal') || lower.includes('auto-renew')) {
        risks.push('<span class="warning">Automatic Renewal:</span> The agreement may renew automatically unless cancelled');
    }
    
    // Default risks if none found
    if (risks.length === 0) {
        risks.push('<span class="highlight">Legal Compliance:</span> You\'re responsible for following all terms and applicable laws');
        risks.push('<span class="highlight">Binding Obligations:</span> This creates legally enforceable commitments');
    }
    
    return risks;
}

function extractDetailedObligations(text, docType) {
    const lower = text.toLowerCase();
    const obligations = [];
    
    if (lower.includes('payment') || lower.includes('fee')) {
        obligations.push('<strong>Payment Obligations:</strong> Make all required payments on time');
    }
    
    if (lower.includes('confidential') || lower.includes('non-disclosure')) {
        obligations.push('<strong>Confidentiality:</strong> Keep sensitive information private and secure');
    }
    
    if (lower.includes('accurate') || lower.includes('truthful')) {
        obligations.push('<strong>Accurate Information:</strong> Provide truthful and up-to-date information');
    }
    
    if (lower.includes('comply') || lower.includes('follow')) {
        obligations.push('<strong>Compliance:</strong> Follow all applicable laws and regulations');
    }
    
    if (lower.includes('maintain') || lower.includes('preserve')) {
        obligations.push('<strong>Maintenance:</strong> Maintain required standards or conditions');
    }
    
    // Default obligations
    if (obligations.length === 0) {
        obligations.push('<strong>General Compliance:</strong> Follow all terms and conditions outlined in this document');
        obligations.push('<strong>Legal Responsibility:</strong> Ensure your actions comply with applicable laws');
    }
    
    return obligations;
}

function generateProtectiveMeasures(docType, text) {
    const measures = [
        'Read and understand all terms before signing or agreeing',
        'Keep copies of all documents and communications',
        'Note all important dates, deadlines, and renewal periods'
    ];
    
    if (docType.includes('Employment')) {
        measures.push('Document your work performance and any workplace issues');
        measures.push('Understand your benefits and how to access them');
    } else if (docType.includes('Privacy')) {
        measures.push('Review privacy settings and opt-out options regularly');
        measures.push('Monitor how your data is being used');
    } else if (docType.includes('Lease')) {
        measures.push('Document the condition of the property with photos');
        measures.push('Keep records of all maintenance requests and communications');
    }
    
    measures.push('Consult legal counsel for complex or high-value agreements');
    
    return measures;
}

function identifyRedFlags(text, docType) {
    const lower = text.toLowerCase();
    const flags = [];
    
    if (lower.includes('unlimited liability') || lower.includes('no limitation')) {
        flags.push('unlimited liability exposure');
    }
    
    if (lower.includes('automatic renewal') && !lower.includes('cancel')) {
        flags.push('automatic renewal without clear cancellation terms');
    }
    
    if (lower.includes('sole discretion') || lower.includes('absolute discretion')) {
        flags.push('broad discretionary powers given to the other party');
    }
    
    if (lower.includes('waive') || lower.includes('waiver')) {
        flags.push('waiver of important legal rights');
    }
    
    if (flags.length > 0) {
        return `This document contains potentially concerning provisions including: ${flags.join(', ')}. Consider whether these terms are acceptable for your situation.`;
    } else {
        return 'Review this document carefully for any terms that seem unusually favorable to one party or that limit your rights significantly.';
    }
}

function detectDocumentType(text) {
    const lower = text.toLowerCase();
    if (lower.includes('terms of service') || lower.includes('terms of use')) return 'Terms of Service Agreement';
    if (lower.includes('privacy policy')) return 'Privacy Policy';
    if (lower.includes('employment') || lower.includes('employee')) return 'Employment Agreement';
    if (lower.includes('lease') || lower.includes('rental')) return 'Lease Agreement';
    if (lower.includes('purchase') || lower.includes('sale')) return 'Purchase Agreement';
    if (lower.includes('license')) return 'License Agreement';
    return 'Legal Agreement';
}

// Enhanced document type detection with confidence scoring
function detectDocumentTypeWithConfidence(text) {
    const lower = text.toLowerCase();
    const patterns = [
        { type: 'Terms of Service Agreement', keywords: ['terms of service', 'terms of use', 'user agreement'], icon: 'fas fa-file-contract' },
        { type: 'Privacy Policy', keywords: ['privacy policy', 'data protection', 'personal information'], icon: 'fas fa-shield-alt' },
        { type: 'Employment Agreement', keywords: ['employment', 'employee', 'employer', 'job', 'salary'], icon: 'fas fa-briefcase' },
        { type: 'Non-Disclosure Agreement', keywords: ['non-disclosure', 'confidential', 'nda', 'confidentiality'], icon: 'fas fa-eye-slash' },
        { type: 'Lease Agreement', keywords: ['lease', 'rental', 'tenant', 'landlord', 'rent'], icon: 'fas fa-home' },
        { type: 'Purchase Agreement', keywords: ['purchase', 'sale', 'buy', 'seller', 'buyer'], icon: 'fas fa-shopping-cart' },
        { type: 'License Agreement', keywords: ['license', 'licensing', 'intellectual property'], icon: 'fas fa-certificate' },
        { type: 'Service Agreement', keywords: ['service', 'provider', 'client', 'deliverables'], icon: 'fas fa-handshake' }
    ];
    
    let bestMatch = { type: 'Legal Agreement', confidence: 0.3, icon: 'fas fa-file-alt' };
    
    for (const pattern of patterns) {
        let score = 0;
        for (const keyword of pattern.keywords) {
            const matches = (lower.match(new RegExp(keyword, 'g')) || []).length;
            score += matches * 0.2;
        }
        
        const confidence = Math.min(0.95, 0.4 + score);
        if (confidence > bestMatch.confidence) {
            bestMatch = { type: pattern.type, confidence, icon: pattern.icon };
        }
    }
    
    return bestMatch;
}

// UI Functions
function showAnalysisSection() {
    analysisSection.style.display = 'block';
    analysisSection.scrollIntoView({ behavior: 'smooth' });
}

function showLoading() {
    loadingIndicator.style.display = 'block';
    results.style.display = 'none';
}

function hideLoading() {
    loadingIndicator.style.display = 'none';
    results.style.display = 'block';
}

function displayResults() {
    // Display document type and confidence
    displayDocumentInfo();
    
    // Add tooltips to legal terms and display content
    document.getElementById('summaryContent').innerHTML = addLegalTooltips(analysisResults.summary);
    document.getElementById('simplifiedContent').innerHTML = addLegalTooltips(analysisResults.simplified);
    document.getElementById('keypointsContent').innerHTML = addLegalTooltips(analysisResults.keypoints);
    document.getElementById('risksContent').innerHTML = addLegalTooltips(analysisResults.risks);
    
    // Add animations to content
    document.querySelectorAll('.tab-panel').forEach((panel, index) => {
        panel.classList.add('animate-fade-in');
        panel.style.animationDelay = `${index * 0.1}s`;
    });
}

function displayDocumentInfo() {
    const typeResult = detectDocumentTypeWithConfidence(currentDocument);
    const documentInfo = document.getElementById('documentInfo');
    
    documentInfo.innerHTML = `
        <div class="document-type-badge animate-slide-in">
            <i class="${typeResult.icon}"></i>
            <span>${typeResult.type}</span>
        </div>
        
        <div class="confidence-indicator animate-fade-in">
            <span><strong>Detection Confidence:</strong></span>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${typeResult.confidence * 100}%"></div>
            </div>
            <span>${Math.round(typeResult.confidence * 100)}%</span>
        </div>
    `;
}

// Add interactive tooltips to legal terms
function addLegalTooltips(content) {
    let processedContent = content;
    
    for (const [term, definition] of Object.entries(legalGlossary)) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        processedContent = processedContent.replace(regex, (match) => {
            return `<span class="tooltip legal-term">${match}<span class="tooltiptext"><strong>${term.toUpperCase()}</strong><br>${definition}</span></span>`;
        });
    }
    
    return processedContent;
}

function switchTab(tabName) {
    // Update tab buttons
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab panels
    tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === tabName);
    });
}

function downloadAnalysis() {
    if (!analysisResults || !currentDocument) {
        alert('No analysis available to download');
        return;
    }
    
    // Show download options
    const format = prompt('Choose download format:\n1. Text (.txt)\n2. PDF (.pdf)\n\nEnter 1 or 2:', '2');
    
    if (format === '1') {
        downloadTextReport();
    } else if (format === '2') {
        downloadPDFReport();
    }
}

function downloadTextReport() {
    const analysisText = `
LEGAL DOCUMENT ANALYSIS REPORT
Generated by LegalEase AI
Date: ${new Date().toLocaleDateString()}

========================================
DOCUMENT INFORMATION
========================================
Document Type: ${documentType}
Confidence Level: ${Math.round(confidence * 100)}%
Document Length: ${currentDocument.length} characters

========================================
DOCUMENT SUMMARY
========================================
${stripHtml(analysisResults.summary)}

========================================
SIMPLIFIED EXPLANATION
========================================
${stripHtml(analysisResults.simplified)}

========================================
KEY POINTS
========================================
${stripHtml(analysisResults.keypoints)}

========================================
RISKS & OBLIGATIONS
========================================
${stripHtml(analysisResults.risks)}

========================================
DISCLAIMER
========================================
This analysis is generated by AI for informational purposes only. 
Always consult with a qualified legal professional for legal advice.

Analysis generated: ${new Date().toLocaleString()}
    `;
    
    const blob = new Blob([analysisText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legal-analysis-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadPDFReport() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // PDF styling
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const lineHeight = 7;
        let yPosition = 30;
        
        // Title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('LegalEase AI Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 20;
        
        // Document info
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Document Type: ${documentType}`, margin, yPosition);
        yPosition += lineHeight;
        doc.text(`Confidence: ${Math.round(confidence * 100)}%`, margin, yPosition);
        yPosition += lineHeight;
        doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
        yPosition += 15;
        
        // Add sections
        const sections = [
            { title: 'DOCUMENT SUMMARY', content: stripHtml(analysisResults.summary) },
            { title: 'SIMPLIFIED EXPLANATION', content: stripHtml(analysisResults.simplified) },
            { title: 'KEY POINTS', content: stripHtml(analysisResults.keypoints) },
            { title: 'RISKS & OBLIGATIONS', content: stripHtml(analysisResults.risks) }
        ];
        
        sections.forEach(section => {
            // Section title
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(section.title, margin, yPosition);
            yPosition += 10;
            
            // Section content
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            const lines = doc.splitTextToSize(section.content, pageWidth - 2 * margin);
            
            lines.forEach(line => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(line, margin, yPosition);
                yPosition += 5;
            });
            
            yPosition += 10;
        });
        
        // Disclaimer
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        const disclaimer = 'DISCLAIMER: This analysis is generated by AI for informational purposes only. Always consult with a qualified legal professional for legal advice.';
        const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin);
        disclaimerLines.forEach(line => {
            doc.text(line, margin, yPosition);
            yPosition += 4;
        });
        
        doc.save(`legal-analysis-${Date.now()}.pdf`);
        
    } catch (error) {
        console.error('PDF generation error:', error);
        // Load jsPDF if not available and retry
        if (typeof window.jspdf === 'undefined') {
            loadJsPDF().then(() => {
                downloadPDFReport();
            }).catch(() => {
                alert('PDF generation failed. Downloading as text file instead.');
                downloadTextReport();
            });
        } else {
            alert('PDF generation failed. Downloading as text file instead.');
            downloadTextReport();
        }
    }
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function resetAnalysis() {
    currentDocument = '';
    analysisResults = {};
    documentType = '';
    confidence = 0;
    textInput.value = '';
    fileInput.value = '';
    analysisSection.style.display = 'none';
    
    // Reset progress indicators
    document.getElementById('progressBar').style.width = '0%';
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Reset to first tab
    switchTab('summary');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// AI Configuration Functions
function toggleConfig() {
    const isVisible = configContent.style.display !== 'none';
    configContent.style.display = isVisible ? 'none' : 'block';
}

function handleAIToggle() {
    useRealAI = useRealAICheckbox.checked;
    apiKeySection.style.display = useRealAI ? 'block' : 'none';
    saveAISettings();
}

function handleApiKeyInput() {
    openaiApiKey = apiKeyInput.value.trim();
    saveAISettings();
}

function saveAISettings() {
    localStorage.setItem('legalease_use_real_ai', useRealAI);
    if (openaiApiKey) {
        localStorage.setItem('legalease_api_key', openaiApiKey);
    }
}

function loadAISettings() {
    const savedUseRealAI = localStorage.getItem('legalease_use_real_ai') === 'true';
    const savedApiKey = localStorage.getItem('legalease_api_key') || '';
    
    useRealAI = savedUseRealAI;
    openaiApiKey = savedApiKey;
    
    useRealAICheckbox.checked = useRealAI;
    apiKeyInput.value = openaiApiKey;
    apiKeySection.style.display = useRealAI ? 'block' : 'none';
}

// Load jsPDF library dynamically
async function loadJsPDF() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Share Results Function
function shareResults() {
    if (!analysisResults || !currentDocument) {
        alert('No analysis available to share');
        return;
    }
    
    const shareText = `📋 Legal Document Analysis by LegalEase AI\n\n` +
        `📄 Document Type: ${documentType}\n` +
        `🎯 Confidence: ${Math.round(confidence * 100)}%\n\n` +
        `🔍 Key Insights:\n` +
        `${stripHtml(analysisResults.keypoints).substring(0, 200)}...\n\n` +
        `⚠️ Main Risks:\n` +
        `${stripHtml(analysisResults.risks).substring(0, 200)}...\n\n` +
        `Generated by LegalEase - AI-Powered Legal Document Demystifier`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Legal Document Analysis',
            text: shareText,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            alert('Analysis summary copied to clipboard!');
        }).catch(() => {
            // Final fallback: show in alert
            alert('Share Text:\n\n' + shareText);
        });
    }
}

// Chatbot Functions
async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message || !currentDocument) {
        if (!currentDocument) {
            showChatStatus('Please analyze a document first before asking questions.');
        }
        return;
    }
    
    // Check if real AI is enabled but no API key
    if (useRealAI && (!openaiApiKey || openaiApiKey.trim() === '')) {
        showChatStatus('Please enter your OpenAI API key in AI Settings to use real AI chat.');
        return;
    }
    
    // Add user message to chat
    addChatMessage(message, 'user');
    chatInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Generate AI response
        const response = await generateChatResponse(message);
        hideTypingIndicator();
        addChatMessage(response, 'bot');
    } catch (error) {
        hideTypingIndicator();
        
        // Handle different error types
        let errorMessage = 'Sorry, I encountered an error while processing your question.';
        
        if (error.message.includes('API key')) {
            errorMessage = 'Invalid API key. Please check your OpenAI API key in AI Settings.';
        } else if (error.message.includes('quota')) {
            errorMessage = 'API quota exceeded. Please check your OpenAI account billing.';
        } else if (error.message.includes('rate limit')) {
            errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (useRealAI) {
            errorMessage = 'OpenAI API error. Falling back to simulated responses.';
            // Fallback to simulated response
            try {
                const fallbackResponse = generateSimulatedChatResponse(message);
                addChatMessage(fallbackResponse, 'bot');
                return;
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
            }
        }
        
        addChatMessage(errorMessage, 'bot');
        console.error('Chat error:', error);
    }
}

function addChatMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.innerHTML = `<p>${message}</p>`;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot-message typing-indicator';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span>AI is thinking</span>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function showChatStatus(message) {
    chatStatus.textContent = message;
    setTimeout(() => {
        chatStatus.textContent = '';
    }, 3000);
}

async function generateChatResponse(question) {
    if (useRealAI && openaiApiKey) {
        return await generateRealChatResponse(question);
    } else {
        return generateSimulatedChatResponse(question);
    }
}

async function generateRealChatResponse(question) {
    const docType = detectDocumentType(currentDocument);
    const prompt = `You are an expert legal document assistant specializing in ${docType}. Based on the following legal document, answer the user's question in a clear, helpful, and specific way.

DOCUMENT TYPE: ${docType}
DOCUMENT CONTENT:
${currentDocument.substring(0, 4000)}${currentDocument.length > 4000 ? '\n\n[Document continues...]' : ''}

USER QUESTION: ${question}

INSTRUCTIONS:
1. Provide specific answers based on the actual document content
2. Quote relevant sections when possible
3. If information isn't in the document, clearly state that
4. Use plain English while being legally accurate
5. Highlight any important risks or obligations
6. Keep responses concise but comprehensive

RESPONSE:`;

    try {
        const response = await callOpenAI(prompt);
        return response;
    } catch (error) {
        console.error('Real AI chat failed, falling back to simulation:', error);
        throw error; // Let the calling function handle the fallback
    }
}

function generateSimulatedChatResponse(question) {
    const lower = question.toLowerCase();
    const docLower = currentDocument.toLowerCase();
    
    // Payment-related questions
    if (lower.includes('payment') || lower.includes('fee') || lower.includes('cost')) {
        if (docLower.includes('payment') || docLower.includes('fee')) {
            return 'Based on your document, there are payment obligations mentioned. Look for sections containing terms like "payment due," "fees," or "costs." The specific amounts and timing should be clearly stated in those sections.';
        }
        return 'I don\'t see specific payment terms mentioned in this document. You may want to look for sections about "fees," "costs," or "compensation."';
    }
    
    // Termination questions
    if (lower.includes('terminate') || lower.includes('cancel') || lower.includes('end')) {
        if (docLower.includes('terminat') || docLower.includes('cancel')) {
            return 'Your document contains termination clauses. Look for sections that mention "termination," "cancellation," or "ending the agreement." These sections typically outline the conditions and procedures for ending the contract.';
        }
        return 'I don\'t see explicit termination clauses in this document. However, most agreements have implied termination rights. Consider consulting with a legal professional about your options.';
    }
    
    // Obligation questions
    if (lower.includes('obligation') || lower.includes('responsibility') || lower.includes('must do')) {
        const obligations = [];
        if (docLower.includes('shall') || docLower.includes('must')) obligations.push('There are mandatory requirements using terms like "shall" or "must"');
        if (docLower.includes('comply')) obligations.push('Compliance obligations are mentioned');
        if (docLower.includes('maintain')) obligations.push('Maintenance requirements are specified');
        
        if (obligations.length > 0) {
            return `Based on your document, your main obligations include: ${obligations.join(', ')}. Look for sections containing these terms for specific details.`;
        }
        return 'Your main obligations should be outlined in sections using terms like "shall," "must," "required to," or "responsible for." Review these sections carefully.';
    }
    
    // Liability questions
    if (lower.includes('liable') || lower.includes('responsible') || lower.includes('damages')) {
        if (docLower.includes('liabilit') || docLower.includes('damages')) {
            return 'Your document contains liability provisions. Look for sections about "liability," "damages," or "limitations." These sections define your potential financial responsibility.';
        }
        return 'I don\'t see explicit liability clauses in this document. However, general legal principles may still apply. Consider consulting with a legal professional.';
    }
    
    // Breach questions
    if (lower.includes('breach') || lower.includes('violate') || lower.includes('break')) {
        if (docLower.includes('breach') || docLower.includes('default')) {
            return 'Your document mentions breach or default conditions. Look for sections that describe what constitutes a breach and the consequences. This typically includes remedies available to the other party.';
        }
        return 'While specific breach terms aren\'t clearly mentioned, violating any of the stated obligations could constitute a breach. Review all "shall" and "must" requirements carefully.';
    }
    
    // Rights questions
    if (lower.includes('rights') || lower.includes('entitled') || lower.includes('can I')) {
        return 'Your rights should be outlined in sections that mention what you "may," "can," or are "entitled to" do. Also look for sections about your benefits, protections, or remedies available to you.';
    }
    
    // Default response
    return `I understand you're asking about "${question}". Based on your document, I'd recommend looking for sections that contain relevant keywords. If you need more specific guidance, try rephrasing your question or consult with a legal professional for detailed advice.`;
}

// Risk Assessment Functions
function generateRiskAssessment(text) {
    const riskData = calculateRiskScores(text);
    displayRiskDashboard(riskData);
    return riskData;
}

function calculateRiskScores(text) {
    const lower = text.toLowerCase();
    const wordCount = text.split(' ').length;
    
    // Calculate individual risk categories
    const financialRisk = calculateFinancialRisk(lower, wordCount);
    const legalRisk = calculateLegalRisk(lower, wordCount);
    const operationalRisk = calculateOperationalRisk(lower, wordCount);
    const terminationRisk = calculateTerminationRisk(lower, wordCount);
    
    // Calculate overall risk score (weighted average)
    const overallRisk = Math.round(
        (financialRisk.score * 0.3) + 
        (legalRisk.score * 0.25) + 
        (operationalRisk.score * 0.25) + 
        (terminationRisk.score * 0.2)
    );
    
    return {
        overall: overallRisk,
        categories: {
            financial: financialRisk,
            legal: legalRisk,
            operational: operationalRisk,
            termination: terminationRisk
        },
        recommendations: generateRiskRecommendations(lower, overallRisk, {
            financial: financialRisk,
            legal: legalRisk,
            operational: operationalRisk,
            termination: terminationRisk
        }),
        riskFactors: identifyRiskFactors(lower, overallRisk)
    };
}

function calculateFinancialRisk(text, wordCount) {
    let score = 20; // Base score
    let details = [];
    
    // Payment obligations
    if (text.includes('payment') || text.includes('fee')) {
        score += 15;
        details.push('Payment obligations present');
    }
    
    // Penalties and fines
    if (text.includes('penalty') || text.includes('fine') || text.includes('damages')) {
        score += 20;
        details.push('Financial penalties specified');
    }
    
    // Unlimited liability
    if (text.includes('unlimited liability') || text.includes('no limitation')) {
        score += 25;
        details.push('Unlimited liability exposure');
    }
    
    // Indemnification
    if (text.includes('indemnify') || text.includes('indemnification')) {
        score += 15;
        details.push('Indemnification requirements');
    }
    
    // Automatic renewals with fees
    if (text.includes('automatic renewal') && (text.includes('fee') || text.includes('payment'))) {
        score += 10;
        details.push('Automatic renewal with fees');
    }
    
    return {
        score: Math.min(score, 100),
        level: score <= 30 ? 'low' : score <= 70 ? 'medium' : 'high',
        details: details.length > 0 ? details.join(', ') : 'Standard financial terms apply'
    };
}

function calculateLegalRisk(text, wordCount) {
    let score = 15; // Base score
    let details = [];
    
    // Complex legal language
    const legalTerms = ['whereas', 'heretofore', 'pursuant', 'notwithstanding', 'indemnify', 'covenant'];
    const legalTermCount = legalTerms.filter(term => text.includes(term)).length;
    score += legalTermCount * 8;
    
    if (legalTermCount > 2) {
        details.push('Complex legal language used');
    }
    
    // Governing law and jurisdiction
    if (text.includes('governing law') || text.includes('jurisdiction')) {
        score += 10;
        details.push('Specific jurisdiction requirements');
    }
    
    // Dispute resolution
    if (text.includes('arbitration') || text.includes('mediation')) {
        score += 5;
        details.push('Alternative dispute resolution required');
    } else if (text.includes('court') || text.includes('litigation')) {
        score += 15;
        details.push('Court litigation specified');
    }
    
    // Waiver of rights
    if (text.includes('waive') || text.includes('waiver')) {
        score += 20;
        details.push('Rights waiver clauses present');
    }
    
    // Document length complexity
    if (wordCount > 2000) {
        score += 10;
        details.push('Lengthy document increases complexity');
    }
    
    return {
        score: Math.min(score, 100),
        level: score <= 30 ? 'low' : score <= 70 ? 'medium' : 'high',
        details: details.length > 0 ? details.join(', ') : 'Standard legal terms present'
    };
}

function calculateOperationalRisk(text, wordCount) {
    let score = 10; // Base score
    let details = [];
    
    // Performance requirements
    if (text.includes('performance') || text.includes('deliverable')) {
        score += 15;
        details.push('Performance requirements specified');
    }
    
    // Compliance obligations
    if (text.includes('comply') || text.includes('compliance')) {
        score += 12;
        details.push('Compliance obligations required');
    }
    
    // Maintenance requirements
    if (text.includes('maintain') || text.includes('maintenance')) {
        score += 10;
        details.push('Maintenance obligations present');
    }
    
    // Reporting requirements
    if (text.includes('report') || text.includes('reporting')) {
        score += 8;
        details.push('Reporting requirements specified');
    }
    
    // Confidentiality obligations
    if (text.includes('confidential') || text.includes('non-disclosure')) {
        score += 15;
        details.push('Confidentiality obligations required');
    }
    
    // Time-sensitive requirements
    if (text.includes('deadline') || text.includes('due date') || text.includes('within')) {
        score += 12;
        details.push('Time-sensitive requirements present');
    }
    
    return {
        score: Math.min(score, 100),
        level: score <= 30 ? 'low' : score <= 70 ? 'medium' : 'high',
        details: details.length > 0 ? details.join(', ') : 'Standard operational requirements'
    };
}

function calculateTerminationRisk(text, wordCount) {
    let score = 5; // Base score
    let details = [];
    
    // Termination clauses present
    if (text.includes('terminat') || text.includes('cancel')) {
        score += 10;
        details.push('Termination procedures specified');
        
        // Immediate termination
        if (text.includes('immediate') && text.includes('terminat')) {
            score += 15;
            details.push('Immediate termination possible');
        }
        
        // Termination for convenience
        if (text.includes('convenience') && text.includes('terminat')) {
            score += 20;
            details.push('Termination for convenience allowed');
        }
    } else {
        score += 25;
        details.push('No clear termination procedures');
    }
    
    // Notice requirements
    if (text.includes('notice') && text.includes('terminat')) {
        score -= 5; // Reduces risk
        details.push('Notice requirements provide protection');
    }
    
    // Survival clauses
    if (text.includes('survive') || text.includes('survival')) {
        score += 10;
        details.push('Obligations survive termination');
    }
    
    // Automatic renewal
    if (text.includes('automatic renewal') || text.includes('auto-renew')) {
        score += 15;
        details.push('Automatic renewal clauses present');
    }
    
    return {
        score: Math.min(score, 100),
        level: score <= 30 ? 'low' : score <= 70 ? 'medium' : 'high',
        details: details.length > 0 ? details.join(', ') : 'Standard termination terms'
    };
}

function generateRiskRecommendations(text, overallRisk, categories) {
    const recommendations = [];
    
    // High overall risk recommendations
    if (overallRisk > 70) {
        recommendations.push({
            priority: 'high',
            title: 'Legal Review Required',
            content: 'This document presents high risk. Consider having it reviewed by a qualified legal professional before signing.',
            action: 'Schedule consultation with attorney'
        });
    }
    
    // Financial risk recommendations
    if (categories.financial.score > 60) {
        recommendations.push({
            priority: 'high',
            title: 'Financial Protection',
            content: 'High financial risk detected. Consider negotiating liability caps or insurance requirements.',
            action: 'Review financial exposure limits'
        });
    }
    
    // Legal risk recommendations
    if (categories.legal.score > 50) {
        recommendations.push({
            priority: 'medium',
            title: 'Legal Complexity',
            content: 'Complex legal language present. Ensure you understand all terms before proceeding.',
            action: 'Clarify unclear legal terms'
        });
    }
    
    // Operational risk recommendations
    if (categories.operational.score > 50) {
        recommendations.push({
            priority: 'medium',
            title: 'Operational Planning',
            content: 'Significant operational requirements identified. Plan resources and processes accordingly.',
            action: 'Create operational compliance plan'
        });
    }
    
    // Termination risk recommendations
    if (categories.termination.score > 60) {
        recommendations.push({
            priority: 'high',
            title: 'Exit Strategy',
            content: 'Termination terms may be unfavorable. Consider negotiating better exit conditions.',
            action: 'Review termination procedures'
        });
    }
    
    // General recommendations based on content
    if (text.includes('automatic renewal')) {
        recommendations.push({
            priority: 'medium',
            title: 'Calendar Reminder',
            content: 'Set calendar reminders before automatic renewal dates to review or cancel if needed.',
            action: 'Set renewal date reminders'
        });
    }
    
    if (text.includes('confidential') || text.includes('non-disclosure')) {
        recommendations.push({
            priority: 'low',
            title: 'Information Security',
            content: 'Implement proper information security measures to protect confidential information.',
            action: 'Review data protection procedures'
        });
    }
    
    // Default recommendation for low risk
    if (overallRisk <= 30 && recommendations.length === 0) {
        recommendations.push({
            priority: 'low',
            title: 'Standard Precautions',
            content: 'This document appears to have low risk. Still recommended to read all terms carefully.',
            action: 'Review document thoroughly before signing'
        });
    }
    
    return recommendations;
}

function identifyRiskFactors(text, overallRisk) {
    const factors = [];
    
    if (text.includes('unlimited liability')) {
        factors.push({
            level: 'high',
            title: 'Unlimited Liability',
            description: 'You may be responsible for unlimited damages',
            impact: 'High financial exposure'
        });
    }
    
    if (text.includes('automatic renewal') && !text.includes('cancel')) {
        factors.push({
            level: 'medium',
            title: 'Automatic Renewal',
            description: 'Contract renews automatically without clear cancellation terms',
            impact: 'Difficulty exiting agreement'
        });
    }
    
    if (text.includes('indemnify') || text.includes('indemnification')) {
        factors.push({
            level: 'medium',
            title: 'Indemnification Clause',
            description: 'You may need to compensate the other party for certain losses',
            impact: 'Potential financial liability'
        });
    }
    
    if (text.includes('waive') || text.includes('waiver')) {
        factors.push({
            level: 'high',
            title: 'Rights Waiver',
            description: 'You may be giving up important legal rights',
            impact: 'Reduced legal protections'
        });
    }
    
    if (text.includes('sole discretion') || text.includes('absolute discretion')) {
        factors.push({
            level: 'medium',
            title: 'Discretionary Powers',
            description: 'Other party has broad decision-making authority',
            impact: 'Limited control over outcomes'
        });
    }
    
    if (!text.includes('terminat') && !text.includes('cancel')) {
        factors.push({
            level: 'medium',
            title: 'No Clear Exit Terms',
            description: 'Document lacks clear termination procedures',
            impact: 'Difficulty ending agreement'
        });
    }
    
    return factors;
}

function displayRiskDashboard(riskData) {
    // Update overall risk score and meter
    updateRiskMeter(riskData.overall);
    
    // Update category scores and progress bars
    updateCategoryScores(riskData.categories);
    
    // Display recommendations
    displayRecommendations(riskData.recommendations);
    
    // Display risk factors
    displayRiskFactors(riskData.riskFactors);
}

function updateRiskMeter(score) {
    const scoreElement = document.getElementById('overallRiskScore');
    const needleElement = document.getElementById('riskNeedle');
    
    // Update score display
    scoreElement.textContent = score;
    
    // Update needle position (0-100 maps to -90deg to 90deg)
    const angle = (score / 100) * 180 - 90;
    needleElement.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    
    // Add color class based on risk level
    scoreElement.className = score <= 30 ? 'risk-score score-low' : 
                           score <= 70 ? 'risk-score score-medium' : 
                           'risk-score score-high';
}

function updateCategoryScores(categories) {
    Object.entries(categories).forEach(([category, data]) => {
        const scoreElement = document.getElementById(`${category}Score`);
        const progressElement = document.getElementById(`${category}Progress`);
        const detailsElement = document.getElementById(`${category}Details`);
        
        // Update score
        scoreElement.textContent = data.score;
        scoreElement.className = `category-score score-${data.level}`;
        
        // Update progress bar
        setTimeout(() => {
            progressElement.style.width = `${data.score}%`;
            progressElement.className = `category-progress progress-${data.level}`;
        }, 500);
        
        // Update details
        detailsElement.innerHTML = `<p>${data.details}</p>`;
    });
}

function displayRecommendations(recommendations) {
    const grid = document.getElementById('recommendationsGrid');
    grid.innerHTML = '';
    
    recommendations.forEach(rec => {
        const card = document.createElement('div');
        card.className = `recommendation-card priority-${rec.priority}`;
        
        card.innerHTML = `
            <div class="recommendation-header">
                <span class="recommendation-priority priority-${rec.priority}">${rec.priority}</span>
                <h6 class="recommendation-title">${rec.title}</h6>
            </div>
            <div class="recommendation-content">${rec.content}</div>
            <div class="recommendation-action">Action: ${rec.action}</div>
        `;
        
        grid.appendChild(card);
    });
}

function displayRiskFactors(factors) {
    const list = document.getElementById('riskFactorsList');
    list.innerHTML = '';
    
    if (factors.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">No significant risk factors identified in this document.</p>';
        return;
    }
    
    factors.forEach(factor => {
        const item = document.createElement('div');
        item.className = 'risk-factor-item';
        
        item.innerHTML = `
            <div class="risk-factor-icon ${factor.level}">
                <i class="fas fa-${factor.level === 'high' ? 'exclamation-triangle' : factor.level === 'medium' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="risk-factor-content">
                <h6 class="risk-factor-title">${factor.title}</h6>
                <p class="risk-factor-description">${factor.description}</p>
            </div>
            <div class="risk-factor-impact priority-${factor.level}">${factor.impact}</div>
        `;
        
        list.appendChild(item);
    });
}
