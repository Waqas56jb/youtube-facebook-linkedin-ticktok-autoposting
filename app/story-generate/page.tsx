"use client";
import { useEffect, useState } from 'react';
import { generateStory } from '../../lib/api';
import Shell from '../../components/Shell'

interface StorySegment {
  title: string;
  content: string;
  type: 'title' | 'core-lessons' | 'segment' | 'cta';
}

interface StoryBox {
  id: string;
  segmentTitle: string;
  instruction: string;
  hooks: string[];
  scriptToRead: string;
  closingQuestion: string;
}

export default function Page() {
  const [transcript, setTranscript] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [segments, setSegments] = useState<StorySegment[]>([]);
  const [storyBoxes, setStoryBoxes] = useState<StoryBox[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [buttonStates, setButtonStates] = useState<{[key: string]: {copy: boolean, download: boolean}}>({});
  const [fullStory, setFullStory] = useState('');
  const [wrap, setWrap] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [structured, setStructured] = useState<{
    title: string;
    intro: string;
    lessons: string[];
    segments: Array<{ index: number; raw: string; title: string }>;
    closing: string;
  } | null>(null);

  // Extract strict-template structure
  const buildStructuredFromText = (text: string) => {
    const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
    const nonEmpty = (s: string) => s.trim().length > 0;
    const firstIdx = lines.findIndex(nonEmpty);
    const title = firstIdx >= 0 ? lines[firstIdx].trim() : '';
    // Intro is next non-empty line after title
    let i = firstIdx + 1;
    while (i < lines.length && !nonEmpty(lines[i])) i++;
    const intro = i < lines.length ? lines[i].trim() : '';
    // Core Lessons block
    const clIdx = lines.findIndex(l => /\bCore Lessons\b/i.test(l));
    const lessons: string[] = [];
    if (clIdx !== -1) {
      let j = clIdx + 1;
      while (j < lines.length && lessons.length < 10) {
        const t = lines[j].trim();
        if (!t) break;
        lessons.push(t);
        j++;
      }
    }
    // Segment indices (match any line containing "Segment <n>:")
    const segStarts: number[] = [];
    lines.forEach((l, idx) => {
      if (/Segment\s*\d+\s*:/i.test(l)) segStarts.push(idx);
    });
    const segments: Array<{ index: number; raw: string; title: string }> = [];
    for (let s = 0; s < segStarts.length; s++) {
      const start = segStarts[s];
      const end = s + 1 < segStarts.length ? segStarts[s + 1] : lines.length;
      const block = lines.slice(start + 1, end); // exclude the line with "Segment X:"
      // find first non-empty as title
      let k = 0; while (k < block.length && !nonEmpty(block[k])) k++;
      const segTitle = block[k]?.trim() || `Segment ${s + 1}`;
      const raw = block.join('\n').trim();
      segments.push({ index: s + 1, raw, title: segTitle });
    }
    // Closing: last 3 non-empty lines after last segment end
    let closing = '';
    if (segStarts.length > 0) {
      const lastStart = segStarts[segStarts.length - 1];
      const after = lines.slice(lastStart);
      const tail = after.filter(nonEmpty);
      closing = tail.slice(-3).join('\n');
    }
    return { title, intro, lessons, segments, closing };
  };

  const parseStoryIntoBoxes = (storyText: string): StoryBox[] => {
    console.log('Raw story text:', storyText);
    
    const boxes: StoryBox[] = [];
    
    // Helper to create empty box
    const createBox = (i: number): StoryBox => ({
        id: `box-${i + 1}`,
        segmentTitle: '',
        instruction: '',
        hooks: [],
        scriptToRead: '',
        closingQuestion: ''
      });

    // Split by segment headers like "# 🎬 Segment 1: ..." or "# 🎬 Final Call to Action"
    const headerRegex = /^#\s*🎬\s*(.*)$/gm;
    const indices: Array<{ start: number; header: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = headerRegex.exec(storyText)) !== null) {
      indices.push({ start: match.index, header: match[1].trim() });
    }

    const chunks: Array<{ header: string; body: string }> = [];
    for (let i = 0; i < indices.length; i++) {
      const start = indices[i].start;
      const end = i + 1 < indices.length ? indices[i + 1].start : storyText.length;
      chunks.push({ header: indices[i].header, body: storyText.slice(start, end) });
    }

    // If no headers found, try heuristic headings
    if (chunks.length === 0) {
      const lines = storyText.split(/\r?\n/);
      const isHeading = (s: string) => {
        const t = s.trim();
        if (!t) return false;
        if (/^["'\-•\d]/.test(t)) return false;
        if (t.length > 80) return false;
        if (/(^core lessons:?$)/i.test(t)) return false;
        const words = t.split(/\s+/);
        if (words.length < 2 || words.length > 8) return false;
        const capitals = words.slice(0, 3).filter(w => /^[A-Z]/.test(w)).length;
        return capitals >= 2 || /:/.test(t);
      };

      // Core lessons block
    let coreLessons = '';
      const coreIdx = lines.findIndex(l => /core lessons\s*:?/i.test(l));
      if (coreIdx !== -1) {
        const rest = lines.slice(coreIdx + 1);
        const endIdx = rest.findIndex(l => !l.trim());
        coreLessons = rest.slice(0, endIdx === -1 ? undefined : endIdx).join('\n').trim();
      }

      // Collect heading-based sections
      const secIdxs: number[] = [];
      lines.forEach((l, i) => { if (isHeading(l)) secIdxs.push(i); });
      const sections: Array<{ title: string; body: string }> = [];
      for (let i = 0; i < secIdxs.length; i++) {
        const s = secIdxs[i];
        const e = i + 1 < secIdxs.length ? secIdxs[i + 1] : lines.length;
        const title = lines[s].replace(/:$/, '').trim();
        const body = lines.slice(s + 1, e).join('\n').trim();
        if (title && body) sections.push({ title, body });
      }

      for (let i = 0; i < 4; i++) boxes.push(createBox(i));
      // Overview
      boxes[0].segmentTitle = sections[0]?.title || 'Story Overview';
      boxes[0].scriptToRead = coreLessons || sections[0]?.body || storyText.trim();
      // Next sections
      sections.slice(1, 4).forEach((sec, idx) => {
        boxes[idx + 1].segmentTitle = sec.title;
        boxes[idx + 1].scriptToRead = sec.body;
      });
      return boxes;
    }

    const clean = (s: string) => s.replace(/^#+\s*/gm, '').replace(/^\*\*|\*\*$/g, '').replace(/^"|"$/g, '').trim();
    const extractBetween = (src: string, startRe: RegExp, endRe: RegExp) => {
      const start = src.search(startRe);
      if (start === -1) return '';
      const after = src.slice(start);
      const end = endRe.exec(after)?.index ?? after.length;
      return after.slice(0, end).replace(startRe, '').trim();
    };

    chunks.slice(0, 4).forEach((chunk, i) => {
      const box = createBox(i);
      // Title from header
      const segTitle = chunk.header.replace(/^Segment\s*\d+:/i, '').replace(/^Final Call to Action/i, 'Final Call to Action').trim();
      box.segmentTitle = segTitle || `Segment ${i + 1}`;

      // Instruction
      box.instruction = clean(
        extractBetween(
          chunk.body,
          /\*\*\s*🧠\s*Instruction:\s*\*\*[\r\n]*/i,
          /(^###\s*|^🛑)/im
        )
      );

      // Hooks
      const hooksBlock = extractBetween(
        chunk.body,
        /###\s*🔊\s*\*\*?HOOKS\*\*?[\r\n]*/i,
        /(^###\s*🎤|^###\s*❓|^🛑)/im
      );
      const hooks = hooksBlock
        .split(/\n/)
        .map(l => l.replace(/\*\*/g, '').replace(/^["']|["']$/g, '').replace(/^[-•\s\d\.]+/, '').trim())
        .filter(Boolean);
      box.hooks = hooks.slice(0, 3);

      // Script to Read
      box.scriptToRead = clean(
        extractBetween(
          chunk.body,
          /###\s*🎤\s*\*\*?SCRIPT TO READ:?\*\*?[\r\n]*/i,
          /(^###\s*❓|^🛑)/im
        )
      );

      // Closing Question
      box.closingQuestion = clean(
        extractBetween(
          chunk.body,
          /###\s*❓\s*\*\*?Closing Question:?\*\*?[\r\n]*/i,
          /^🛑/im
        )
      );

      // --- Heuristics to populate missing fields ---
      const bodyPlain = clean(chunk.body);
      const paragraphs = bodyPlain.split(/\n\s*\n/).filter(Boolean);
      const lines = bodyPlain.split(/\n/).map(l => l.trim()).filter(Boolean);

      // Instruction fallback: first descriptive paragraph
      if (!box.instruction) {
        const firstPara = paragraphs.find(p => p.length > 40) || paragraphs[0] || '';
        box.instruction = firstPara.split(/\n/)[0].slice(0, 280);
      }

      // Hooks fallback: take up to 3 short compelling lines or generate from title
      if (!box.hooks || box.hooks.length === 0) {
        const candidateLines = lines
          .filter(l => l.length >= 20 && l.length <= 120)
          .slice(0, 6);
        const picked = candidateLines.slice(0, 3);
        while (picked.length < 3) {
          const t = box.segmentTitle || `Segment ${i + 1}`;
          if (picked.length === 0) picked.push(`Why ${t} matters`);
          else if (picked.length === 1) picked.push(`Common mistakes in ${t}`);
          else picked.push(`Quick wins for ${t}`);
        }
        box.hooks = picked.map(h => h.replace(/^"|"$/g, ''));
      }

      // Closing question fallback: last question-mark line; else synthesize
      if (!box.closingQuestion) {
        const question = [...lines].reverse().find(l => l.endsWith('?'));
        box.closingQuestion = question || `What is your next step for ${box.segmentTitle}?`;
      }

      boxes.push(box);
    });
    
    console.log('Final boxes:', boxes);
    return boxes;
  };

  // Button action functions
  const handleCopyBox = async (boxId: string, box: StoryBox) => {
    setButtonStates(prev => ({ ...prev, [boxId]: { ...prev[boxId], copy: true } }));
    
    try {
      const boxContent = `Segment Title: ${box.segmentTitle}\n\nInstruction: ${box.instruction}\n\nHooks:\n${box.hooks.map((hook, i) => `${i + 1}. ${hook}`).join('\n')}\n\nScript to Read:\n${box.scriptToRead}\n\nClosing Question: ${box.closingQuestion}`;
      await navigator.clipboard.writeText(boxContent);
      
      // Show success feedback
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, [boxId]: { ...prev[boxId], copy: false } }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setButtonStates(prev => ({ ...prev, [boxId]: { ...prev[boxId], copy: false } }));
    }
  };

  const handleDownloadBox = async (boxId: string, box: StoryBox) => {
    setButtonStates(prev => ({ ...prev, [boxId]: { ...prev[boxId], download: true } }));
    
    try {
      const boxContent = `Segment Title: ${box.segmentTitle}\n\nInstruction: ${box.instruction}\n\nHooks:\n${box.hooks.map((hook, i) => `${i + 1}. ${hook}`).join('\n')}\n\nScript to Read:\n${box.scriptToRead}\n\nClosing Question: ${box.closingQuestion}`;
      const blob = new Blob([boxContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${box.segmentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_segment.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      // Show success feedback
      setTimeout(() => {
        setButtonStates(prev => ({ ...prev, [boxId]: { ...prev[boxId], download: false } }));
      }, 2000);
    } catch (error) {
      console.error('Failed to download:', error);
      setButtonStates(prev => ({ ...prev, [boxId]: { ...prev[boxId], download: false } }));
    }
  };

  const parseStoryIntoSegments = (storyText: string): StorySegment[] => {
    const lines = storyText.split('\n');
    const segments: StorySegment[] = [];
    let currentSegment: StorySegment | null = null;
    let segmentContent: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        if (segmentContent.length > 0) {
          segmentContent.push('');
        }
        continue;
      }
      
      // Detect title (first non-empty line that's not bold)
      if (segments.length === 0 && !line.startsWith('**') && !line.includes('🎬') && !line.includes('Core Lessons')) {
        segments.push({
          title: 'Story Title',
          content: line,
          type: 'title'
        });
        continue;
      }
      
      // Detect Core Lessons
      if (line.includes('Core Lessons')) {
        if (currentSegment) {
          currentSegment.content = segmentContent.join('\n').trim();
          segments.push(currentSegment);
        }
        currentSegment = {
          title: 'Core Lessons',
          content: '',
          type: 'core-lessons'
        };
        segmentContent = [];
        continue;
      }
      
      // Detect segment titles (bold text that's not Core Lessons)
      if (line.startsWith('**') && line.endsWith('**') && !line.includes('Core Lessons')) {
        if (currentSegment) {
          currentSegment.content = segmentContent.join('\n').trim();
          segments.push(currentSegment);
        }
        const cleanTitle = line.replace(/\*\*/g, '').replace('🎬', '').trim();
        currentSegment = {
          title: cleanTitle,
          content: '',
          type: 'segment'
        };
        segmentContent = [];
        continue;
      }
      
      // Add content to current segment
      if (currentSegment) {
        segmentContent.push(line);
      }
    }
    
    // Add the last segment
    if (currentSegment) {
      currentSegment.content = segmentContent.join('\n').trim();
      segments.push(currentSegment);
    }
    
    return segments;
  };

  const updateSegment = (index: number, content: string) => {
    setSegments(prev => prev.map((seg, i) => 
      i === index ? { ...seg, content } : seg
    ));
  };

  const updateStoryBox = (boxId: string, field: 'segmentTitle' | 'instruction' | 'scriptToRead' | 'closingQuestion', value: string) => {
    setStoryBoxes(prev => prev.map(box => 
      box.id === boxId ? { ...box, [field]: value } : box
    ));
  };

  const updateStoryBoxHook = (boxId: string, hookIndex: number, value: string) => {
    setStoryBoxes(prev => prev.map(box => 
      box.id === boxId ? { 
        ...box, 
        hooks: box.hooks.map((hook, index) => index === hookIndex ? value : hook)
      } : box
    ));
  };

  const getFullStory = () => {
    return segments.map(seg => {
      if (seg.type === 'title') return seg.content;
      if (seg.type === 'core-lessons') return `**${seg.title}:**\n${seg.content}`;
      if (seg.type === 'segment') return `**🎬 ${seg.title}**\n\n${seg.content}`;
      return seg.content;
    }).join('\n\n');
  };

  const getFullStoryFromBoxes = () => {
    if (storyBoxes.length === 0) return '';
    
    let fullStory = '';
    
    storyBoxes.forEach((box, index) => {
      if (box.segmentTitle) {
        const segmentNumber = index + 1;
        const isFinalCTA = index === storyBoxes.length - 1;
        
        if (isFinalCTA) {
          fullStory += `# 🎬 Final Call to Action\n\n`;
        } else {
          fullStory += `# 🎬 Segment ${segmentNumber}: ${box.segmentTitle}\n\n`;
        }
        
        if (box.instruction) {
          fullStory += `**🧠 Instruction:**\n${box.instruction}\n\n`;
        }
        
        if (box.hooks.length > 0) {
          fullStory += `### 🔊 **HOOKS**\n\n`;
          box.hooks.forEach(hook => {
            fullStory += `**"${hook}"**\n`;
          });
          fullStory += '\n';
        }
        
        if (box.scriptToRead) {
          fullStory += `### 🎤 **SCRIPT TO READ:**\n\n${box.scriptToRead}\n\n`;
        }
        
        if (box.closingQuestion) {
          fullStory += `### ❓ **Closing Question:**\n${box.closingQuestion}\n\n`;
        }
        
        fullStory += `🛑 ${isFinalCTA ? 'End' : 'Cut'}\n\n`;
      }
    });
    
    return fullStory.trim();
  };

  const formatWithSegmentSpacing = (text: string): string => {
    try {
      const lines = text.replace(/\r\n/g, '\n').split('\n');
      const result: string[] = [];
      let firstHeaderSeen = false;
      for (const line of lines) {
        const isHeader = /^#\s*🎬\s*/.test(line.trim());
        if (isHeader) {
          if (firstHeaderSeen) {
            // insert ~5 blank lines between segments
            result.push('', '', '', '', '');
          }
          firstHeaderSeen = true;
        }
        result.push(line);
      }
      return result.join('\n');
    } catch {
      return text;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('transcriptPayload');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { transcript?: string };
          if (parsed?.transcript) setTranscript(parsed.transcript);
        } catch {}
      }
    }
  }, []);

  return (
    <Shell title="Story Generate">
      <div className="min-h-screen bg-neutral-950">
        {/* Simple header */}
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-100">Story Generator</h1>
            <div className="flex flex-wrap gap-2">
              <Preset onClick={() => setTranscript(t=>`${t}${t && !t.endsWith('\n') ? '\n' : ''}Summarize key insights in 3 short paragraphs. Focus on benefits and clarity.`)}>Blog</Preset>
              <Preset onClick={() => setTranscript(t=>`${t}${t && !t.endsWith('\n') ? '\n' : ''}Craft a short narrative hook (2-3 lines), then a punchy takeaway.`)}>Narrative</Preset>
              <Preset onClick={() => setTranscript(t=>`${t}${t && !t.endsWith('\n') ? '\n' : ''}Transform into a reel script: hook • value • CTA. Max 120 words.`)}>Reel</Preset>
            </div>
          </div>
          <p className="text-sm text-neutral-400 mt-2">Paste transcript, generate, and preview the exact formatted story.</p>
        </div>

        {/* Main content with improved layout */}
        <div className="space-y-12">
          {/* Input Section */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/30 to-blue-600/30 rounded-3xl blur opacity-20" />
            <div className="relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-lg">📄</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-white">Transcript Input</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
                    {transcript.trim().split(/\s+/).filter(Boolean).length} words
                  </div>
                </div>
            </div>
              
              <div className="relative">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste your transcript text here and watch it transform into a structured story..."
                  className="w-full h-80 p-6 rounded-2xl border border-white/10 bg-black/20 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-base leading-relaxed"
                />
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-xs text-gray-400">Press Ctrl+Enter to generate</span>
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-center">
              <button
                disabled={!transcript.trim() || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const res = await generateStory(transcript);
                    console.log('Generated story:', res.story); // Debug log
                    setOutput(res.story);
                    const spaced = formatWithSegmentSpacing(res.story || '');
                    setFullStory(spaced);
                    try { setStructured(buildStructuredFromText(spaced)); } catch {}
                    const parsedSegments = parseStoryIntoSegments(res.story);
                    setSegments(parsedSegments);
                    const parsedBoxes = parseStoryIntoBoxes(res.story);
                    console.log('Parsed boxes:', parsedBoxes); // Debug log
                    setStoryBoxes(parsedBoxes);
                    try {
                      sessionStorage.setItem('latestStory', res.story || '');
                    } catch {}
                    try {
                      localStorage.setItem('latestStory', res.story || '');
                    } catch {}
                  } finally {
                    setBusy(false);
                  }
                }}
                  className="h-12 px-6 rounded-md bg-red-600 text-white font-semibold text-base shadow-lg hover:bg-red-500 active:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3 ring-1 ring-red-800/30"
                >
                  <div className="relative flex items-center gap-3">
                    {busy ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generating Story...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">✨</span>
                        <span>Generate Story</span>
                      </>
                    )}
                  </div>
              </button>
              </div>
            </div>
          </div>

          {/* Story Single Text Section */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/30 to-blue-600/30 rounded-3xl blur opacity-20" />
            <div className="relative bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center">
                    <span className="text-lg">📚</span>
                  </div>
                  <h3 className="text-3xl font-semibold text-white">Story</h3>
                </div>
                {fullStory && (
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setWrap(v => !v)}
                      className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                    >
                      {wrap ? '↔ No Wrap' : '↩ Wrap Lines'}
                    </button>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <span className="hidden sm:inline">Font</span>
                      <input
                        type="range"
                        min={12}
                        max={20}
                        value={fontSize}
                        onChange={e => setFontSize(parseInt(e.target.value, 10))}
                        className="accent-blue-500"
                      />
                      <span className="tabular-nums w-8 text-right">{fontSize}</span>
                    </div>
                    <button
                      onClick={() => {
                          const txt = fullStory;
                          navigator.clipboard?.writeText(txt).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }).catch(()=>{})
                      }}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ring-1 ${
                        copied 
                            ? 'bg-green-600 text-white shadow-lg ring-green-800/30' 
                            : 'bg-red-600 text-white shadow-lg hover:bg-red-500 active:bg-red-400 ring-red-800/30'
                      }`}
                    >
                        {copied ? '✓ Copied!' : '📋 Copy All'}
                    </button>
                    <button
                      onClick={() => {
                          const txt = fullStory;
                          const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'story.txt';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }}
                        className="px-4 py-2 rounded-md text-sm font-semibold bg-red-600 text-white shadow-lg hover:bg-red-500 active:bg-red-400 transition-colors ring-1 ring-red-800/30"
                    >
                        💾 Download
                    </button>
                  </div>
                )}
            </div>
            
              <div className="grid grid-cols-1 gap-8">
                <div className="relative rounded-2xl border border-white/10 bg-black/30 p-0 overflow-hidden">
                  <div className="px-6 py-3 border-b border-white/10 text-xs text-white/70 flex items-center justify-between">
                    <span>Preview (spacing preserved)</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-[11px]">
                        <input type="checkbox" onChange={(e)=>{ const t = e.target.checked ? (fullStory.replace(/\n\n/g,'\n\n\n')) : (output||fullStory); setFullStory(t); }} />
                        Add natural pauses
                      </label>
                      <span className="hidden sm:inline">Monospace · {wrap ? 'Wrapped' : 'No Wrap'}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <pre
                      style={{ fontSize: `${fontSize}px` }}
                      className={`font-mono leading-relaxed text-white ${wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-auto'} max-h-[60vh]`}
                    >{fullStory}</pre>
                  </div>
                </div>
              </div>
                {structured && (
                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {structured.segments.slice(0,4).map(seg => (
                      <div key={seg.index} className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f0f12] to-[#0b0c10] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
                          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-wide text-white/80">
                            <span className="inline-block px-2 py-0.5 rounded bg-red-600 text-white ring-1 ring-red-800/30">Segment {seg.index}</span>
                            <span className="text-white/60">Title</span>
                          </span>
                          <div className="text-sm sm:text-base font-semibold text-white truncate max-w-[60%]">{seg.title}</div>
                        </div>
                        <div className="p-4">
                          <div className="text-white/90 whitespace-pre-wrap text-sm leading-relaxed">{seg.raw}</div>
                          <div className="mt-4 h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
                          <div className="flex items-center gap-2 mt-4">
                            <button
                              onClick={() => navigator.clipboard.writeText(seg.raw)}
                              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 ring-1 ring-red-800/30"
                            >
                              Copy Segment {seg.index}
                            </button>
                            <button
                              onClick={() => {
                                const blob = new Blob([seg.raw], { type: 'text/plain;charset=utf-8' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url; a.download = `segment${seg.index}.txt`;
                                document.body.appendChild(a); a.click(); a.remove();
                                URL.revokeObjectURL(url);
                              }}
                              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 ring-1 ring-red-800/30"
                            >
                              Download Segment {seg.index}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 lg:col-span-2">
                      <div className="text-base font-semibold text-white">Entire Story</div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(fullStory)}
                          className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 ring-1 ring-red-800/30"
                        >
                          Copy Entire Story
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([fullStory], { type: 'text/plain;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = 'story.txt';
                            document.body.appendChild(a); a.click(); a.remove();
                            URL.revokeObjectURL(url);
                          }}
                          className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-semibold shadow-lg hover:bg-red-500 active:bg-red-400 ring-1 ring-red-800/30"
                        >
                          Download Entire Story
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function Preset({ children, onClick }: { children: React.ReactNode, onClick: ()=>void }) {
  return (
    <button 
      onClick={onClick} 
      className="group relative px-4 py-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm text-sm text-white/90 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="relative">{children}</span>
    </button>
  )
}


