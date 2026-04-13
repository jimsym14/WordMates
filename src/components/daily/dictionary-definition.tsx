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
        
        async function fetchDef() {
            setLoading(true);
            setError(false);
            
            try {
                const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
                if (res.ok) {
                    const json = await res.json();
                    if (mounted && json && json.length > 0) {
                        setData(json[0]);
                        setLoading(false);
                        return;
                    }
                }
                
                // Fallback to Datamuse
                const dmRes = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=dr`);
                if (dmRes.ok) {
                    const dmJson = await dmRes.json();
                    const match = dmJson.find((item: any) => item.word.toLowerCase() === word.toLowerCase() && item.defs);
                    
                    if (match && match.defs && match.defs.length > 0) {
                        const mappedMeanings: Meaning[] = match.defs.map((defStr: string) => {
                            const parts = defStr.split('\t');
                            let pos = parts.length > 1 ? parts[0] : '';
                            
                            // Map abbreviation to full pos string
                            if (pos === 'n') pos = 'noun';
                            else if (pos === 'v') pos = 'verb';
                            else if (pos === 'adj') pos = 'adjective';
                            else if (pos === 'adv') pos = 'adverb';
                            
                            const desc = parts.length > 1 ? parts[1] : defStr;
                            
                            return {
                                partOfSpeech: pos,
                                definitions: [{ definition: desc }]
                            };
                        });
                        const pronTag = match.tags?.find((t: string) => t.startsWith('pron:'));
                        const parsedPhonetic = pronTag ? formatPronunciation(pronTag.slice(5)) : '';

                        if (mounted) {
                            setData({
                                word: match.word,
                                phonetic: parsedPhonetic,
                                meanings: mappedMeanings
                            });
                            setLoading(false);
                            return;
                        }
                    }
                }
                
                if (mounted) {
                    setError(true);
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        }
        
        fetchDef();

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

    if (isWinState) {
        // WIN (Very subtle green tint)
        if (isPalomichi) {
            containerBgClass = isLight ? "bg-[#e8f8ed]/30" : "bg-[#1e3526]/30";
            borderClass = isLight ? "border-[#3a7a4a]/40" : "border-[#7cf0a6]/40";
            textClass = isLight ? "text-[#1e5230]" : "text-[#7cf0a6]";
            accentClass = isLight ? "text-[#143d22]" : "text-[#5ed389]";
            subtleTextClass = isLight ? "text-[#1e5230]/70" : "text-[#7cf0a6]/70";
        } else {
            containerBgClass = isLight ? "bg-[#e6f2e6]/30" : "bg-[#1c2e1c]/30";
            borderClass = isLight ? "border-[#3a6a38]/40" : "border-[#9ae39a]/40";
            textClass = isLight ? "text-[#1e3b1c]" : "text-[#9ae39a]";
            accentClass = isLight ? "text-[#132812]" : "text-[#b2f5b2]";
            subtleTextClass = isLight ? "text-[#1e3b1c]/70" : "text-[#9ae39a]/70";
        }
    } else {
        // LOSE (Very subtle red tint)
        if (isPalomichi) {
            containerBgClass = isLight ? "bg-[#fce8ec]/30" : "bg-[#3a1a20]/30";
            borderClass = isLight ? "border-[#7F1D3C]/40" : "border-[#f29bab]/40";
            textClass = isLight ? "text-[#7F1D3C]" : "text-[#f29bab]";
            accentClass = isLight ? "text-[#5c1328]" : "text-[#fcbbc8]";
            subtleTextClass = isLight ? "text-[#7F1D3C]/70" : "text-[#f29bab]/70";
        } else {
            containerBgClass = isLight ? "bg-[#f8e4e4]/30" : "bg-[#321818]/30";
            borderClass = isLight ? "border-[#521c1c]/40" : "border-[#e39a9a]/40";
            textClass = isLight ? "text-[#521c1c]" : "text-[#e39a9a]";
            accentClass = isLight ? "text-[#361111]" : "text-[#fab6b6]";
            subtleTextClass = isLight ? "text-[#521c1c]/70" : "text-[#e39a9a]/70";
        }
    }

    if (loading) {
        return (
            <div className={cn("mt-3 flex min-h-[100px] w-full flex-col items-center justify-center border-2 border-dashed p-4 relative overflow-hidden shadow-inner", containerBgClass, borderClass, textClass)}>
                 <div 
                    className="absolute inset-0 opacity-[0.05] pointer-events-none"
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
            <div className={cn("mt-3 flex w-full flex-col items-center justify-center p-3 sm:p-4 border-2 border-dashed relative overflow-hidden shadow-inner text-center", containerBgClass, borderClass, textClass)}>
                <div 
                    className="absolute inset-0 opacity-[0.05] pointer-events-none"
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
        <div className={cn("flex w-full flex-col p-4 sm:p-5 border-2 border-dashed rounded-xl relative overflow-hidden shadow-sm text-left", containerBgClass, borderClass, textClass)}>
            {/* Grain Overlay */}
            <div 
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
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
