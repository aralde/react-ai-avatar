# Implementation Plan: Avatar Code Exporter

This plan outlines the changes needed to add a **"GET CODE"** button to the avatar stage header. Clicking this button will open a premium, fully-styled modal containing the customized React/JSX code snippet and setup instructions, allowing users to easily copy and paste the avatar setup into another web application.

## Proposed Changes

### 1. UI Changes in [App.tsx](file:///t:/Dev/personal/_myProductionGithub/0.Portfolio/realtime-avatar-demo/src/App.tsx)

#### Add Code Icon and Button
- Import `Code`, `Copy`, `Check`, and `X` from `lucide-react`.
- In the Stage Header Controls (adjacent to the `CAPTIONS ON/OFF` button), add a new button:
  - **Label**: `CODE`
  - **Icon**: `Code`
  - **Styling**: Sleek border button matching the Captions button, with hover micro-animations.

#### Modal State and Logic
- Add state variables:
  - `isCodeModalOpen`: boolean to control modal visibility.
  - `copiedText`: boolean to toggle copy status.
  - `activeTab`: `'code' | 'instructions'` to switch between JSX code and package setup guides.
- Implement a helper function `generateJSXCode()` to compile the current configurations (`variant`, `maxMouthOpening`, `mouseTrackingIntensity`, `blinkIntervalMin`, `blinkIntervalMax`, `blinkDuration`, `stateColors`, `stateLabels`) into a clean React JSX element snippet.
- Implement the `copyToClipboard()` function.

#### Integration Modal Markup
- Create a modern, high-fidelity responsive modal using Tailwind:
  - Backdrop blur overlay (`fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4`)
  - Glassmorphic modal container (`bg-zinc-950/90 border border-zinc-850 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl text-zinc-100`)
  - A neat header with title and close (`X`) button.
  - Tab controls to switch between "JSX Usage" and "Setup Instructions".
  - Code block display (`pre`/`code`) with an inline, floating **"Copy Code"** button.
  - Integration notes highlighting the package imports, styles, and peer dependencies (`motion` and `lucide-react`).

## Generated Snippet Outline

### Tab 1: JSX Usage
```tsx
import { RealtimeAvatar } from 'react-realtime-avatar';
import 'react-realtime-avatar/style.css'; // If using the npm package

// In your React Component:
const [state, setState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

return (
  <RealtimeAvatar 
    state={state} 
    analyser={analyser} 
    size={320} 
    variant="[current_variant]" 
    maxMouthOpening={[current_max_mouth_opening]}
    mouseTrackingIntensity={[current_mouse_tracking_intensity]}
    blinkIntervalMin={[current_blink_interval_min]}
    blinkIntervalMax={[current_blink_interval_max]}
    blinkDuration={[current_blink_duration]}
    stateColors={{
      idle: '[current_idle_color]',
      listening: '[current_listening_color]',
      thinking: '[current_thinking_color]',
      speaking: '[current_speaking_color]'
    }}
    stateLabels={{
      idle: '[current_idle_label]',
      listening: '[current_listening_label]',
      thinking: '[current_thinking_label]',
      speaking: '[current_speaking_label]'
    }}
  />
);
```

### Tab 2: Setup & Dependencies
```bash
# Install package and peer dependencies
npm install react-realtime-avatar motion lucide-react
```

## Verification Plan

### Automated Verification
- Run `npm run lint` and `npm run dev` to verify the application starts and builds clean.

### Manual Verification
- Customize the avatar parameters (e.g., change mouth limit, state colors, variant).
- Click the **"CODE"** button and verify the modal opens with slide-up animations.
- Ensure the values shown in the generated code exactly match the sliders/inputs configured in the dashboard.
- Verify clicking "Copy" changes the label to "Copied!" and successfully copies the snippet to the clipboard.
- Switch tabs and verify the setup instructions.
- Close the modal using the close button or by clicking on the overlay backdrop.
