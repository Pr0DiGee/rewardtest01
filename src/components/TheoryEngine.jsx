import React, { useState, useEffect, useRef } from 'react';

const states = [
  // RLE States (0 - 7)
  {
    id: 0,
    mode: "rle",
    isInteractive: true,
    title: "TUTORIAL: LOSSLESS COMPRESSION",
    text: "Data Compression reduces data size to save storage. By the end of this pipeline, you will write your own Python compression algorithm to process raw data! But first, let's learn the logic. We will build 'Run-Length Encoding' (RLE). It replaces repeating symbols with the symbol and its count. 'o' represents 1 (Black), 'z' represents 0 (White). Compress 1100:",
    binary: "1100",
    expected: "o2z2"
  },
  {
    id: 1,
    mode: "rle",
    isInteractive: false,
    title: "PIPELINE VERIFIED",
    text: "Correct! You just performed Lossless Compression. By transmitting 'o2z2' instead of '1100', the receiver can perfectly deconstruct the string to get the exact original message. No data was lost. Let's look at how hardware uses this.",
    binary: "1100",
    expected: null
  },
  {
    id: 2,
    mode: "rle",
    isInteractive: true,
    title: "NODE 1: THE PRINTER",
    text: "A printer scans pages line by line. Most of a document is blank white space (0s) with occasional black text (1s). Compress this blank scanline containing a single black text block:",
    binary: "000011110000",
    expected: "z4o4z4"
  },
  {
    id: 3,
    mode: "rle",
    isInteractive: false,
    title: "BANDWIDTH OPTIMIZED",
    text: "Excellent. You reduced 12 raw bits down to 6 characters. Because the compressed bits take up less space, the printer's memory buffer doesn't overflow, and the data transmits much faster from the computer. RLE is highly efficient for binary data.",
    binary: "000011110000",
    expected: null
  },
  {
    id: 4,
    mode: "rle",
    isInteractive: true,
    title: "NODE 2: THE FAX MACHINE",
    text: "Fax machines use RLE to transmit images over old telephone lines. It simply groups the runs of white background and black ink. Compress this handwritten signature curve:",
    binary: "00110001111",
    expected: "z2o2z3o4"
  },
  {
    id: 5,
    mode: "rle",
    isInteractive: false,
    title: "EFFICIENCY WARNING",
    text: "Spot on. The fax machine only sends the summary of the changes ('2 white, 2 black...') over the line. But notice your compressed size (8) is getting very close to the raw size (11). What happens when data has no patterns?",
    binary: "00110001111",
    expected: null
  },
  {
    id: 6,
    mode: "rle",
    isInteractive: true,
    title: "NODE 3: THE TRAP",
    text: "Compress this encrypted data packet. Modern encryption scrambles data so it looks like perfectly random noise to secure it against attackers:",
    binary: "10101010",
    expected: "o1z1o1z1o1z1o1z1"
  },
  {
    id: 7,
    mode: "rle",
    isInteractive: false,
    title: "SYSTEM LIMIT REACHED",
    text: "Notice how the compressed size (16) is double the raw size (8)? RLE relies entirely on spatial redundancy (long repeating runs). Encrypted or highly variable data has no runs. You have discovered the algorithm's limits: compression algorithms must be carefully matched to the data type.",
    binary: "10101010",
    expected: null
  },
  // Huffman Coding States (8 - 13)
  {
    id: 8,
    mode: "huffman",
    isInteractive: true,
    title: "TUTORIAL: FREQUENCY MATTERS",
    text: "RLE fails when there are no repeating runs. Huffman Coding solves this by using 'Variable-Length Codes'. It assigns shorter codes to common characters and longer codes to rare ones. If 'E' is the most common letter in English and 'Z' is the rarest, which binary code should 'E' get to save the most space? Type '0' or '1110'.",
    dictionary: null,
    targetString: null,
    expected: "0"
  },
  {
    id: 9,
    mode: "huffman",
    isInteractive: false,
    title: "VARIABLE-LENGTH EFFICIENCY",
    text: "Correct! By giving the most frequent symbol the shortest code (just 1 bit), we drastically reduce the total file size. To make this work, the system builds a 'Huffman Tree' mapping out the exact frequency of every character in the data.",
    dictionary: null,
    targetString: null,
    expected: null
  },
  {
    id: 10,
    mode: "huffman",
    isInteractive: true,
    title: "NODE 4: THE DICTIONARY",
    text: "Here is a generated Huffman dictionary for the word 'BEEKEEPER'. Notice how 'E' gets the shortest code because it appears most frequently. Use this dictionary to compress the target string.",
    dictionary: "[E=0], [B=10], [K=110], [P=111], [R=1100]",
    targetString: "BEE",
    expected: "1000"
  },
  {
    id: 11,
    mode: "huffman",
    isInteractive: false,
    title: "THE PREFIX RULE",
    text: "Excellent. 'BEE' compressed from 24 bits (standard ASCII) down to just 4 bits (1000)! But how does the computer know when one letter stops and another starts? Huffman codes follow the 'Prefix Rule': no code is a prefix of another.",
    dictionary: "[E=0], [B=10], [K=110], [P=111], [R=1100]",
    targetString: "BEE",
    expected: null
  },
  {
    id: 12,
    mode: "huffman",
    isInteractive: true,
    title: "NODE 5: DECODING",
    text: "Because of the Prefix Rule, decoding is unambiguous. The system reads left to right until it matches a complete dictionary code. Decrypt this intercepted binary stream:",
    dictionary: "[E=0], [B=10], [K=110], [P=111], [R=1100]",
    targetString: "11100",
    expected: "pee"
  },
  {
    id: 13,
    mode: "huffman",
    isInteractive: false,
    title: "PIPELINE SECURED",
    text: "Perfect. The system reads '111', sees it matches 'P', and knows it can't be part of a longer code. Huffman coding is universally used in ZIP files and as the final optimization step in JPEG and MP3 compression. You have mastered Frequency-based Compression!",
    dictionary: null,
    targetString: null,
    expected: null
  },
  // Lempel-Ziv Coding States (14 - 19)
  {
    id: 14,
    mode: "lz",
    isInteractive: true,
    title: "TUTORIAL: DYNAMIC DICTIONARIES",
    text: "Huffman coding requires sending the frequency dictionary along with the data. Lempel-Ziv (LZ) is smarter: it builds a dictionary *on the fly* as it reads. It looks for repeated phrases. In the string 'CANCAN', what is the longest repeating phrase?",
    dictionary: null,
    targetString: "CANCAN",
    expected: "can"
  },
  {
    id: 15,
    mode: "lz",
    isInteractive: false,
    title: "LEARNING AS IT GOES",
    text: "Correct! LZ scans the data and saves 'CAN' to a numbered dictionary. When it sees 'CAN' again later in the file, it doesn't write the letters. It just outputs the dictionary index.",
    dictionary: null,
    targetString: "CANCAN",
    expected: null
  },
  {
    id: 16,
    mode: "lz",
    isInteractive: true,
    title: "NODE 5: THE INDEX POINTER",
    text: "Let's compress 'WEEWEEWEE'. The system reads the first part and builds this dictionary: [1=W], [2=E], [3=WEE]. To output the next 'WEE', type its dictionary index:",
    dictionary: "[1=W], [2=E], [3=WEE]",
    targetString: "WEE",
    expected: "3"
  },
  {
    id: 17,
    mode: "lz",
    isInteractive: false,
    title: "THE POWER OF LZ",
    text: "Exactly. Instead of writing 'WEE' again, the system just outputs '3'. The magic of LZ is that the decoder reads the data and rebuilds the *exact same dictionary* simultaneously. You don't have to send the dictionary in advance!",
    dictionary: "[1=W], [2=E], [3=WEE]",
    targetString: "WEE",
    expected: null
  },
  {
    id: 18,
    mode: "lz",
    isInteractive: true,
    title: "NODE 6: DECODING ON THE FLY",
    text: "Let's act as the decoder. You have rebuilt this dictionary: [1=A], [2=B], [3=AB]. Decode this incoming stream of LZ tokens: 1, 2, 3, 3",
    dictionary: "[1=A], [2=B], [3=AB]",
    targetString: "1, 2, 3, 3",
    expected: "ababab"
  },
  {
    id: 19,
    mode: "lz",
    isInteractive: false,
    title: "PIPELINE SECURED: COMPRESSION MASTERED",
    text: "Perfect! 1(A) + 2(B) + 3(AB) + 3(AB) = ABABAB. You just executed Lempel-Ziv compression. This dynamic dictionary algorithm is the engine behind ZIP files, GIFs, and PNGs. You have successfully cleared the Data Compression pipeline!",
    dictionary: null,
    targetString: null,
    expected: null
  }
];

