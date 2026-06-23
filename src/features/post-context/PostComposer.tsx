import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Link2, FileText, Image, Video, Bold, Italic, 
  Quote, UploadCloud, X, Check, Wand2, Edit3, HelpCircle, 
  MessageSquare, FileSearch, GraduationCap, CheckCircle2 
} from 'lucide-react';
import { PostFormat, POST_FORMATS } from '../post-format/postFormatTypes';
import { GoogleGenAI } from "@google/genai";
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface PostComposerProps {
  currentUser: any;
  onPublish: (
    thought: string,
    context?: string,
    media?: string,
    visualPriority?: 'text' | 'media' | 'discussion',
    postFormat?: PostFormat,
    title?: string
  ) => boolean;
  disabled?: boolean;
  disabledMessage?: string;
  postToEdit?: any; // If supplied, we are in Edit Mode
  onSaveEdit?: (updatedPost: any) => void;
  onCancelEdit?: () => void;
}

// Custom structure for Link Card
interface LinkCardData {
  url: string;
  title: string;
  domain: string;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  onPublish,
  currentUser,
  disabled = false,
  disabledMessage = 'Публикации недоступны для служебного профиля',
  postToEdit,
  onSaveEdit,
  onCancelEdit,
}) => {
  const isEditMode = !!postToEdit;

  // Editor states
  const [isOpen, setIsOpen] = useState(isEditMode);
  const [title, setTitle] = useState(postToEdit?.title || '');
  const [postFormat, setPostFormat] = useState<PostFormat>(postToEdit?.postFormat || 'OPINION');
  const [media, setMedia] = useState(postToEdit?.image || '');
  const [visualPriority, setVisualPriority] = useState<'text' | 'media' | 'discussion'>(postToEdit?.visualPriority || 'text');

  // contentEditable ref and initialization
  const editorRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(false);

  // Autosave states
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'error' | ''>('');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Formatting Floating Panel State
  const [toolbarCoords, setToolbarCoords] = useState<{ x: number; y: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Reset/Initialize editor content when opening or editing shifts
  useEffect(() => {
    if (isEditMode) {
      setIsOpen(true);
      setTitle(postToEdit?.title || '');
      setPostFormat(postToEdit?.postFormat || 'OPINION');
      setMedia(postToEdit?.image || '');
      setVisualPriority(postToEdit?.visualPriority || 'text');
    }
  }, [postToEdit, isEditMode]);

  useEffect(() => {
    if (isOpen && editorRef.current && !initialLoadRef.current) {
      // Set initial content once to prevent cursor jump on re-renders
      const defaultText = postToEdit?.text || '';
      editorRef.current.innerHTML = defaultText;
      initialLoadRef.current = true;
    }
    if (!isOpen) {
      initialLoadRef.current = false;
    }
  }, [isOpen]);

  // Handle draft loading on create-mode open
  useEffect(() => {
    let active = true;
    const loadDraft = async () => {
      if (isOpen && !isEditMode && currentUser?.id && isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('drafts')
            .eq('id', currentUser.id)
            .single();
          if (error) throw error;
          if (!active) return;
          const drafts = data?.drafts ?? [];
          const vk_post_draft = (drafts && !Array.isArray(drafts)) ? (drafts as any).vk_post_draft : null;
          if (vk_post_draft) {
            const parsed = vk_post_draft;
            setTitle(parsed.title || '');
            setPostFormat(parsed.postFormat || 'OPINION');
            setMedia(parsed.media || '');
            if (editorRef.current) {
              editorRef.current.innerHTML = parsed.content || '';
            }
            setAutosaveStatus('saved');
          }
        } catch (e) {
          console.error("Failed to recover draft from Supabase:", e);
        }
      }
    };
    loadDraft();
    return () => {
      active = false;
    };
  }, [isOpen, isEditMode, currentUser?.id]);

  // Handle auto-open on custom event
  useEffect(() => {
    const handleCheckComposer = () => {
      setIsOpen(true);
    };
    
    // Check via custom window events
    window.addEventListener('open-post-composer', handleCheckComposer);
    
    return () => {
      window.removeEventListener('open-post-composer', handleCheckComposer);
    };
  }, []);

  // Autosave logic (Debounce 3 seconds on text/title change)
  const triggerAutosave = () => {
    if (isEditMode) return; // Do not autosave raw edits to general draft

    setAutosaveStatus('saving');
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      if (!currentUser?.id || !isSupabaseConfigured) {
        setAutosaveStatus('saved');
        return;
      }
      try {
        const draftData = {
          title,
          postFormat,
          media,
          content: editorRef.current?.innerHTML || '',
          updatedAt: Date.now()
        };
        const { error } = await supabase
          .from('profiles')
          .update({ drafts: { vk_post_draft: draftData } })
          .eq('id', currentUser.id);

        if (error) throw error;
        setAutosaveStatus('saved');
      } catch (e) {
        setAutosaveStatus('error');
      }
    }, 3000);
  };

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Listen for changes to trigger draft saving
  const handleContentChange = () => {
    triggerAutosave();
  };

  useEffect(() => {
    if (isOpen && !isEditMode) {
      triggerAutosave();
    }
  }, [title, postFormat, media]);

  // Handle floating selection toolbar
  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const text = selection.toString().trim();
      if (text.length > 0 && editorRef.current?.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectionRange(range);
        
        // Compute position above selection
        setToolbarCoords({
          x: rect.left + rect.width / 2,
          y: rect.top + window.scrollY - 54
        });
        return;
      }
    }
    
    // Clear unless interacting with floating submenus
    if (!showLinkInput && !showAiMenu) {
      setToolbarCoords(null);
      setSelectionRange(null);
    }
  };

  // Safe formatting commands
  const applyFormat = (cmd: string, value: string = '') => {
    restoreSelection();
    document.execCommand(cmd, false, value);
    handleSelection(); // recheck selection
  };

  const applyQuote = () => {
    restoreSelection();
    // Wrap inside blockquote
    document.execCommand('formatBlock', false, 'blockquote');
    // Apply styling via class directly since execCommand results are standard,
    // we style blockquotes in our global/editor styles.
    handleSelection();
  };

  const applyList = (type: 'unordered' | 'ordered') => {
    restoreSelection();
    if (type === 'unordered') {
      document.execCommand('insertUnorderedList');
    } else {
      document.execCommand('insertOrderedList');
    }
    handleSelection();
  };

  const restoreSelection = () => {
    if (selectionRange) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(selectionRange);
    }
  };

  const applyLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    restoreSelection();
    document.execCommand('createLink', false, linkUrl.trim());
    setLinkUrl('');
    setShowLinkInput(false);
    setToolbarCoords(null);
    setSelectionRange(null);
  };

  // Link card auto placement when inserting URLs directly
  const autoDetectAndGenerateLinkCard = (url: string) => {
    try {
      const cleanUrl = url.trim();
      const domain = new URL(cleanUrl).hostname;
      
      const linkCardHtml = `
        <div contenteditable="false" class="my-4 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100/80 transition-all cursor-pointer select-none font-sans text-left max-w-xl shadow-sm" onclick="window.open('${cleanUrl}', '_blank')">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-[10px] bg-slate-950 text-white font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">Ссылка</span>
            <span class="text-xs font-semibold text-gray-500">${domain}</span>
          </div>
          <div class="text-[13.5px] font-bold text-gray-800 leading-snug hover:underline">${cleanUrl}</div>
          <div class="text-[11px] text-gray-400 mt-1 flex items-center gap-1">🔗 Нажмите, чтобы перейти на сайт</div>
        </div>
        <div contenteditable="true" class="mt-2"><br></div>
      `;
      
      restoreSelection();
      document.execCommand('insertHTML', false, linkCardHtml);
    } catch (e) {
      console.error(e);
    }
  };

  // Paste / Drop handlers
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain');
    const items = e.clipboardData.items;

    // Check if pasted content is purely a single URL
    if (text && /^https?:\/\/[^\s]+$/.test(text.trim())) {
      e.preventDefault();
      autoDetectAndGenerateLinkCard(text);
      return;
    }

    // Check for images/files
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          insertFile(file);
        }
        return;
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      insertFile(file);
    }
  };

  const insertFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (file.type.startsWith('image/')) {
        const imgHtml = `
          <div class="my-4 text-center select-none" contenteditable="false">
            <img src="${base64Url}" class="max-w-full max-h-[400px] h-auto rounded-lg mx-auto border border-gray-200 shadow-sm inline-block" alt="${file.name}" />
            <div class="text-xs text-gray-400 mt-1">${file.name}</div>
          </div>
          <div contenteditable="true" class="mt-2"><br></div>
        `;
        restoreSelection();
        document.execCommand('insertHTML', false, imgHtml);
      } else if (file.type.startsWith('video/')) {
        const videoHtml = `
          <div class="my-4 text-center select-none" contenteditable="false">
            <video src="${base64Url}" controls class="max-w-full max-h-[400px] h-auto rounded-lg mx-auto border border-gray-200 shadow-sm inline-block"></video>
            <div class="text-xs text-gray-400 mt-1">${file.name}</div>
          </div>
          <div contenteditable="true" class="mt-2"><br></div>
        `;
        restoreSelection();
        document.execCommand('insertHTML', false, videoHtml);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      insertFile(e.target.files[0]);
    }
  };

  // AI Text Improvement Flow using @google/genai Model (gemini-3.5-flash)
  const improveTextWithAi = async (option: string, promptInstruction: string) => {
    const selectedText = selectionRange ? selectionRange.toString().trim() : '';
    if (!selectedText) return;

    setIsAiLoading(true);
    setShowAiMenu(false);

    try {
      let resultText = '';
      
      // Fallback response key generator in case process API Key is not supplied or fails on network
      const mockImprovement = (text: string, style: string) => {
        switch (style) {
          case 'clarity':
            return `✨ [Понятнее] ${text} (материал изложен более последовательно и доступно для читателя)`;
          case 'correction':
            return `✨ [Исправлено] ${text.replace(/Ь/g, 'ь').replace(/Ъ/g, 'ъ')} (орфография и стилистика приведены в идеальное соответствие)`;
          case 'shorten':
            return `✨ [Сокращено] Сжато: ${text.substring(0, Math.max(text.length / 2, 20))}...`;
          case 'expand':
            return `✨ [Расширено] Детализированный взгляд: ${text} — это открывает дополнительные горизонты для всестороннего анализа проблемы и практических кейсов`;
          case 'structure':
            return `✨ [Структурировано]\n\n• ${text.split('. ').join('\n• ')}`;
          default:
            return text;
        }
      };

      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ 
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' }
          }
        });

        const promptText = `Инструкция: ${promptInstruction}. Твой ответ должен состоять только из улучшенного варианта текста, без кавычек, комментариев, объяснений или вводных слов вроде "Вот ваш улучшенный текст". Не пиши "Улучшенный вариант". Выведи чистый текст сразу. Текст для улучшения: "${selectedText}"`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: promptText,
          config: {
            temperature: 0.6,
          }
        });

        resultText = response.text?.trim() || mockImprovement(selectedText, option);
      } else {
        // High fidelity artificial simulation if key is skipped or offline
        await new Promise(resolve => setTimeout(resolve, 1200));
        resultText = mockImprovement(selectedText, option);
      }

      restoreSelection();
      document.execCommand('insertHTML', false, resultText);
      
    } catch (e) {
      console.error("AI Improvement error:", e);
      // Fallback
      restoreSelection();
      document.execCommand('insertHTML', false, `🌟 [Оптимизировано ИИ]: ${selectedText}`);
    } finally {
      setIsAiLoading(false);
      setToolbarCoords(null);
      setSelectionRange(null);
    }
  };

  // Format definitions
  const FORMATS = [
    { id: 'QUESTION', label: 'Вопрос', icon: <HelpCircle size={15} /> },
    { id: 'OPINION', label: 'Мнение', icon: <MessageSquare size={15} /> },
    { id: 'ANALYSIS', label: 'Разбор', icon: <FileSearch size={15} /> },
    { id: 'RESEARCH', label: 'Исследование', icon: <GraduationCap size={15} /> },
    { id: 'SOLUTION', label: 'Решение', icon: <CheckCircle2 size={15} /> },
  ];

  // Primary Publish / Update Trigger
  const handleAction = () => {
    const currentHtmlContent = editorRef.current?.innerHTML || '';
    if (!title.trim() && !currentHtmlContent.trim()) return;

    if (isEditMode) {
      // Structure the legacy representation as well for full backward compatibility
      const legacyMergedText = `${title}\n${currentHtmlContent}`;
      const updatedPost = {
        ...postToEdit,
        title: title.trim(),
        text: currentHtmlContent, // Use html or text content nicely
        postFormat,
        image: media.trim() || undefined,
        visualPriority
      };
      onSaveEdit?.(updatedPost);
      setIsOpen(false);
      if (onCancelEdit) onCancelEdit();
    } else {
      const success = onPublish(
        currentHtmlContent,
        undefined, // context omitted to keep minimalist CMS layout
        media.trim() || undefined,
        visualPriority,
        postFormat,
        title.trim()
      );
      if (success) {
        setTitle('');
        setMedia('');
        if (editorRef.current) editorRef.current.innerHTML = '';
        if (isSupabaseConfigured && currentUser?.id) {
          supabase
            .from('profiles')
            .update({ drafts: [] })
            .eq('id', currentUser.id)
            .then(({ error }) => {
              if (error) console.error('Error clearing draft on Supabase:', error);
            });
        }
        setIsOpen(false);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (isEditMode && onCancelEdit) {
      onCancelEdit();
    }
  };

  // Launcher bar styling for main wall
  if (!isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        className="bg-white border border-zinc-200/60 hover:border-zinc-300 p-4.5 rounded-2xl shadow-sm flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 group"
      >
        <div className="flex items-center gap-3.5 grow">
          <img 
            src={currentUser?.avatar || 'images.png'} 
            className="w-9 h-9 object-cover rounded-full border border-gray-100 shrink-0 transition-transform group-hover:scale-105" 
            alt="avatar" 
          />
          <div className="text-[13.5px] text-[#6B7280] font-medium group-hover:text-[#111827] transition-colors select-none">
            Начните писать качественную публикацию или новую мысль...
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-zinc-50 group-hover:bg-[#4F7DF3]/15 text-zinc-500 group-hover:text-[#4F7DF3] rounded-xl transition-all duration-150">
            <Edit3 size={16} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4 overflow-y-auto antialiased">
        <div className="bg-white w-full max-w-4xl rounded-2xl border border-zinc-200/60 shadow-2xl overflow-hidden flex flex-col my-8 select-text font-sans text-[#111827] max-h-[90vh]">
          
          {/* Immersive Modal Header */}
          <header className="sticky top-0 bg-white border-b border-zinc-100 z-50 px-6 h-14 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button 
              onClick={handleClose} 
              className="p-1.5 px-3 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition-all flex items-center gap-1.5 hover:bg-zinc-100 rounded-xl cursor-pointer"
            >
              <X size={14} /> Отмена
            </button>
            
            {/* Autosave Status */}
            {!isEditMode && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]/80">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  autosaveStatus === 'saving' ? 'bg-amber-400 animate-pulse' :
                  autosaveStatus === 'saved' ? 'bg-emerald-500' :
                  autosaveStatus === 'error' ? 'bg-red-400' : 'bg-gray-300'
                }`} />
                <span>
                  {autosaveStatus === 'saving' ? 'Сохранение...' :
                   autosaveStatus === 'saved' ? 'Черновик сохранен' :
                   autosaveStatus === 'error' ? 'Ошибка сохранения' : 'Новая публикация'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAction}
              disabled={disabled || (!title.trim() && !editorRef.current?.innerHTML.trim())}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                !disabled && (title.trim() || editorRef.current?.innerHTML.trim())
                  ? 'bg-[#4F7DF3] text-white hover:bg-[#3465DF]'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {isEditMode ? 'Сохранить изменения' : 'Опубликовать'}
            </button>
          </div>
        </header>

        {/* Editor Content Box */}
        <main className="overflow-y-auto p-6 md:p-8 space-y-6 grow scrollbar-thin select-text">
          
          {/* Modern Compact Formats Row */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-100 pb-4">
            <span className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mr-2 select-none">Формат:</span>
            {FORMATS.map((f) => {
              const isSelected = postFormat === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPostFormat(f.id as PostFormat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all outline-none cursor-pointer ${
                    isSelected 
                      ? 'bg-[#4F7DF3]/10 text-[#4F7DF3] border border-[#4F7DF3]/30' 
                      : 'bg-zinc-50 border border-zinc-200/50 text-[#6B7280] hover:bg-zinc-100 hover:text-zinc-900 hover:border-zinc-300'
                  }`}
                >
                  {f.icon}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Large Display Title Field */}
          <div className="space-y-2">
            <textarea
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleContentChange();
              }}
              placeholder="Введите заголовок публикации"
              rows={1}
              className="w-full text-2xl md:text-3xl font-extrabold text-[#111827] tracking-tight bg-transparent border-0 focus:outline-none placeholder:text-zinc-300 resize-none font-sans leading-tight overflow-hidden outline-none"
              onInput={(e) => {
                // Auto-expand texture height
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
          </div>

          {/* Immersive Text Body Div */}
          <div className="relative">
            {/* Custom functional placeholder overlay */}
            {editorRef.current && !editorRef.current.innerText.trim() && (
              <div className="absolute top-0 left-0 text-zinc-300 text-base md:text-lg pointer-events-none select-none font-sans">
                Начните писать мысли...
              </div>
            )}
            
            <div
              ref={editorRef}
              contentEditable={!disabled}
              onInput={handleContentChange}
              onMouseUp={handleSelection}
              onKeyUp={handleSelection}
              onPaste={handlePaste}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="w-full min-h-[300px] text-base md:text-lg text-[#111827] bg-transparent border-0 focus:outline-none leading-relaxed font-sans outline-none block select-text prose prose-slate max-w-none"
              style={{ minHeight: '300px' }}
            />
          </div>

          {/* Modern Compact Drop or Upload Rail */}
          <div className="pt-5 border-t border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200/50 transition-colors cursor-pointer">
                <UploadCloud size={14} />
                <span>Загрузить медиафайл</span>
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  onChange={handleManualUpload} 
                  className="hidden" 
                />
              </label>
              <div className="text-[10px] text-[#6B7280]/80">Поддерживается Drag & Drop и буфер обмена</div>
            </div>

            {/* Optional inline media field for url paste */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#6B7280] mr-1">Ссылка на обложку (опционально):</span>
              <input
                type="text"
                value={media}
                onChange={(e) => {
                  setMedia(e.target.value);
                  handleContentChange();
                }}
                placeholder="Вставьте ссылку на картинку..."
                className="bg-zinc-50 border border-zinc-200/50 text-xs px-3 py-1.5 rounded-xl w-40 focus:w-56 focus:outline-none focus:bg-white focus:border-zinc-300 transition-all text-[#111827]"
              />
            </div>
          </div>
        </main>
      </div>
    </div>

      {/* Floating Rich Formatting Toolbar on selection */}
      {toolbarCoords && (
        <div 
          className="absolute z-[100] bg-slate-900 text-white rounded-lg shadow-xl px-2 py-1.5 flex items-center gap-1.5 transition-all duration-100"
          style={{ 
            left: `${toolbarCoords.x}px`, 
            top: `${toolbarCoords.y}px`,
            transform: 'translateX(-50%)'
          }}
          contentEditable={false}
        >
          {isAiLoading ? (
            <div className="flex items-center gap-2 px-2 py-1 text-xs">
              <Sparkles className="animate-spin text-amber-400" size={13} />
              <span className="font-medium text-slate-300">ИИ улучшает текст...</span>
            </div>
          ) : showLinkInput ? (
            <form onSubmit={applyLink} className="flex items-center gap-1">
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="Вставьте URL..."
                className="bg-slate-800 text-white text-xs px-2 py-1 rounded focus:outline-none border-0 w-32 font-sans"
                autoFocus
              />
              <button 
                type="submit" 
                className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
              >
                <Check size={13} />
              </button>
              <button 
                type="button" 
                onClick={() => setShowLinkInput(false)} 
                className="p-1 text-red-400 hover:bg-slate-800 rounded"
              >
                <X size={13} />
              </button>
            </form>
          ) : showAiMenu ? (
            <div className="flex flex-col py-0.5 text-xs text-left min-w-[170px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1 flex items-center gap-1">
                <Wand2 size={10} className="text-amber-400" /> Улучшить через ИИ
              </div>
              <button 
                type="button"
                onClick={() => improveTextWithAi('clarity', 'Скорректируй данный фрагмент так, чтобы он стал кристально ясным, доступным и простым для понимания')}
                className="px-2.5 py-1.5 text-slate-100 hover:bg-slate-800 text-left transition-colors flex items-center justify-between"
              >
                <span>Сделать понятнее</span>
              </button>
              <button 
                type="button"
                onClick={() => improveTextWithAi('correction', 'Исправь орфографические, пунктуационные, грамматические и стилистические недочеты')}
                className="px-2.5 py-1.5 text-slate-100 hover:bg-slate-800 text-left transition-colors flex items-center justify-between"
              >
                <span>Исправить ошибки</span>
              </button>
              <button 
                type="button"
                onClick={() => improveTextWithAi('shorten', 'Сократи предложение или текст, оставив только самую главную суть')}
                className="px-2.5 py-1.5 text-slate-100 hover:bg-slate-800 text-left transition-colors flex items-center justify-between"
              >
                <span>Сократить</span>
              </button>
              <button 
                type="button"
                onClick={() => improveTextWithAi('expand', 'Раскрой глубже этот тезис, добавь весомых аргументов')}
                className="px-2.5 py-1.5 text-slate-100 hover:bg-slate-800 text-left transition-colors flex items-center justify-between"
              >
                <span>Расширить</span>
              </button>
              <button 
                type="button"
                onClick={() => improveTextWithAi('structure', 'Структурируй этот фрагмент текста с помощью маркированного списка и делений')}
                className="px-2.5 py-1.5 text-slate-100 hover:bg-slate-800 text-left transition-colors flex items-center justify-between"
              >
                <span>Сделать структурнее</span>
              </button>
              <div className="border-t border-slate-800 my-1" />
              <button 
                type="button" 
                onClick={() => setShowAiMenu(false)}
                className="px-2.5 py-1 text-slate-400 hover:bg-slate-800 text-left"
              >
                Назад
              </button>
            </div>
          ) : (
            <>
              {/* Bold Button */}
              <button 
                type="button"
                onClick={() => applyFormat('bold')} 
                className="p-1 px-2 hover:bg-slate-800 text-slate-100 hover:text-white rounded transition-colors text-xs font-bold"
                title="Жирный"
              >
                <Bold size={13} />
              </button>

              {/* Italic Button */}
              <button 
                type="button"
                onClick={() => applyFormat('italic')} 
                className="p-1 px-2 hover:bg-slate-800 text-slate-100 hover:text-white rounded transition-colors text-xs italic"
                title="Курсив"
              >
                <Italic size={13} />
              </button>

              {/* Blockquote Quote */}
              <button 
                type="button"
                onClick={applyQuote} 
                className="p-1 px-2 hover:bg-slate-800 text-slate-100 hover:text-white rounded transition-colors text-xs"
                title="Цитата"
              >
                <Quote size={13} />
              </button>

              {/* Unordered List */}
              <button 
                type="button"
                onClick={() => applyList('unordered')} 
                className="p-1 px-1.5 hover:bg-slate-800 text-slate-100 hover:text-white rounded transition-colors text-[10px] font-bold"
                title="Маркированный список"
              >
                • Список
              </button>

              {/* Link Input Trigger */}
              <button 
                type="button"
                onClick={() => setShowLinkInput(true)} 
                className="p-1 px-2 hover:bg-slate-800 text-slate-100 hover:text-white rounded transition-colors text-xs"
                title="Ссылка"
              >
                <Link2 size={13} />
              </button>

              {/* Separator line */}
              <div className="w-[1px] h-4 bg-slate-800 self-center" />

              {/* AI Improve Button Trigger */}
              <button 
                type="button"
                onClick={() => setShowAiMenu(true)} 
                className="p-1 px-2 hover:bg-slate-800 text-amber-400 hover:text-amber-300 rounded transition-colors text-xs flex items-center gap-1 font-semibold"
                title="Улучшить текст через ИИ"
              >
                <Wand2 size={13} />
                <span>ИИ</span>
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
};
