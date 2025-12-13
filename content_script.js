console.log("Safe Link Checker: Content script loaded.");

let isEnabled = true;
// Stores { timerId, buttonElement, wrapperElement } for each URL
const analysisContexts = new Map();

const style = document.createElement('style');
style.textContent = `
  .safety-reason-modal {
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 2147483647;
    font-size: 12px;
    color: #333;
    width: 280px;
    line-height: 1.5;
    font-family: Roboto, Arial, sans-serif;
    text-align: left;
    font-weight: normal;
    white-space: normal;
  }
  .safety-reason-modal::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 10px;
    width: 10px;
    height: 10px;
    background: white;
    border-left: 1px solid #ccc;
    border-top: 1px solid #ccc;
    transform: rotate(45deg);
  }
  .safety-reason-btn:hover {
    background-color: #e8eaed !important;
    border-color: #808b !important;
  }
`;
document.head.appendChild(style);

function addCheckButtons() {
  if (!isEnabled) return;

  const headings = document.querySelectorAll('h3');

  headings.forEach((h3) => {
    if (h3.querySelector('.safety-check-btn')) return;

    const linkElement = h3.closest('a');
    if (linkElement) {
      const url = linkElement.href;
      if (!url || url.startsWith('javascript:') || url.includes('google.com/search')) return;

      const button = document.createElement('button');
      button.innerText = 'Safety Check';
      button.className = 'safety-check-btn';
      button.dataset.url = url;
      
      Object.assign(button.style, {
        marginLeft: '12px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer',
        border: '1px solid #dadce0', borderRadius: '12px', backgroundColor: '#fff',
        color: '#1a73e8', fontWeight: '500', display: 'inline-block',
        verticalAlign: 'middle', zIndex: '1000', lineHeight: '1.4', whiteSpace: 'nowrap'
      });
      
      button.onmouseover = () => button.style.backgroundColor = '#f8f9fa';
      button.onmouseout = () => button.style.backgroundColor = '#fff';

      const wrapper = document.createElement('span');
      wrapper.className = 'safety-check-wrapper';
      wrapper.style.display = 'inline-block';
      wrapper.style.verticalAlign = 'middle';
      wrapper.style.position = 'relative';

      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        button.innerText = '...';
        button.style.color = '#5f6368';
        button.style.cursor = 'wait';
        button.disabled = true;
        
        const existingReasonBtn = wrapper.querySelector('.safety-reason-btn');
        if (existingReasonBtn) existingReasonBtn.remove();
        
        closeAllModals();
        
        // Set timeout and store context (button & wrapper)
        const timerId = setTimeout(() => {
          handleAnalysisResult(url, 0, "Analysis failed (Request timed out).", "Timeout");
        }, 6000);
        
        analysisContexts.set(url, { timerId, button, wrapper });

        chrome.runtime.sendMessage({
          action: 'analyzeUrlSafety',
          url: url,
          buttonId: url 
        });
      };
      
      wrapper.onmouseenter = (e) => {
        const parentLink = wrapper.closest('a');
        if (parentLink) {
          parentLink.dataset.originalHref = parentLink.href;
          parentLink.removeAttribute('href');
          parentLink.style.textDecoration = 'none';
          parentLink.style.cursor = 'default';
        }
      };

      wrapper.onmouseleave = (e) => {
        const parentLink = wrapper.closest('a');
        if (parentLink && parentLink.dataset.originalHref) {
          parentLink.href = parentLink.dataset.originalHref;
          delete parentLink.dataset.originalHref;
          parentLink.style.textDecoration = '';
          parentLink.style.cursor = '';
        }
      };

      wrapper.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };

      wrapper.appendChild(button);
      h3.appendChild(wrapper);
    }
  });
}

function removeCheckButtons() {
  document.querySelectorAll('.safety-check-wrapper').forEach(el => el.remove());
}

