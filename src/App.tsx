/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Send, 
  Users, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Mail, 
  Settings,
  AlertCircle,
  FileCode,
  Terminal,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProgressUpdate, SendResult } from './types';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [delay, setDelay] = useState(2000);
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'recipients' | 'logs'>('compose');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) setServerStatus('online');
        else setServerStatus('offline');
      } catch {
        setServerStatus('offline');
      }
    };
    checkHealth();
  }, []);

  const generateWithAI = async () => {
    if (!subject && !body) {
      setError('Please provide a subject or some context in the body for AI to work with.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const prompt = `Write a professional email body based on this subject: "${subject}". 
      The email should be engaging and support HTML formatting. 
      If there is existing content in the body, improve it: "${body}".
      Use {{name}} as a placeholder for the recipient's name.
      Return ONLY the email body content, no preamble.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      if (response.text) {
        setBody(response.text.trim());
      }
    } catch (err: any) {
      console.error('AI Generation Error:', err);
      setError('Failed to generate content with Gemini. Check your API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
        setActiveTab('recipients');
      };
      reader.readAsText(file);
    }
  };

  const startSending = async () => {
    if (!subject || !body || !csvContent) {
      setError('Please fill in all fields and upload a CSV.');
      return;
    }

    setError(null);
    setIsSending(true);
    setProgress({
      total: 0,
      sent: 0,
      failed: 0,
      results: [],
      isComplete: false
    });

    try {
      const response = await fetch('/api/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          csvContent,
          delayMs: delay,
          maxRetries: 1
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        const results = data.results as SendResult[];
        setProgress({
          total: results.length,
          sent: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'failed').length,
          results,
          isComplete: true
        });
        setActiveTab('logs');
      }
    } catch (err: any) {
      setError('Failed to connect to server. Make sure the backend is running.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Bulk Mailer <span className="text-cyan-400">Pro</span></h1>
              <p className="text-xs text-white/40 font-mono uppercase tracking-widest">Production Grade SMTP Tool</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                <div className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : serverStatus === 'checking' ? 'bg-yellow-500 animate-bounce' : 'bg-red-500'}`} />
                <span className="text-xs font-medium text-white/60">
                  {serverStatus === 'online' ? 'Server Online' : serverStatus === 'checking' ? 'Checking Server...' : 'Server Offline'}
                </span>
             </div>
             <button 
              onClick={() => window.open('https://support.google.com/accounts/answer/185833', '_blank')}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
             >
               <Settings className="w-3 h-3" />
               Setup Gmail App Password
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar / Navigation */}
          <div className="lg:col-span-3 space-y-2">
            <button 
              onClick={() => setActiveTab('compose')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'compose' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-white/50 hover:bg-white/5'}`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Compose</span>
            </button>
            <button 
              onClick={() => setActiveTab('recipients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'recipients' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-white/50 hover:bg-white/5'}`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Recipients</span>
              {csvContent && <div className="ml-auto w-2 h-2 bg-cyan-500 rounded-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'logs' ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-white/50 hover:bg-white/5'}`}
            >
              <Terminal className="w-5 h-5" />
              <span className="font-medium">Logs & Progress</span>
              {progress?.isComplete && <CheckCircle2 className="ml-auto w-4 h-4 text-green-500" />}
            </button>

            <div className="pt-8 mt-8 border-t border-white/5">
              <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4">Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 block mb-2">Delay between emails (ms)</label>
                  <input 
                    type="number" 
                    value={delay}
                    onChange={(e) => setDelay(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
              {activeTab === 'compose' && (
                <motion.div 
                  key="compose"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <div className="flex items-center gap-2 mb-6">
                      <FileCode className="w-5 h-5 text-cyan-400" />
                      <h2 className="text-lg font-semibold">Email Content</h2>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-white/50 block mb-2">Subject Line</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Special Offer for {{name}}!"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-white/50">Message Body (HTML Supported)</label>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={generateWithAI}
                              disabled={isGenerating}
                              className="text-[10px] flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md hover:bg-cyan-500/20 transition-all disabled:opacity-50"
                            >
                              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              AI Generate / Improve
                            </button>
                            <span className="text-[10px] text-white/30 font-mono">Use {"{{key}}"} for personalization</span>
                          </div>
                        </div>
                        <textarea 
                          rows={12}
                          placeholder="<h1>Hi {{name}}!</h1><p>Check out our latest update...</p>"
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all font-mono text-sm leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setActiveTab('recipients')}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-cyan-400 transition-colors group"
                    >
                      Next: Recipients
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'recipients' && (
                <motion.div 
                  key="recipients"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-cyan-400" />
                        <h2 className="text-lg font-semibold">Recipient List</h2>
                      </div>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 transition-colors"
                      >
                        Upload CSV
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".csv" 
                        className="hidden" 
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <textarea 
                          rows={10}
                          placeholder="email,name&#10;john@example.com,John Doe&#10;jane@example.com,Jane Smith"
                          value={csvContent}
                          onChange={(e) => setCsvContent(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all font-mono text-sm"
                        />
                        {!csvContent && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                            <FileText className="w-12 h-12 mb-2" />
                            <p className="text-sm">Paste CSV data or upload a file</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-cyan-200/70 leading-relaxed">
                          Ensure your CSV has an <code className="bg-cyan-500/20 px-1 rounded">email</code> column. Other columns like <code className="bg-cyan-500/20 px-1 rounded">name</code> can be used as variables in your email body using <code className="bg-cyan-500/20 px-1 rounded">{"{{name}}"}</code>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button 
                      onClick={() => setActiveTab('compose')}
                      className="px-6 py-3 text-white/50 hover:text-white transition-colors"
                    >
                      Back to Compose
                    </button>
                    <button 
                      onClick={startSending}
                      disabled={isSending}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Start Bulk Send
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'logs' && (
                <motion.div 
                  key="logs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                      <XCircle className="w-5 h-5" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {progress ? (
                    <div className="space-y-6">
                      {/* Progress Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Total</p>
                          <p className="text-3xl font-bold">{progress.total}</p>
                        </div>
                        <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-6">
                          <p className="text-[10px] font-bold text-green-500/50 uppercase tracking-widest mb-1">Sent</p>
                          <p className="text-3xl font-bold text-green-500">{progress.sent}</p>
                        </div>
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6">
                          <p className="text-[10px] font-bold text-red-500/50 uppercase tracking-widest mb-1">Failed</p>
                          <p className="text-3xl font-bold text-red-500">{progress.failed}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">Live Progress</h3>
                          <span className="text-sm font-mono text-white/40">
                            {Math.round(((progress.sent + progress.failed) / progress.total) * 100) || 0}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${((progress.sent + progress.failed) / progress.total) * 100}%` }}
                          />
                        </div>
                        {isSending && (
                          <p className="mt-4 text-xs text-white/40 animate-pulse flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Currently processing: <span className="text-white/60">{progress.currentEmail}</span>
                          </p>
                        )}
                      </div>

                      {/* Log Table */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Activity Log</h3>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-[#1a1a1a] text-[10px] font-bold text-white/30 uppercase tracking-widest">
                              <tr>
                                <th className="px-6 py-3 border-b border-white/10">Recipient</th>
                                <th className="px-6 py-3 border-b border-white/10">Status</th>
                                <th className="px-6 py-3 border-b border-white/10">Retries</th>
                                <th className="px-6 py-3 border-b border-white/10">Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {progress.results.slice().reverse().map((result, idx) => (
                                <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                  <td className="px-6 py-4 text-sm font-medium text-white/80">{result.email}</td>
                                  <td className="px-6 py-4">
                                    {result.status === 'success' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-[10px] font-bold uppercase">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Success
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-500 text-[10px] font-bold uppercase">
                                        <XCircle className="w-3 h-3" />
                                        Failed
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-xs text-white/40 font-mono">{result.retryCount}</td>
                                  <td className="px-6 py-4 text-xs text-white/30 italic">
                                    {result.error || 'Delivered successfully'}
                                  </td>
                                </tr>
                              ))}
                              {progress.results.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="px-6 py-20 text-center text-white/20 italic">
                                    No activity yet. Start a bulk send to see logs.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 bg-white/5 border border-white/10 border-dashed rounded-3xl opacity-40">
                      <Terminal className="w-16 h-16 mb-4" />
                      <p className="text-lg font-medium">No active session</p>
                      <p className="text-sm">Configure your campaign and hit send to see progress.</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-white/5 mt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h4 className="text-sm font-bold mb-4 text-white/80">About Bulk Mailer Pro</h4>
            <p className="text-xs text-white/40 leading-relaxed">
              A professional-grade tool designed for high-reliability email campaigns. Built with Node.js, Nodemailer, and React.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-4 text-white/80">Security & Privacy</h4>
            <p className="text-xs text-white/40 leading-relaxed">
              Credentials are never stored in the browser. All SMTP traffic is encrypted via TLS. Use App Passwords for maximum security.
            </p>
          </div>
          <div>
             <h4 className="text-sm font-bold mb-4 text-white/80">CLI Usage</h4>
             <div className="bg-black p-3 rounded-lg border border-white/10 font-mono text-[10px] text-cyan-400">
                npm run cli recipients.csv "Subject" body.html
             </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">© 2026 Bulk Mailer Pro. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] text-white/20 hover:text-white transition-colors uppercase tracking-widest">Documentation</a>
            <a href="#" className="text-[10px] text-white/20 hover:text-white transition-colors uppercase tracking-widest">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
