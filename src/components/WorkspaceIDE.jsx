import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const tutorialSteps = [
  {
    id: 0,
    preText: "Let's build a real compressor. Type the code shown below to initialize our function and variables.",
    targetCode: `def run_length_encoder(data):
    compressed_output = ""
    current_char = data[0]
    count = 1`,
    postText: "Variables instantiated! You created `compressed_output` (an empty string to hold our final answer), `current_char` (to track the exact letter we are currently looking at, starting with the very first one), and `count` (starting at 1) to track how many times we see it."
  },
  {
    id: 1,
    preText: "Now, add this loop to check every character. If it matches the current character, we increase the count.",
    targetCode: `def run_length_encoder(data):
    compressed_output = ""
    current_char = data[0]
    count = 1
    for i in range(1, len(data)):
        if data[i] == current_char:
            count += 1`,
    postText: "Great job! You created a `for` loop to scan every single character in our data. The `if` statement checks: 'Is the letter we are looking at right now the same as the one we were just looking at?' If yes, we simply add 1 to our count!"
  },
  {
    id: 2,
    preText: "Add this else statement. When a different character appears, it flushes the buffer to our output and resets the counters.",
    targetCode: `def run_length_encoder(data):
    compressed_output = ""
    current_char = data[0]
    count = 1
    for i in range(1, len(data)):
        if data[i] == current_char:
            count += 1
        else:
            compressed_output += f"{current_char}{count}"
            current_char = data[i]
            count = 1`,
    postText: "Perfect. This `else` block triggers when a DIFFERENT letter appears. It takes the previous letter and its count and pushes it into our final string. Then, it resets `current_char` to the new letter and resets the count back to 1."
  },
  {
    id: 3,
    preText: "Because loops stop when they finish checking, append the final sequence outside the loop. Add the final return and the system test. Hit RUN!",
    targetCode: `def run_length_encoder(data):
    compressed_output = ""
    current_char = data[0]
    count = 1
    for i in range(1, len(data)):
        if data[i] == current_char:
            count += 1
        else:
            compressed_output += f"{current_char}{count}"
            current_char = data[i]
            count = 1
    compressed_output += f"{current_char}{count}"
    return compressed_output

raw_file = "WWWWWWWWWWWWBWWWWWWWWWWWWBBB"
print(run_length_encoder(raw_file))`,
    postText: "Because loops stop exactly when they finish checking the last letter, they never push the final group of letters. Appending the final sequence outside the loop fixes this! Hit RUN to test the system."
  }
];

const blacklist = ['run_length_encoder', 'compressed_output', 'current_char', 'count'];