function closeAllModals() {
  document.querySelectorAll('.safety-reason-modal').forEach(el => el.remove());
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.safety-reason-btn') && !e.target.closest('.safety-reason-modal')) {
    closeAllModals();
  }
});

function handleAnalysisResult(buttonId, score, reason, error) {
  // Retrieve the stored context (button & wrapper) directly
  const context = analysisContexts.get(buttonId);
  
  // If context is missing, try to find button by selector as a fallback
  let targetButton = context ? context.button : document.querySelector(`.safety-check-btn[data-url="${CSS.escape(buttonId)}"]`);
  let wrapper = context ? context.wrapper : (targetButton ? targetButton.parentNode : null);

  if (targetButton) {
    if (context) {
      clearTimeout(context.timerId);
      analysisContexts.delete(buttonId);
    }

    targetButton.disabled = false;
    targetButton.style.cursor = 'default';
    targetButton.onclick = (e) => { e.preventDefault(); e.stopPropagation(); };
    targetButton.onmouseover = null;
    targetButton.onmouseout = null;
    
    if (error) {
      targetButton.innerText = 'Error';
      targetButton.title = `Error: ${error}`;
      targetButton.style.color = '#d93025';
      targetButton.style.borderColor = '#d93025';
      targetButton.style.backgroundColor = '#fce8e6';
    } else {
      if (score <= 30) {
        targetButton.innerText = 'Risky';
        targetButton.style.color = '#d93025';
        targetButton.style.borderColor = '#d93025';
        targetButton.style.backgroundColor = '#fce8e6';
      } else if (score <= 70) {
        targetButton.innerText = 'Caution';
        targetButton.style.color = '#e37400';
        targetButton.style.borderColor = '#e37400';
        targetButton.style.backgroundColor = '#fef7e0';
      } else {
        targetButton.innerText = 'Safe';
        targetButton.style.color = '#188038';
        targetButton.style.borderColor = '#188038';
        targetButton.style.backgroundColor = '#e6f4ea';
      }
    }

    if (reason && score <= 70 && wrapper) {
      const reasonBtn = document.createElement('span');
      reasonBtn.innerText = 'Reason';
      reasonBtn.className = 'safety-reason-btn';
      
      Object.assign(reasonBtn.style, {
        marginLeft: '6px', padding: '2px 6px', fontSize: '10px',
        cursor: 'help', border: '1px solid #999', borderRadius: '4px',
        backgroundColor: '#f1f3f4', color: '#5f6368', verticalAlign: 'middle',
        lineHeight: '1.4', display: 'inline-block'
      });

      reasonBtn.onmouseenter = (e) => {
        const existingModal = wrapper.querySelector('.safety-reason-modal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'safety-reason-modal';
        
        const title = document.createElement('strong');
        title.textContent = 'Analysis Reason:';
        modal.appendChild(title);
        modal.appendChild(document.createElement('br'));
        modal.appendChild(document.createTextNode(reason));
        
        modal.style.top = (reasonBtn.offsetTop + reasonBtn.offsetHeight + 8) + 'px';
        modal.style.left = reasonBtn.offsetLeft + 'px';

        wrapper.appendChild(modal);
      };

      reasonBtn.onmouseleave = (e) => {
        const modal = wrapper.querySelector('.safety-reason-modal');
        if (modal) modal.remove();
      };

      wrapper.appendChild(reasonBtn);
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'enableChecker') {
    isEnabled = true;
    addCheckButtons();
  } else if (message.action === 'disableChecker') {
    isEnabled = false;
    removeCheckButtons();
  }

  if (message.action === 'safetyAnalysisResult') {
    handleAnalysisResult(message.buttonId, message.score, message.reason, message.error);
  }
});

const observer = new MutationObserver((mutations) => {
  if (isEnabled) {
    addCheckButtons();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

chrome.storage.sync.get(['isEnabled'], function(result) {
  isEnabled = result.isEnabled !== false;
  
  if (isEnabled) {
    addCheckButtons();
  } else {
    removeCheckButtons();
  }
});