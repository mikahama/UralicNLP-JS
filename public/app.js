let currentRuntime = 'server'; // 'server' or 'client'

function setRuntime(mode) {
  currentRuntime = mode;
  document.getElementById('btnRuntimeServer').classList.toggle('active', mode === 'server');
  document.getElementById('btnRuntimeClient').classList.toggle('active', mode === 'client');

  const banner = document.getElementById('bannerText');
  if (mode === 'server') {
    banner.textContent = 'Node.js Server — executing via local Node API and filesystem storage (~/.uralicnlp)';
  } else {
    banner.textContent = 'Browser (Client) — executing via in-browser uralicnlp.min.js and IndexedDB persistent model storage';
  }

  refreshStorageInfo();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(`tab-${tabId}`).classList.add('active');

  if (tabId === 'models') {
    refreshStorageInfo();
  }
}

function loadPreset(presetKey) {
  if (presetKey === 'kpv-verb') {
    document.getElementById('morphLang').value = 'kpv';
    document.getElementById('morphQuery').value = 'лыддьыны';
    switchTab('morphology');
  } else if (presetKey === 'kpv-gen') {
    document.getElementById('morphLang').value = 'kpv';
    document.getElementById('morphQuery').value = 'лыддьыны+V+Ind+Prs+Sg1';
    switchTab('morphology');
  } else if (presetKey === 'myv-verb') {
    document.getElementById('morphLang').value = 'myv';
    document.getElementById('morphQuery').value = 'морамс';
    switchTab('morphology');
  } else if (presetKey === 'fin-tok') {
    document.getElementById('tokenText').value = 'Tämä on suomenkielinen esimerkkilause! Esim. lyhenteet ja 1.5 kg omenoita tunnistetaan oikein...';
    switchTab('tokenizer');
  }
}

function getMorphOptions() {
  return {
    descriptive: document.getElementById('optDescriptive').checked,
    removeSymbols: document.getElementById('optRemoveSymbols').checked,
    wordBoundaries: document.getElementById('optWordBoundaries').checked,
    dictionaryForms: document.getElementById('optDictForms').checked,
    languageFlags: document.getElementById('optLangFlags').checked,
  };
}

