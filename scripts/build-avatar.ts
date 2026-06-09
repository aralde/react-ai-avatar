import fs from 'fs';
import { execSync } from 'child_process';
import { GoogleGenAI, Type } from '@google/genai';
import { config } from 'dotenv';

// Try loading from .env
config(); 

// In the AI Studio environment, the key might be passed differently or we can just ask the user to provide it.
// For this script, we'll read it from process.env.GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY;

async function build() {
  console.log('🤖 Starting Avatar Builder Agent...');
  
  if (!apiKey) {
    console.log("⚠️ GEMINI_API_KEY is missing in the shell environment.");
    console.log("For this demo, we will generate the expected output manually to show how the CLI works.");
    generateMockOutput();
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const inputFile = process.argv[2] || 'mi-avatar.svg';

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  const svgContent = fs.readFileSync(inputFile, 'utf-8');

  const initialPrompt = `
You are an expert React and SVG developer.
I will give you a raw SVG of a character's face.
I need you to convert this SVG into a React component using \`motion/react\`.

Instructions:
1. Convert all SVG attributes to JSX camelCase (e.g., stroke-width -> strokeWidth).
2. Identify the elements representing the HEAD (the entire face/head container), the LEFT EYE, the RIGHT EYE, and the MOUTH.
3. Wrap the HEAD elements in \`<motion.g style={{ rotateX: headRotateX, rotateY: headRotateY, transformStyle: 'preserve-3d' }}>\`
4. Wrap the LEFT EYE in \`<motion.g animate={leftEyelidControls} style={{ originY: "50%" }}>\`
5. Wrap the RIGHT EYE in \`<motion.g animate={rightEyelidControls} style={{ originY: "50%" }}>\`
6. Wrap the MOUTH in \`<motion.g style={{ scaleY: mouthScaleY, transformOrigin: 'center' }}>\`
7. Output ONLY the valid React component code. Do not truncate the code. Ensure all imports are present.

Use this exact template and replace the \`/* SVG_CONTENT_HERE */\` with your animated SVG:

import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useMotionValue, useSpring, useTransform } from 'motion/react';
import { AvatarState } from '../hooks/useGeminiLive';

export interface CustomAvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
  size?: number;
}

export function CustomAvatar({ state, analyser, size = 200 }: CustomAvatarProps) {
  const leftEyelidControls = useAnimation();
  const rightEyelidControls = useAnimation();
  const mouthScaleY = useMotionValue(1);
  const requestRef = useRef<number | null>(null);

  // Gaze tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 20 });
  const headRotateY = useTransform(smoothX, [-1, 1], [-10, 10]);
  const headRotateX = useTransform(smoothY, [-1, 1], [10, -10]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Blinking
  useEffect(() => {
    let active = true;
    const blink = async () => {
      while (active) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 2000));
        if (!active) break;
        leftEyelidControls.start({ scaleY: 0.1, transition: { duration: 0.1 } });
        rightEyelidControls.start({ scaleY: 0.1, transition: { duration: 0.1 } });
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!active) break;
        leftEyelidControls.start({ scaleY: 1, transition: { duration: 0.1 } });
        rightEyelidControls.start({ scaleY: 1, transition: { duration: 0.1 } });
      }
    };
    blink();
    return () => { active = false; };
  }, [leftEyelidControls, rightEyelidControls]);

  // Audio to Mouth Scale
  useEffect(() => {
    if (!analyser || state !== 'speaking') {
      mouthScaleY.set(1);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateMouth = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const average = sum / dataArray.length;
      // Scale mouth based on volume
      mouthScaleY.set(1 + (average / 255) * 2);
      requestRef.current = requestAnimationFrame(updateMouth);
    };
    updateMouth();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, state, mouthScaleY]);

  return (
    <div style={{ width: size, height: size, perspective: 1000 }}>
      <motion.svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        /* SVG_CONTENT_HERE */
      </motion.svg>
    </div>
  );
}

Here is the raw SVG to process:
${svgContent}
`;

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: "You are an expert React developer. Always return valid, complete, and un-truncated TSX code.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING, description: "The complete React TSX code" }
        }
      }
    }
  });

  let currentMessage = initialPrompt;
  let success = false;
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n🔄 Agent Attempt ${attempt}/${MAX_RETRIES}...`);
    try {
      console.log('🧠 Generating code...');
      const response = await chat.sendMessage({ message: currentMessage });
      
      const json = JSON.parse(response.text || "{}");
      if (!json.code) throw new Error("Model did not return 'code' property in JSON.");
      const code = json.code;

      fs.writeFileSync('src/components/CustomAvatar.tsx', code);

      console.log('⏳ Validating generated code with TypeScript...');
      // Run the linter to verify the generated code
      execSync('npm run lint', { stdio: 'pipe' });
      
      console.log('✅ Code is valid! Avatar built successfully.');
      success = true;
      break;
    } catch (error: any) {
      console.error(`❌ Validation failed on attempt ${attempt}.`);
      
      let errorMessage = error.message || String(error);
      if (error.stdout) errorMessage += '\n' + error.stdout.toString();
      if (error.stderr) errorMessage += '\n' + error.stderr.toString();
      
      // Truncate error message if it's too long
      if (errorMessage.length > 2000) {
        errorMessage = errorMessage.substring(0, 2000) + '... [truncated]';
      }
      
      console.log('Error details:', errorMessage.split('\n')[0]); // Print just the first line to keep console clean
      
      currentMessage = `The code you generated failed TypeScript validation with the following errors:\n\n${errorMessage}\n\nPlease fix these errors and return the complete, corrected TSX code. Make sure NOT to truncate the code.`;
    }
  }

  if (!success) {
    console.error('\n🚨 Agent failed to generate valid code after maximum retries. Please check the SVG or try again.');
  }
}

function generateMockOutput() {
  const code = `import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useMotionValue, useSpring, useTransform } from 'motion/react';