export default function TheoryEngine({ onComplete }) {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isFading, setIsFading] = useState(false);
  const inputRef = useRef(null);

  const activeState = states[currentStateIndex];

  // Auto-focus input on render / transition
  useEffect(() => {
    if (activeState.isInteractive && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [currentStateIndex, activeState.isInteractive]);

  // Transition helper
  const transitionToState = (nextIndex) => {
    setIsFading(true);
    setTimeout(() => {
      setUserInput('');
      setCurrentStateIndex(nextIndex);
      setIsFading(false);
    }, 200);
  };

  // Keyboard validator
  const handleInputChange = (e) => {
    let val = e.target.value;

    if (activeState.mode === 'rle') {
      val = val.replace(/[^o-z0-9]/gi, '').toLowerCase();
    } else if (activeState.mode === 'lz') {
      val = val.toLowerCase().replace(/\s+/g, '');
    } else {
      val = val.toLowerCase();
    }

    setUserInput(val);

    // Dynamic match checks
    if (val === activeState.expected) {
      inputRef.current?.blur();
      transitionToState(currentStateIndex + 1);
    }
  };

  const handleContinue = () => {
    if (currentStateIndex === states.length - 1) {
      onComplete(); // Advance to WorkspaceIDE
    } else {
      transitionToState(currentStateIndex + 1);
    }
  };

  // 10-Dot indicator groupings
  const activeDotIndex = Math.floor(currentStateIndex / 2);

  // Telemetry Labels
  let rawLabel = "Raw Size (bits)";
  let compressedLabel = "Compressed Size (chars)";
  if (activeState.mode === 'huffman') {
    rawLabel = "Standard ASCII (bits)";
    compressedLabel = "Huffman Payload (bits)";
  } else if (activeState.mode === 'lz') {
    rawLabel = "Raw Text (chars)";
    compressedLabel = "LZ Output (tokens)";
  }

  // Telemetry Calculations
  let rawSizeVal = 0;
  let compressedSizeVal = 0;

  if (activeState.isInteractive) {
    compressedSizeVal = userInput.length;
    if (activeState.mode === 'rle') {
      rawSizeVal = activeState.binary.length;
    } else if (activeState.mode === 'huffman') {
      rawSizeVal = activeState.targetString ? activeState.targetString.length * 8 : 8;
    } else if (activeState.mode === 'lz') {
      rawSizeVal = activeState.targetString ? activeState.targetString.length : 0;
    }
  } else {
    // Synthesis state carry-over from preceding interactive state
    const prev = states[currentStateIndex - 1];
    compressedSizeVal = prev.expected.length;
    if (activeState.mode === 'rle') {
      rawSizeVal = prev.binary.length;
    } else if (activeState.mode === 'huffman') {
      rawSizeVal = prev.targetString ? prev.targetString.length * 8 : 8;
    } else if (activeState.mode === 'lz') {
      rawSizeVal = prev.targetString ? prev.targetString.length : 0;
    }
  }

  // Synthesis checkpoints dynamic title color
  let titleColorClass = "text-slate-900";
  if (!activeState.isInteractive) {
    if (currentStateIndex === 7) {
      titleColorClass = "text-red-500"; // Alarm limit reached
    } else {
      titleColorClass = "text-emerald-500"; // Checkpoint verified
    }
  }

  return (
    <div 
      className={`w-full max-w-[580px] p-10 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center transition-all duration-200 ${
        isFading ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
      }`}
    >
      {/* 10-Dot Progress Indicators */}
      <div className="flex gap-3 mb-8">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div 
            key={idx}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx < activeDotIndex ? 'bg-emerald-500' : idx === activeDotIndex ? 'bg-slate-900 scale-110' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {/* Main Narrative Context */}
      <div className={`text-xs font-semibold uppercase tracking-wider mb-2 transition-colors duration-200 ${titleColorClass}`}>
        {activeState.title}
      </div>
      <div className="text-[15px] leading-relaxed text-slate-500 mb-8 max-w-[480px]">
        {activeState.text}
      </div>

      {/* RLE Visual Grid */}
      {activeState.mode === 'rle' && (
        <div className="w-full flex justify-center mb-8">
          <div className="flex gap-1.5 flex-wrap justify-center">
            {activeState.binary.split('').map((char, idx) => (
              <div 
                key={idx}
                className={`w-6 h-6 rounded border transition-all duration-200 ${
                  char === '1' ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Huffman & LZ Monospace Displays */}
      {activeState.mode !== 'rle' && (
        <div className="w-full flex flex-col items-center">
          {activeState.dictionary && (
            <div className="font-mono text-[13px] text-slate-900 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg mb-5 tracking-wide">
              {activeState.dictionary}
            </div>
          )}
          {activeState.targetString && (
            <div className="mb-6 flex flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Target String</span>
              <span className="font-mono text-3xl font-semibold tracking-widest text-slate-900 uppercase">
                {activeState.targetString}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Input Field (Interactive States) */}
      {activeState.isInteractive ? (
        <div className="w-full max-w-[320px] mb-8">
          <input 
            type="text"
            ref={inputRef}
            className="w-full py-3 px-2 font-mono text-xl text-slate-900 bg-transparent border-none border-b-2 border-slate-200 focus:border-slate-900 outline-none text-center tracking-widest transition-colors duration-200"
            placeholder={activeState.mode === 'rle' ? 'oXzY' : activeState.mode === 'lz' ? 'decompressed / token' : 'code payload'}
            value={userInput}
            onChange={handleInputChange}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      ) : (
        /* Continue Button (Synthesis States) */
        <button 
          className="font-sans text-xs font-semibold bg-slate-900 text-white border-none py-3 px-7 rounded-md uppercase tracking-wider hover:opacity-90 transition-opacity duration-200 mb-8"
          onClick={handleContinue}
        >
          {activeState.title === "PIPELINE SECURED: COMPRESSION MASTERED" ? "Return to Command Dashboard" : "Next Node"}
        </button>
      )}

      {/* Dynamic Telemetry Row */}
      <div className="flex justify-center gap-12 w-full border-t border-slate-100 pt-6">
        <div className="flex flex-col items-center">
          <span className="font-mono text-2xl font-medium text-slate-900 mb-1">{rawSizeVal}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{rawLabel}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-mono text-2xl font-medium text-slate-900 mb-1">{compressedSizeVal}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{compressedLabel}</span>
        </div>
      </div>
    </div>
  );
}
