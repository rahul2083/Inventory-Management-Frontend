import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  FileText, Upload, CheckCircle2, X, Save, RefreshCw,
  Eye, EyeOff, Tag, AlertCircle, Loader2, Cloud, CloudOff
} from 'lucide-react';
import { extractDocxText, extractDocxHtml, extractPlaceholders, fillPlaceholders, getInputConfig, fileToBase64 } from '../../utils/docxTemplate';
import { getStoredToken } from '../../utils/auth';

const API          = import.meta.env.VITE_API_URL || "";
const authHeaders  = () => ({ Authorization: `Bearer ${getStoredToken()}` });
const STORAGE_KEY  = 'warranty-template-master';

export default function DocxTemplateUploader() {
  const [template,    setTemplate]    = useState(null);
  // { fileName, rawText, placeholders, uploadedAt, fromServer? }

  const [formValues,  setFormValues]  = useState({});
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [savedState,  setSavedState]  = useState(null); // null | 'server' | 'local'
  const [showPreview, setShowPreview] = useState(true);

  // ── On mount: prefer server copy, fall back to localStorage ───────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/api/warranty/template`, { headers: authHeaders() });
        if (res.data?.docxRawText) {
          const t = {
            fileName:     res.data.docxFileName || 'template.docx',
            rawText:      res.data.docxRawText,
            rawHtml:      res.data.docxRawHtml  || null,
            placeholders: extractPlaceholders(res.data.docxRawText),
            uploadedAt:   res.data.updatedAt || new Date().toISOString(),
            fromServer:   true,
          };
          setTemplate(t);
          // Restore saved form values from localStorage
          try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (stored.formValues) setFormValues(stored.formValues);
          } catch { /* ignore */ }
          return;
        }
      } catch { /* server unreachable — fall through */ }

      // localStorage fallback
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (stored.template) setTemplate(stored.template);
        if (stored.formValues) setFormValues(stored.formValues);
      } catch { /* ignore */ }
    })();
  }, []);

  // ── Process dropped / selected file ───────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setError('Only .docx files are accepted.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Extract text (for placeholders), HTML (for fallback preview), and raw base64 (for backend storage)
      const [rawText, rawHtml, docxBase64] = await Promise.all([
        extractDocxText(file),
        extractDocxHtml(file),
        fileToBase64(file),
      ]);
      const placeholders = extractPlaceholders(rawText);
      const newTemplate  = {
        fileName:   file.name,
        rawText,
        rawHtml,
        docxBase64,   // sent to backend on save; NOT stored in localStorage
        placeholders,
        uploadedAt: new Date().toISOString(),
        fileSize:   file.size,
        fromServer: false,
      };
      setTemplate(newTemplate);
      // Preserve any existing values for matching placeholders
      setFormValues(prev => {
        const next = {};
        placeholders.forEach(p => { next[p] = prev[p] ?? ''; });
        return next;
      });
      setSavedState(null);
    } catch (e) {
      setError('Could not read the DOCX file. Make sure it is a valid Word document.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop:   useCallback((accepted) => { if (accepted[0]) processFile(accepted[0]); }, [processFile]),
    accept:   { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    multiple: false,
    noClick:  !!template,
  });

  // ── Save: server + localStorage ───────────────────────────────────────────
  const saveTemplate = async () => {
    setSaving(true);
    setError(null);

    // Save to localStorage — exclude docxBase64 (too large, only needed by server)
    try {
      const { docxBase64: _skip, ...templateForStorage } = template;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ template: templateForStorage, formValues }));
    } catch { /* ignore quota errors */ }

    try {
      await axios.put(
        `${API}/api/warranty/template`,
        {
          docxRawText:  template.rawText,
          docxFileName: template.fileName,
          docxBase64:   template.docxBase64 || null,
        },
        { headers: authHeaders() }
      );
      setTemplate(t => ({ ...t, fromServer: true }));
      setSavedState('server');
    } catch (_e) {
      setSavedState('local');
      setError('Saved locally. Server sync failed — check your connection.');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedState(null), 3500);
    }
  };

  // ── Clear ──────────────────────────────────────────────────────────────────
  const clearTemplate = () => {
    setTemplate(null);
    setFormValues({});
    setSavedState(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    // Clear from server
    axios.put(`${API}/api/warranty/template`, { docxRawText: null, docxFileName: null }, { headers: authHeaders() }).catch(() => {});
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const previewText  = template ? fillPlaceholders(template.rawText.slice(0, 600), formValues) : '';
  const filledCount  = Object.values(formValues).filter(v => String(v).trim() !== '').length;
  const formatBytes  = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  // ─────────────────────────────────────────────────────────────────────────
  // Empty state — drag-and-drop
  // ─────────────────────────────────────────────────────────────────────────
  if (!template) {
    return (
      <div className="space-y-3">
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center gap-3 px-6 py-12 border-2 border-dashed rounded-2xl cursor-pointer select-none transition-all ${
            loading       ? 'border-indigo-300 bg-indigo-50 cursor-wait' :
            isDragActive  ? 'border-indigo-400 bg-indigo-50 scale-[1.01]' :
                            'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50'
          }`}
        >
          <input {...getInputProps()} />
          {loading
            ? <Loader2 size={32} className="text-indigo-400 animate-spin" />
            : (
              <div className={`p-3 rounded-xl ${isDragActive ? 'bg-indigo-100' : 'bg-white border border-slate-200'}`}>
                <Upload size={26} className={isDragActive ? 'text-indigo-500' : 'text-slate-400'} />
              </div>
            )
          }
          <div className="text-center">
            <p className={`font-semibold text-sm ${isDragActive ? 'text-indigo-700' : loading ? 'text-indigo-600' : 'text-slate-600'}`}>
              {loading ? 'Reading document…' : isDragActive ? 'Drop your DOCX here' : 'Drag & drop your warranty template (.docx)'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {loading ? 'Extracting text and placeholders…' : 'or click to browse — only .docx files accepted'}
            </p>
          </div>
          {!loading && !isDragActive && (
            <div className="flex items-center gap-3 mt-1 flex-wrap justify-center">
              {['{GEM_NUMBER}', '{TO_ADDRESS}', '{SERIAL_NUMBERS}', '{INVOICE_NUMBER}'].map(p => (
                <span key={p} className="text-[10px] font-mono text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full">{p}</span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Template loaded
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── File info bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <div className="p-2 bg-white border border-indigo-100 rounded-lg flex-shrink-0">
          <FileText size={16} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-800 truncate">{template.fileName}</p>
            {template.fromServer
              ? <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full font-semibold">
                  <Cloud size={9} />Synced to server
                </span>
              : <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full font-semibold">
                  <CloudOff size={9} />Local only
                </span>
            }
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            <span className="font-semibold text-indigo-600">{template.placeholders.length}</span> placeholder{template.placeholders.length !== 1 ? 's' : ''} found
            {template.fileSize && <> · {formatBytes(template.fileSize)}</>}
            {' · '}{new Date(template.uploadedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
          </p>
        </div>
        <button onClick={clearTemplate} title="Remove template"
          className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
          <X size={15} />
        </button>
      </div>

      {/* ── Placeholder chips ──────────────────────────────────────────────── */}
      {template.placeholders.length > 0 ? (
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Tag size={11} />Detected Placeholders
            <span className="font-normal normal-case ml-1 text-slate-400">— {filledCount}/{template.placeholders.length} filled</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {template.placeholders.map(p => {
              const isFilled = !!(String(formValues[p] || '').trim());
              return (
                <span key={p} className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  isFilled ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {isFilled && <CheckCircle2 size={10} />}
                  {p}
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs">
          <AlertCircle size={13} />
          No <code className="font-mono bg-amber-100 px-1 rounded">{'{PLACEHOLDER}'}</code> tokens found in this document.
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* ── Dynamic form ───────────────────────────────────────────────────── */}
      {template.placeholders.length > 0 && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700">Fill Placeholder Values</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              These are also auto-filled from order data when you click <strong>Generate</strong> on any GEM order
            </p>
          </div>
          <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {template.placeholders.map(placeholder => {
              const cfg = getInputConfig(placeholder);
              return (
                <div key={placeholder} className={cfg.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {cfg.label}
                    <code className="ml-1.5 font-mono text-[10px] text-indigo-400 font-normal bg-indigo-50 px-1.5 py-0.5 rounded">
                      {placeholder}
                    </code>
                  </label>
                  {cfg.type === 'textarea' ? (
                    <textarea
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none bg-white resize-none transition-all placeholder:text-slate-300"
                      rows={cfg.rows || 3}
                      placeholder={`Enter ${cfg.label.toLowerCase()}…`}
                      value={formValues[placeholder] || ''}
                      onChange={e => setFormValues(v => ({ ...v, [placeholder]: e.target.value }))}
                    />
                  ) : (
                    <input
                      type={cfg.type}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 outline-none bg-white transition-all placeholder:text-slate-300"
                      placeholder={`Enter ${cfg.label.toLowerCase()}…`}
                      value={formValues[placeholder] || ''}
                      onChange={e => setFormValues(v => ({ ...v, [placeholder]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Live preview ───────────────────────────────────────────────────── */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <button onClick={() => setShowPreview(p => !p)}
          className="w-full px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 hover:bg-slate-100 transition-colors text-left">
          {showPreview ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-slate-400" />}
          <span className="text-sm font-bold text-slate-700">Live Preview</span>
          <span className="text-[11px] text-slate-400 ml-1">— first 600 chars with values substituted</span>
          <span className="ml-auto text-[11px] text-slate-400">{showPreview ? 'Hide' : 'Show'}</span>
        </button>
        {showPreview && (
          <div className="p-5 max-h-52 overflow-y-auto">
            {previewText
              ? <pre className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">
                  {previewText}{template.rawText.length > 600 && <span className="text-slate-300"> …(continues)</span>}
                </pre>
              : <p className="text-xs text-slate-300 italic">Fill in values above to preview the document.</p>
            }
          </div>
        )}
      </div>

      {/* ── Action row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={saveTemplate} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-60 ${
            savedState === 'server' ? 'bg-green-500 text-white shadow-green-200' :
            savedState === 'local'  ? 'bg-amber-500 text-white shadow-amber-200' :
                                      'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
          }`}
        >
          {saving
            ? <Loader2 size={15} className="animate-spin" />
            : savedState === 'server' ? <Cloud size={15} />
            : savedState === 'local'  ? <CloudOff size={15} />
            : <Save size={15} />
          }
          {saving           ? 'Saving…'
           : savedState === 'server' ? 'Saved to server!'
           : savedState === 'local'  ? 'Saved locally'
           : 'Save Template'}
        </button>

        <input {...getInputProps()} />
        <button type="button" onClick={open}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">
          <RefreshCw size={14} />Replace Template
        </button>
      </div>
    </div>
  );
}