import { AvatarState } from '../hooks/useGeminiLive';

export interface CustomAvatarProps {
  state: AvatarState;
  analyser: AnalyserNode | null;
  size?: number;
}

export function CustomAvatar({ state, analyser, size = 200 }: CustomAvatarProps) {
  const leftEyelidControls = useAnimation();
  const rightEyelidControls = useAnimation();
  const mouthScaleY = useMotionValue(1);
  const requestRef = useRef<number | null>(null);

  // Gaze tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 20 });
  const headRotateY = useTransform(smoothX, [-1, 1], [-10, 10]);
  const headRotateX = useTransform(smoothY, [-1, 1], [10, -10]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Blinking
  useEffect(() => {
    let active = true;
    const blink = async () => {
      while (active) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 4000 + 2000));
        if (!active) break;
        leftEyelidControls.start({ scaleY: 0.1, transition: { duration: 0.1 } });
        rightEyelidControls.start({ scaleY: 0.1, transition: { duration: 0.1 } });
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!active) break;
        leftEyelidControls.start({ scaleY: 1, transition: { duration: 0.1 } });
        rightEyelidControls.start({ scaleY: 1, transition: { duration: 0.1 } });
      }
    };
    blink();
    return () => { active = false; };
  }, [leftEyelidControls, rightEyelidControls]);

  // Audio to Mouth Scale
  useEffect(() => {
    if (!analyser || state !== 'speaking') {
      mouthScaleY.set(1);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateMouth = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const average = sum / dataArray.length;
      // Scale mouth based on volume
      mouthScaleY.set(1 + (average / 255) * 2);
      requestRef.current = requestAnimationFrame(updateMouth);
    };
    updateMouth();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [analyser, state, mouthScaleY]);

  return (
    <div style={{ width: size, height: size, perspective: 1000 }}>
      <motion.svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
        <motion.g style={{ rotateX: headRotateX, rotateY: headRotateY, transformStyle: 'preserve-3d' }}>
          {/* Cabeza del alien/robot */}
          <rect x="40" y="40" width="120" height="120" rx="30" fill="#8b5cf6" />
          
          {/* Antena */}
          <line x1="100" y1="40" x2="100" y2="10" stroke="#8b5cf6" strokeWidth="6" strokeLinecap="round" />
          <circle cx="100" cy="10" r="8" fill="#f59e0b" />

          {/* Ojo Izquierdo */}
          <motion.g animate={leftEyelidControls} style={{ originY: "50%", originX: "50%" }}>
            <circle cx="70" cy="90" r="15" fill="#1e293b" />
            <circle cx="75" cy="85" r="5" fill="#ffffff" />
          </motion.g>
          
          {/* Ojo Derecho */}
          <motion.g animate={rightEyelidControls} style={{ originY: "50%", originX: "50%" }}>
            <circle cx="130" cy="90" r="15" fill="#1e293b" />
            <circle cx="135" cy="85" r="5" fill="#ffffff" />
          </motion.g>
          
          {/* Boca */}
          <motion.g style={{ scaleY: mouthScaleY, transformOrigin: '100px 130px' }}>
            <path d="M 70 130 Q 100 150 130 130" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
          </motion.g>
        </motion.g>
      </motion.svg>
    </div>
  );
}`;
  fs.writeFileSync('src/components/CustomAvatar.tsx', code);
  console.log('✅ Successfully generated src/components/CustomAvatar.tsx!');
}

build();
