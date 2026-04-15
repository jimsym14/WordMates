'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useColorStyle } from '@/components/color-style-provider';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface DictionaryDefinitionProps {
    word: string;
    isWinState: boolean;
}

interface DictionaryDef {
    definition: string;
    example?: string;
}

interface Meaning {
    partOfSpeech: string;
    definitions: DictionaryDef[];
}

interface Phonetic {
    text?: string;
    audio?: string;
}

interface DictionaryResponse {
    word: string;
    phonetic?: string;
    phonetics?: Phonetic[];
    meanings: Meaning[];
}

const stripHtml = (html: string) => {
    if (typeof window === 'undefined') return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

/**
 * Detects if a definition is just a pointer to another word 
 * (e.g. "plural of swot"). Returns the base word if found.
 */
const extractBaseWord = (html: string): string | null => {
    if (typeof window === 'undefined') return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // Wiktionary specific class for "Form of" links
    const link = doc.querySelector('.form-of-definition-link');
    if (link && link.textContent) {
        return link.textContent.trim();
    }
    
    // Heuristic fallback for plain text / definition-only blobs
    const text = doc.body.textContent || "";
    const formOfMatch = text.match(/^(?:plural|past tense|past participle|present participle|third-person|indicative form|alternative form|plural|archaic form) of\s+([a-z-]+)/i);
    if (formOfMatch) {
        return formOfMatch[1];
    }
    
    return null;
};

const formatPronunciation = (arpabetStr?: string) => {
    if (!arpabetStr) return '';
    const map: Record<string, string> = {
        'AA': 'ɑ', 'AE': 'æ', 'AH': 'ə', 'AO': 'ɔ', 'AW': 'aʊ', 'AY': 'aɪ',
        'B': 'b', 'CH': 'tʃ', 'D': 'd', 'DH': 'ð', 'EH': 'ɛ', 'ER': 'ɝ',
        'EY': 'eɪ', 'F': 'f', 'G': 'ɡ', 'HH': 'h', 'IH': 'ɪ', 'IY': 'i',
        'JH': 'dʒ', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'ŋ',
        'OW': 'oʊ', 'OY': 'ɔɪ', 'P': 'p', 'R': 'r', 'S': 's', 'SH': 'ʃ',
        'T': 't', 'TH': 'θ', 'UH': 'ʊ', 'UW': 'u', 'V': 'v', 'W': 'w',
        'Y': 'j', 'Z': 'z', 'ZH': 'ʒ'
    };
    try {
        const parts = arpabetStr.trim().split(' ');
        let result = '';
        for (const p of parts) {
            const stripped = p.replace(/[0-9]/g, '');
            result += map[stripped] || stripped.toLowerCase();
        }
        return `/${result}/`;
    } catch {
        return '';
    }
};

export function DictionaryDefinition({ word, isWinState }: DictionaryDefinitionProps) {
    const [data, setData] = useState<DictionaryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    const { theme } = useTheme();
    const { colorStyle } = useColorStyle();
    
    const isLight = theme === 'light';
    const isPalomichi = colorStyle === 'palomichi';

    useEffect(() => {
        let mounted = true;

        async function fetchWiktionary(wordToFetch: string) {
            try {
                let currentWord = wordToFetch;
                let wkRes = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(currentWord)}`);
                
                if (!wkRes.ok) {
                    const sumRes = await fetch(`https://en.wiktionary.org/api/rest_v1/page/summary/${encodeURIComponent(currentWord)}`);
                    if (sumRes.ok) {
                        const sumJson = await sumRes.json();
                        if (sumJson.title && sumJson.title.toLowerCase() !== currentWord.toLowerCase()) {
                            currentWord = sumJson.title;
                            wkRes = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(currentWord)}`);
                        }
                    }
                }

                if (wkRes.ok) {
                    const wkJson = await wkRes.json();
                    return { word: currentWord, entries: wkJson.en || [] };
                }
            } catch (err) {
                console.error('Wiktionary fetch error', err);
            }
            return null;
        }

        async function fetchAggregatedDef() {
            setLoading(true);
            setError(false);

            try {
                // 1. Fetch Primary Word
                const primary = await fetchWiktionary(word);
                if (!mounted) return;

                if (!primary || primary.entries.length === 0) {
                    // Fallback to Datamuse if Wiktionary completely fails
                    const dmRes = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dr`);
                    if (dmRes.ok) {
                        const dmJson = await dmRes.json();
                        const match = dmJson.find((item: any) => item.word.toLowerCase() === word.toLowerCase() && item.defs);
                        if (match && match.defs && match.defs.length > 0 && mounted) {
                            const mappedMeanings: Meaning[] = match.defs.map((defStr: string) => {
                                const parts = defStr.split('\t');
                                let pos = parts.length > 1 ? parts[0] : '';
                                if (pos === 'n') pos = 'noun';
                                else if (pos === 'v') pos = 'verb';
                                else if (pos === 'adj') pos = 'adjective';
                                else if (pos === 'adv') pos = 'adverb';
                                return { partOfSpeech: pos, definitions: [{ definition: parts.length > 1 ? parts[1] : defStr }] };
                            });
                            setData({ word: match.word, meanings: mappedMeanings });
                            setLoading(false);
                            return;
                        }
                    }
                    setError(true);
                    setLoading(false);
                    return;
                }

                // 2. Scan for "Form of" to find base word
                let baseWord: string | null = null;
                for (const entry of primary.entries) {
                    for (const def of entry.definitions) {
                        baseWord = extractBaseWord(def.definition);
                        if (baseWord) break;
                    }
                    if (baseWord) break;
                }

                // 3. Fetch Base Word if found and distinct
                let secondary: { word: string, entries: any[] } | null = null;
                if (baseWord && baseWord.toLowerCase() !== primary.word.toLowerCase()) {
                    secondary = await fetchWiktionary(baseWord);
                }
                if (!mounted) return;

                // 4. Merge Meanings
                const allMeanings: Meaning[] = [];
                
                // Helper to map Wiktionary entries to our internal Meaning type
                const mapEntries = (entries: any[]) => entries.map((entry: any) => ({
                    partOfSpeech: entry.partOfSpeech.toLowerCase(),
                    definitions: entry.definitions.map((def: any) => ({
                        definition: stripHtml(def.definition),
                        example: def.examples?.[0] ? stripHtml(def.examples[0]) : undefined
                    }))
                }));

                const primaryMeanings = mapEntries(primary.entries);
                const secondaryMeanings = secondary ? mapEntries(secondary.entries) : [];

                // Filter out "Form of" boilerplate from primary if we have secondary meanings
                const filteredPrimary = primaryMeanings.map(m => ({
                    ...m,
                    definitions: m.definitions.filter(d => !extractBaseWord(d.definition) || !secondary)
                })).filter(m => m.definitions.length > 0);

                // Combine them
                // Prioritize primary substantive meanings first, then secondary base meanings
                allMeanings.push(...filteredPrimary);
                allMeanings.push(...secondaryMeanings);

                // Dedup by Part of Speech if they match exactly (merge definition lists)
                const mergedMeanings: Meaning[] = [];
                allMeanings.forEach(m => {
                    const existing = mergedMeanings.find(em => em.partOfSpeech === m.partOfSpeech);
                    if (existing) {
                        existing.definitions.push(...m.definitions);
                    } else {
                        mergedMeanings.push(m);
                    }
                });

                // Final cleanup: Limit to top N definitions and unique definitions
                mergedMeanings.forEach(m => {
                    const seen = new Set();
                    m.definitions = m.definitions.filter(d => {
                        const key = d.definition.toLowerCase().trim();
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    }).slice(0, 3); // Max 3 per part of speech
                });

                setData({
                    word: primary.word,
                    meanings: mergedMeanings.slice(0, 2) // Max 2 parts of speech to save space
                });

                // 5. Fetch Phonetics (use the simpler word for better results)
                const phoneticWord = secondary?.word || primary.word;
                const dmRes = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(phoneticWord)}&md=r`);
                if (dmRes.ok && mounted) {
                    const dmJson = await dmRes.json();
                    const match = dmJson.find((item: any) => item.word.toLowerCase() === phoneticWord.toLowerCase() && item.tags);
                    if (match) {
                        const pronTag = match.tags.find((t: string) => t.startsWith('pron:'));
                        const parsedPhonetic = pronTag ? formatPronunciation(pronTag.slice(5)) : '';
                        setData(prev => prev ? { ...prev, phonetic: parsedPhonetic } : null);
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error('Fetch error', err);
                if (mounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        }

        fetchAggregatedDef();

        return () => { mounted = false; };
    }, [word]);

    // Theme logic for the dictionary
    // Win = Green hues, Lose = Red hues
    // Palomichi light = #FEEAF0 / #7F1D3C
    // Palomichi dark = #F598B8 / #3E0A1E
    // Normal light = #f4ebd0 / #2b1409
    // Normal dark = #e0d6b9 / black
    
    let containerBgClass = '';
    let borderClass = '';
    let textClass = '';
    let accentClass = '';
    let subtleTextClass = '';
    let paperSurfaceClass = '';
    let paperGrainOpacityClass = 'opacity-[0.06]';

    if (isWinState) {
        // WIN (Very subtle green tint)
        if (isPalomichi) {
            containerBgClass = isLight ? "bg-[#f8efe6]" : "bg-[#1e3526]/30";
            borderClass = isLight ? "border-[#3a7a4a]/40" : "border-[#7cf0a6]/40";
            textClass = isLight ? "text-[#1e5230]" : "text-[#7cf0a6]";
            accentClass = isLight ? "text-[#143d22]" : "text-[#5ed389]";
            subtleTextClass = isLight ? "text-[#1e5230]/70" : "text-[#7cf0a6]/70";
        } else {
            containerBgClass = isLight ? "bg-[#f6eddc]" : "bg-[#1c2e1c]/30";
            borderClass = isLight ? "border-[#3a6a38]/40" : "border-[#9ae39a]/40";
            textClass = isLight ? "text-[#1e3b1c]" : "text-[#9ae39a]";
            accentClass = isLight ? "text-[#132812]" : "text-[#b2f5b2]";
            subtleTextClass = isLight ? "text-[#1e3b1c]/70" : "text-[#9ae39a]/70";
        }
    } else {
        // LOSE (Very subtle red tint)
        if (isPalomichi) {
            containerBgClass = isLight ? "bg-[#f8ece4]" : "bg-[#3a1a20]/30";
            borderClass = isLight ? "border-[#7F1D3C]/40" : "border-[#f29bab]/40";
            textClass = isLight ? "text-[#7F1D3C]" : "text-[#f29bab]";
            accentClass = isLight ? "text-[#5c1328]" : "text-[#fcbbc8]";
            subtleTextClass = isLight ? "text-[#7F1D3C]/70" : "text-[#f29bab]/70";
        } else {
            containerBgClass = isLight ? "bg-[#f7ede4]" : "bg-[#321818]/30";
            borderClass = isLight ? "border-[#521c1c]/40" : "border-[#e39a9a]/40";
            textClass = isLight ? "text-[#521c1c]" : "text-[#e39a9a]";
            accentClass = isLight ? "text-[#361111]" : "text-[#fab6b6]";
            subtleTextClass = isLight ? "text-[#521c1c]/70" : "text-[#e39a9a]/70";
        }
    }

    if (isLight) {
        paperSurfaceClass = "bg-[linear-gradient(180deg,rgba(255,251,244,0.97)_0%,rgba(245,236,222,0.97)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_8px_22px_rgba(64,45,22,0.14)]";
        paperGrainOpacityClass = 'opacity-[0.08]';
    }

    if (loading) {
        return (
            <div className={cn("mt-3 flex min-h-[100px] w-full flex-col items-center justify-center border-2 border-dashed p-4 relative overflow-hidden shadow-inner", containerBgClass, paperSurfaceClass, borderClass, textClass)}>
                 <div 
                    className={cn("absolute inset-0 pointer-events-none", paperGrainOpacityClass)}
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                />
                <Loader2 className="h-6 w-6 animate-spin opacity-70" />
                <span className="mt-2 font-serif text-[10px] uppercase tracking-widest opacity-80">Consulting the archives...</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={cn("mt-3 flex w-full flex-col items-center justify-center p-3 sm:p-4 border-2 border-dashed relative overflow-hidden shadow-inner text-center", containerBgClass, paperSurfaceClass, borderClass, textClass)}>
                <div 
                    className={cn("absolute inset-0 pointer-events-none", paperGrainOpacityClass)}
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    }}
                />
                <span className="font-serif text-xs font-bold uppercase tracking-widest">Archive Not Found</span>
                <span className="mt-1 font-serif text-[10px] italic opacity-80">This word traces no known lineage in the standard register.</span>
            </div>
        );
    }

    const { phonetic, phonetics, meanings } = data;
    const displayPhonetic = phonetic || (phonetics?.find(p => p.text)?.text) || '';
    
    // Pick first meaning and first 2 definitions max to keep ui clean
    const primaryMeaning = meanings[0];
    const definitionsToShow = primaryMeaning?.definitions.slice(0, 2) || [];

    return (
        <div className={cn("flex w-full flex-col p-4 sm:p-5 border-2 border-dashed rounded-xl relative overflow-hidden shadow-sm text-left", containerBgClass, paperSurfaceClass, borderClass, textClass)}>
            {/* Grain Overlay */}
            <div 
                className={cn("absolute inset-0 pointer-events-none", paperGrainOpacityClass)}
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />

            <div className="relative z-10 flex flex-col w-full h-full">
                {/* Header Row */}
                <div className="flex items-baseline flex-wrap gap-2.5 mb-2">
                    <h4 className={cn("font-serif text-2xl sm:text-3xl font-black lowercase tracking-tight m-0 leading-none", accentClass)}>
                        {word}
                    </h4>
                    {displayPhonetic && (
                        <span className={cn("font-mono text-xs sm:text-sm font-medium tracking-wide", subtleTextClass)}>
                            {displayPhonetic}
                        </span>
                    )}
                    {primaryMeaning && (
                        <span className={cn("font-serif text-xs sm:text-sm italic ml-auto", subtleTextClass)}>
                            {primaryMeaning.partOfSpeech}
                        </span>
                    )}
                </div>
                
                <div className="w-full h-px bg-current opacity-20 mb-3" />

                {/* Definitions */}
                <div className="flex flex-col gap-3">
                    {definitionsToShow.map((def, idx) => (
                        <div key={idx} className="flex gap-2.5">
                            <span className={cn("font-serif font-black text-sm sm:text-base leading-snug shrink-0", accentClass)}>
                                {idx + 1}.
                            </span>
                            <div className="flex flex-col gap-1">
                                <p className="font-serif text-sm sm:text-base leading-snug">
                                    {def.definition}
                                </p>
                                {def.example && (
                                    <p className={cn("font-serif text-xs sm:text-sm italic leading-tight mt-0.5", subtleTextClass)}>
                                        &quot;{def.example}&quot;
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