async function executeMethod(methodName) {
  const lang = document.getElementById('morphLang').value.trim();
  const query = document.getElementById('morphQuery').value.trim();
  const options = getMorphOptions();
  const out = document.getElementById('morphOutput');
  const meta = document.getElementById('morphMeta');

  if (!lang || !query) {
    alert('Please enter both language and query');
    return;
  }

  out.textContent = `Executing ${methodName}("${query}", "${lang}") via ${currentRuntime.toUpperCase()}...`;
  meta.textContent = 'Running...';
  meta.className = 'meta-tag';

  try {
    let result;
    let durationMs;

    if (currentRuntime === 'server') {
      const payload = {
        language: lang,
        options,
      };
      if (methodName === 'lemmatize') {
        payload.word = query;
      } else {
        payload.query = query;
      }

      const res = await fetch(`/api/${methodName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      result = data.result;
      durationMs = data.durationMs;
    } else {
      // Client mode (Browser)
      if (!window.uralicNLP) {
        throw new Error('uralicnlp.min.js is not loaded in window');
      }
      const start = performance.now();
      if (methodName === 'lemmatize') {
        result = await window.uralicNLP.lemmatize(query, lang, options);
      } else if (methodName === 'analyze') {
        result = await window.uralicNLP.analyze(query, lang, options);
      } else if (methodName === 'generate') {
        result = await window.uralicNLP.generate(query, lang, options);
      } else if (methodName === 'segment') {
        result = await window.uralicNLP.segment(query, lang, options);
      }
      durationMs = performance.now() - start;
    }

    meta.textContent = `Success (${durationMs.toFixed(2)} ms)`;
    meta.className = 'meta-tag success';
    out.textContent = JSON.stringify(result, null, 2);
  } catch (err) {
    meta.textContent = 'Error';
    meta.className = 'meta-tag error';
    out.textContent = `Error (${currentRuntime}):\n${err.message}`;
  }
}

async function executeTranslation() {
  const lemma = document.getElementById('transLemma').value.trim();
  const srcLang = document.getElementById('transSrcLang').value.trim();
  const tgtLang = document.getElementById('transTgtLang').value.trim() || null;
  const out = document.getElementById('transOutput');
  const meta = document.getElementById('transMeta');

  out.textContent = `Looking up translation for "${lemma}" (${srcLang} -> ${tgtLang || 'all'})...`;
  meta.textContent = 'Running...';
  meta.className = 'meta-tag';

  try {
    let result;
    let durationMs;

    if (currentRuntime === 'server') {
      const res = await fetch('/api/get_translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lemma, lang: srcLang, trans_lang: tgtLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      result = data.result;
      durationMs = data.durationMs;
    } else {
      const start = performance.now();
      result = await window.uralicNLP.get_translation(lemma, srcLang, tgtLang);
      durationMs = performance.now() - start;
    }

    meta.textContent = `Success (${durationMs.toFixed(2)} ms)`;
    meta.className = 'meta-tag success';
    out.textContent = JSON.stringify(result, null, 2);
  } catch (err) {
    meta.textContent = 'Error';
    meta.className = 'meta-tag error';
    out.textContent = `Error:\n${err.message}`;
  }
}

async function executeTokenize(type) {
  const text = document.getElementById('tokenText').value;
  const out = document.getElementById('tokenOutput');
  const meta = document.getElementById('tokenMeta');

  out.textContent = `Tokenizing text (${type})...`;
  meta.textContent = 'Running...';
  meta.className = 'meta-tag';

  try {
    let result;
    let durationMs;

    if (currentRuntime === 'server') {
      const res = await fetch('/api/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      result = data.result;
      durationMs = data.durationMs;
    } else {
      const start = performance.now();
      if (type === 'sentences') {
        result = window.uralicNLP.tokenizer.sentences(text);
      } else if (type === 'words') {
        result = window.uralicNLP.tokenizer.words(text);
      } else {
        result = window.uralicNLP.tokenizer.tokenize(text);
      }
      durationMs = performance.now() - start;
    }

    meta.textContent = `Success (${durationMs.toFixed(2)} ms)`;
    meta.className = 'meta-tag success';
    out.textContent = JSON.stringify(result, null, 2);
  } catch (err) {
    meta.textContent = 'Error';
    meta.className = 'meta-tag error';
    out.textContent = `Error:\n${err.message}`;
  }
}

async function downloadLanguage() {
  const lang = document.getElementById('dlLang').value.trim();
  if (!lang) return alert('Enter language code');

  const pBox = document.getElementById('dlProgress');
  const pText = document.getElementById('dlStatusText');
  pBox.style.display = 'flex';
  pText.textContent = `Downloading models for ${lang} to ${currentRuntime === 'server' ? 'Server disk (~/.uralicnlp)' : 'Browser IndexedDB'}...`;

  try {
    if (currentRuntime === 'server') {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      pText.textContent = `Downloaded ${lang} to server in ${data.durationMs.toFixed(2)} ms!`;
    } else {
      await window.uralicNLP.download(lang, {
        onProgress: (p) => {
          pText.textContent = `Downloaded ${p.model} into IndexedDB...`;
        },
      });
      pText.textContent = `Downloaded ${lang} to Browser IndexedDB successfully!`;
    }
    refreshStorageInfo();
  } catch (err) {
    pText.textContent = `Download failed: ${err.message}`;
  }
}

async function checkInstalled() {
  const lang = document.getElementById('dlLang').value.trim();
  if (!lang) return alert('Enter language code');

  try {
    let installed;
    if (currentRuntime === 'server') {
      const res = await fetch(`/api/status?lang=${encodeURIComponent(lang)}`);
      const data = await res.json();
      installed = data.installed;
    } else {
      installed = await window.uralicNLP.is_language_installed(lang);
    }
    alert(`Language "${lang}" installed on ${currentRuntime.toUpperCase()}: ${installed ? 'YES ✅' : 'NO ❌'}`);
  } catch (err) {
    alert(`Error checking status: ${err.message}`);
  }
}

async function uninstallLanguage() {
  const lang = document.getElementById('dlLang').value.trim();
  if (!lang) return alert('Enter language code');
  if (!confirm(`Are you sure you want to uninstall ${lang} on ${currentRuntime.toUpperCase()}?`)) return;

  try {
    if (currentRuntime === 'server') {
      const res = await fetch('/api/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } else {
      await window.uralicNLP.uninstall(lang);
    }
    alert(`Uninstalled ${lang} from ${currentRuntime.toUpperCase()}`);
    refreshStorageInfo();
  } catch (err) {
    alert(`Uninstall failed: ${err.message}`);
  }
}

async function refreshStorageInfo() {
  const info = document.getElementById('storageInfo');
  if (!info) return;

  info.textContent = `Querying ${currentRuntime.toUpperCase()} storage status...`;

  try {
    if (currentRuntime === 'server') {
      const res = await fetch('/api/installed');
      const data = await res.json();
      info.textContent = JSON.stringify({
        runtime: 'Node.js Server',
        storageType: 'NodeStorage (Filesystem)',
        baseFoldersChecked: data.baseFolders,
        installedLanguages: data.languages,
      }, null, 2);
    } else {
      let clientLangs = [];
      if (window.uralicNLP && window.uralicNLP.getStorage) {
        const storage = await window.uralicNLP.getStorage();
        if (storage.listInstalledLanguages) {
          clientLangs = await storage.listInstalledLanguages();
        }
      }
      info.textContent = JSON.stringify({
        runtime: 'Client Browser',
        storageType: 'BrowserStorage (IndexedDB: uralicnlp_models)',
        installedLanguagesInIndexedDB: clientLangs,
        indexedDBSupported: typeof indexedDB !== 'undefined',
      }, null, 2);
    }
  } catch (err) {
    info.textContent = `Failed to get storage info: ${err.message}`;
  }
}

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  refreshStorageInfo();
});
