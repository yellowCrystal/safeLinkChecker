function analyzeSafety(url, text) {
  let score = 100;
  let reasons = [];

  try {
    const urlObj = new URL(url);
    const cleanText = text ? text.toLowerCase() : ""; 

    if (urlObj.protocol !== 'https:') {
      score -= 50;
      reasons.push("Not using secure HTTPS.");
    }

    const riskyTlds = ['.xyz', '.top', '.club', '.site', '.online', '.link', '.live', '.biz', '.info', '.cn', '.ru'];
    if (riskyTlds.some(tld => urlObj.hostname.endsWith(tld))) {
      score -= 20;
      reasons.push(`Uses a risky domain extension (${urlObj.hostname.split('.').pop()}).`);
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(urlObj.hostname)) {
      score -= 40;
      reasons.push("URL is a direct IP address.");
    }

    const shorteners = ['bit.ly', 'goo.gl', 'tinyurl.com', 't.co', 'is.gd', 'buff.ly', 'adf.ly', 'ow.ly', 'vo.la', 'me2.do'];
    if (shorteners.some(s => urlObj.hostname.includes(s))) {
      score -= 30;
      reasons.push("Uses a URL shortener.");
    }

    if (url.length > 100) {
      score -= 10;
      reasons.push("URL is unusually long.");
    }
    if ((url.match(/-/g) || []).length > 4) {
      score -= 10;
      reasons.push("Excessive hyphens in URL.");
    }

    if (cleanText) {
      const phishingKeywords = ['password', 'account', 'login', 'verify', 'update', 'confirm', 'ssn', 'bank', 'credit card', 'prize', 'winner', 'congratulations', 'urgent', 'security alert'];
      let keywordCount = 0;
      phishingKeywords.forEach(keyword => {
        if (cleanText.includes(keyword)) {
          keywordCount++;
        }
      });
      if (keywordCount > 3) {
        score -= (keywordCount * 5);
        reasons.push(`Contains ${keywordCount} potential phishing keywords.`);
      }
      
      if ((cleanText.includes('type="password"') || cleanText.includes('type=\'password\'')) && urlObj.protocol !== 'https:') {
          score -= 50;
          reasons.push("Password field found on an insecure (HTTP) page.");
      }
    } else {
      reasons.push("Could not verify page content (Access blocked).");
    }

    score = Math.max(0, score);
    const reason = reasons.length > 0 ? reasons.slice(0, 2).join(' ') : "Looks safe.";

    return { score, reason };

  } catch (e) {
    return { error: "Invalid URL format." };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'analyzeUrlSafety') {
    const { url, buttonId } = message;

    fetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'follow'
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(htmlText => {
      const analysis = analyzeSafety(url, htmlText);

      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'safetyAnalysisResult',
        buttonId: buttonId,
        score: analysis.score,
        reason: analysis.reason,
        error: null
      });
    })
    .catch(error => {
      console.warn("Fetch failed (Security/Network):", error);
      
      // Analyze with no page content, but add a specific reason for the failure.
      const analysis = analyzeSafety(url, "");
      const finalReason = "Analysis failed (Access blocked by site security). " + analysis.reason;

      chrome.tabs.sendMessage(sender.tab.id, {
        action: 'safetyAnalysisResult',
        buttonId: buttonId,
        score: analysis.score,
        reason: finalReason,
        error: null
      });
    });
    
    return true;
  }
});