export default function WorkspaceIDE({ onBackToDashboard }) {
  const [pyodideLoaded, setPyodideLoaded] = useState(false);
  const [pyodideLoadingMsg, setPyodideLoadingMsg] = useState('Initializing Pyodide WASM Runtime...');
  const [phase, setPhase] = useState(1); // 1 = Guided Tutorial, 2 = Unassisted Challenge
  const [phaseStep, setPhaseStep] = useState(0);
  const [editorValue, setEditorValue] = useState(''); // Starts COMPLETELY EMPTY
  const [hasRunCode, setHasRunCode] = useState(false); // Execution guardrail state
  const [warningMessage, setWarningMessage] = useState('');
  const [challengeSuccess, setChallengeSuccess] = useState(false);

  const terminalRef = useRef(null);
  const terminalElementRef = useRef(null);
  const pyodideInstanceRef = useRef(null);
  const fitAddonRef = useRef(null);

  // Initialize Pyodide WASM Runtime & Xterm.js Terminal
  useEffect(() => {
    // 1. Initialize Xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, monospace',
      theme: {
        background: '#0f172a', // Slate 900
        foreground: '#e2e8f0', // Slate 200
        cursor: '#38bdf8', // Sky 400
        black: '#020617',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#cbd5e1'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalElementRef.current);
    fitAddon.fit();
    
    terminalRef.current = term;
    fitAddonRef.ref = fitAddon;

    term.write('\x1b[32m[SYSTEM] Terminal emulator active.\x1b[0m\r\n');

    // Handle terminal resizing
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (err) {
        // Suppress initial fit errors when container isn't fully drawn
      }
    });
    resizeObserver.observe(terminalElementRef.current);

    // 2. Load Pyodide via script tag CDN hook
    const loadWasm = async () => {
      try {
        if (!window.loadPyodide) {
          term.write('\x1b[31m[SYSTEM ERROR] Pyodide script CDN not detected in DOM.\x1b[0m\r\n');
          return;
        }

        term.write('[SYSTEM] Booting Pyodide WebAssembly Python Runtime...\r\n');
        setPyodideLoadingMsg('Downloading WASM binary matrices...');

        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
        });

        pyodideInstanceRef.current = pyodide;
        setPyodideLoaded(true);
        term.write('\x1b[32m[SYSTEM] Pyodide WASM active. Python interpreter ready.\x1b[0m\r\n\r\n');
      } catch (err) {
        term.write(`\x1b[31m[SYSTEM ERROR] WASM initialization failed: ${err.message}\x1b[0m\r\n`);
      }
    };

    loadWasm();

    return () => {
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []);

  // Monitor editor code to handle Guided Scaffolding Phase 1 transitions
  const handleEditorChange = (value) => {
    setEditorValue(value);

    if (phase === 1) {
      const activeTarget = tutorialSteps[phaseStep].targetCode;
      
      // Compare ignoring whitespaces & newlines
      const cleanUserCode = value.replace(/\s+/g, '').toLowerCase();
      const cleanTargetCode = activeTarget.replace(/\s+/g, '').toLowerCase();

      if (cleanUserCode === cleanTargetCode && phaseStep < tutorialSteps.length - 1) {
        // Match! Auto advance to next guided block
        const nextStep = phaseStep + 1;
        setPhaseStep(nextStep);
        terminalRef.current?.write(`\r\n\x1b[32m[SYSTEM] Scaffolding matched! Advancing to Step ${nextStep + 1}.\x1b[0m\r\n`);
      }
    }
  };

  // Run script via Pyodide
  const handleRun = async () => {
    if (!pyodideInstanceRef.current) return;

    setHasRunCode(true); // Execution guardrail cleared!
    setWarningMessage(''); // Clear active warnings

    const term = terminalRef.current;
    term.write('\r\n\x1b[36m$ python run_diagnostics.py\x1b[0m\r\n');

    try {
      // Python executor capturing print statements
      const execCode = `
import sys
import io
sys.stdout = io.StringIO()

${editorValue}

sys.stdout.getvalue()
`;
      const result = await pyodideInstanceRef.current.runPythonAsync(execCode);
      term.write(result);

      if (phase === 1 && phaseStep === 3) {
        // Check if output is correct to unlock Phase 2 challenge
        const cleanResult = result.trim();
        if (cleanResult === "W12B1W12B3") {
          term.write('\r\n\x1b[32m[SUCCESS] Target match 100%! RLE guided calibration cleared.\x1b[0m\r\n');
          setTimeout(() => {
            // Trigger Phase 2 (Unassisted Challenge)
            setPhase(2);
            // Preload editor with the requested template signature
            setEditorValue('def my_compressor(data):\n    # Write your logic here. Return the compressed string.\n    pass');
            setHasRunCode(false); // Reset guardrail for Phase 2
            setWarningMessage('');
            term.write('\r\n\x1b[35m[SYSTEM] Guided Tutorial Completed. Unassisted Challenge Unlocked.\x1b[0m\r\n');
          }, 1500);
        }
      }
    } catch (err) {
      // Format Python tracebacks into xterm red warning
      term.write(`\x1b[31m${err.message}\x1b[0m\r\n`);
    }
  };

  // Evaluate Phase 2 unassisted challenge
  const handleCheckSolution = async () => {
    const term = terminalRef.current;
    
    // Guardrail 1: Empty input check
    if (!editorValue.trim() || editorValue.includes('# Write your logic here.')) {
      setWarningMessage('Submission aborted: Monaco editor is empty or unchanged.');
      return;
    }

    // Guardrail 2: Has run code once check
    if (!hasRunCode) {
      setWarningMessage('You must run and test your code in the terminal before submitting your solution.');
      term.write('\r\n\x1b[33m[WARNING] You must run and test your code in the terminal before submitting your solution.\x1b[0m\r\n');
      return;
    }

    // Guardrail 3: Anti-cheat variable blacklist verification
    const detectedCheats = blacklist.filter(word => editorValue.includes(word));
    if (detectedCheats.length > 0) {
      setWarningMessage('SYSTEM ALARM: You must use your own variable names! Do not reuse the variables from the tutorial.');
      term.write(`\r\n\x1b[31mSYSTEM ALARM: You must use your own variable names! Do not reuse the variables from the tutorial. Blacklisted terms found: ${detectedCheats.join(', ')}\x1b[0m\r\n`);
      return;
    }

    setWarningMessage(''); // Clear warnings
    term.write('\r\n\x1b[35m[SYSTEM] Running LeetCode standard verification checks...\x1b[0m\r\n');

    try {
      // Execute the user's code, then run the dynamic hidden assertion checks
      const validationTest = `
import sys
import io
sys.stdout = io.StringIO()

${editorValue}

# --- HIDDEN SYSTEM TESTS ---
try:
    assert my_compressor("AAAB") == "A3B1", "Test 1 Failed"
    assert my_compressor("XYZ") == "X1Y1Z1", "Test 2 Failed"
    assert my_compressor("WWWWWWWWWWWWBWWWWWWWWWWWWBBB") == "W12B1W12B3", "Test 3 Failed"
    print("SYSTEM_PASS_200_OK")
except NameError:
    print("SYSTEM_ERROR: Function 'my_compressor' not found. Did you change the function name?")
except AssertionError as e:
    print(f"SYSTEM_ERROR: {e}. Output did not match expected compression.")
except Exception as e:
    print(f"SYSTEM_ERROR: Runtime exception - {e}")

sys.stdout.getvalue()
`;
      const result = await pyodideInstanceRef.current.runPythonAsync(validationTest);
      const cleanResult = result.trim();

      if (cleanResult.includes("SYSTEM_PASS_200_OK")) {
        setChallengeSuccess(true);
        term.write('\r\n\x1b[32mSUCCESS: LeetCode unit tests passed! 200 OK.\x1b[0m\r\n');
      } else {
        // Output failure traceback inside xterm terminal in red
        term.write(`\r\n\x1b[31m${cleanResult}\x1b[0m\r\n`);
        setWarningMessage(cleanResult.replace("SYSTEM_ERROR: ", ""));
      }
    } catch (err) {
      term.write(`\x1b[31mSYSTEM ERROR: run_length_encoder() function undefined or crashed: ${err.message}\x1b[0m\r\n`);
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row relative">
      {/* Full screen loader while WASM initializes */}
      {!pyodideLoaded && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-sky-400 rounded-full animate-spin mb-4" />
          <div className="font-mono text-sm tracking-widest">{pyodideLoadingMsg}</div>
        </div>
      )}

      {/* Left Panel: Instructions */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-8 overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {phase === 1 ? `Phase 1: Guided Scaffolding (Step ${phaseStep + 1}/4)` : "Phase 2: Unassisted Challenge"}
          </h2>
          <button 
            onClick={onBackToDashboard}
            className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 border border-slate-200 px-3 py-1 rounded transition-colors"
          >
            Dashboard
          </button>
        </div>

        {/* Dynamic Alert Banner */}
        {warningMessage && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-xs font-medium mb-6 text-left leading-relaxed">
            ⚠️ {warningMessage}
          </div>
        )}

        {phase === 1 ? (
          // Guided Tutorial Phase 1
          <div className="flex-grow flex flex-col gap-6">
            <div className="flex-grow overflow-y-auto space-y-4 pr-1">
              {/* Completed steps rendered as postText logs above */}
              {Array.from({ length: phaseStep }).map((_, idx) => (
                <div key={idx} className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg text-left">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">✓ Step {idx + 1} Cleared</span>
                  <p className="text-[13px] text-emerald-700 font-medium leading-relaxed">{tutorialSteps[idx].postText}</p>
                </div>
              ))}

              {/* Active step directive */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg text-left">
                <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest block mb-2">ACTIVE DIRECTIVE</span>
                <p className="text-[14px] leading-relaxed text-slate-700 mb-4">{tutorialSteps[phaseStep].preText}</p>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">TARGET CODE BLOCK</span>
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded font-mono text-[12px] whitespace-pre-wrap leading-relaxed select-all">
                  {tutorialSteps[phaseStep].targetCode}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          // Unassisted Challenge Phase 2
          <div className="flex-grow flex flex-col justify-between">
            <div className="overflow-y-auto pr-1">
              <p className="text-[15px] leading-relaxed text-slate-600 mb-6 font-medium">
                Tutorial Complete! Now, write a compressor from scratch. DO NOT use the exact variable names used in the guided code. Create your own variables and feel free to use your own logic. Just ensure your function is named exactly `my_compressor(data)` and returns the final string.
              </p>
              
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 block">PIPELINE CHECKLIST</span>
              <ul className="space-y-3 mb-6">
                {[
                  "Create function named exactly 'my_compressor(data)'.",
                  "Instantiate tracking variables (with new custom names).",
                  "Write loop to check character sequences.",
                  "Write if/else conditions to aggregate repeats."
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-[13px] text-slate-600 font-medium">
                    <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 font-bold select-none">
                      {idx + 1}
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              {/* Copy-Protected Blurred Reference Code Block */}
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">TUTORIAL REFERENCE RESOURCE</span>
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 mb-6">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">TUTORIAL REFERENCE ARCHIVE [RESTRICTED]</span>
                </div>
                <pre className="p-4 font-mono text-[11px] text-slate-400 select-none pointer-events-none blur-[0.5px] hover:blur-none transition-all leading-relaxed whitespace-pre-wrap">
                  {tutorialSteps[3].targetCode}
                </pre>
              </div>
            </div>

            {challengeSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-center mb-4">
                <span className="text-xs font-bold text-emerald-700 tracking-wider uppercase block mb-1">PIPELINE MASTERED</span>
                <span className="text-[13px] text-emerald-600 leading-relaxed font-semibold">
                  CONGRATULATIONS! Pipeline Secured. You have successfully engineered a custom Python compression algorithm.
                </span>
              </div>
            ) : (
              <div className="flex gap-4">
                <button 
                  onClick={handleCheckSolution}
                  disabled={!editorValue.trim()}
                  className="flex-grow py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-md uppercase tracking-wider transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Check Solution
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Panel: Monaco IDE & Terminal */}
      <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col bg-slate-900">
        {/* IDE Controls Header */}
        <div className="h-12 bg-slate-950 border-b border-slate-800 px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="font-mono text-xs text-slate-400 tracking-wide">diagnostics_spooler.py</span>
          </div>
          <button 
            onClick={handleRun}
            className="py-1.5 px-4 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-[10px] rounded uppercase tracking-wider transition-colors"
          >
            RUN
          </button>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-grow h-1/2 relative overflow-hidden">
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={editorValue}
            onChange={handleEditorChange}
            options={{
              fontSize: 13,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              padding: { top: 12 }
            }}
          />
        </div>

        {/* Xterm.js Terminal Container */}
        <div className="h-[200px] border-t border-slate-800 bg-[#0f172a] flex flex-col">
          <div className="h-7 bg-slate-950 px-4 flex items-center border-b border-slate-800">
            <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">SYSTEM TERMINAL</span>
          </div>
          <div 
            ref={terminalElementRef} 
            className="flex-grow overflow-hidden font-mono"
            style={{ width: '100%', height: 'calc(100% - 28px)' }}
          />
        </div>
      </div>
    </div>
  );
}
