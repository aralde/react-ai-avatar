# Walkthrough: Avatar Code Exporter

We have added a code export functionality to the Realtime Avatar builder/web page. This allows users to copy the exact configuration code for their customized avatar to implement it on other websites.

## Changes Made

### 1. [App.tsx](file:///t:/Dev/personal/_myProductionGithub/0.Portfolio/realtime-avatar-demo/src/App.tsx)
- **Imports**: Added `motion` and `AnimatePresence` from `motion/react` for smooth transitions. Imported `Code`, `Copy`, `Check`, and `X` from `lucide-react` for rich visual elements.
- **State Hooks**: Added `isCodeModalOpen`, `copiedText`, and `activeTab` states.
- **Code Generator Utility**: Implemented `generateJSXCode()` to output a beautifully indented React code snippet with the exact custom options selected by the user (variant, mouth size, gaze intensity, blink speed/duration, and customizable theme palette/labels).
- **Stage controls**: Wrapped the Stage Header controls and added a **"CODE"** button right next to the subtitle captions button.
- **Glassmorphic Modal Dialog**: Created a responsive dialog overlay featuring:
  - Backdrop blur click-out support.
  - Tab selectors to toggle between **JSX Usage** and the **Setup Guide**.
  - A copy button that updates to a green checkmark saying "COPIED!" for 2 seconds after a successful copy.
  - Detailed integration guidelines outlining requirements (sizes, states, and audio analyser nodes).

---

## Verification and Testing

### Automated Checks
- Verified types and syntax compile cleanly:
  ```powershell
  npm run lint
  ```
  *Status: Passed (0 errors)*
- Verified production build completes successfully:
  ```powershell
  npm run build
  ```
  *Status: Passed (0 errors)*

### Manual Test Steps (for User Verification)
1. Run the local dev server using `npm run dev`.
2. Open the page and modify customization sliders (e.g. increase Mouth Opening Limit or change the Listening State Color).
3. Click the **"CODE"** button at the top-right of the avatar box.
4. Verify the modal pops up smoothly and displays your modified values in the JSX code block.
5. Click the **"COPY CODE"** button and confirm it shows "COPIED!".
6. Paste the code into your IDE to verify the clipboard contents.
7. Switch to the **"SETUP GUIDE"** tab to check the command line setup instructions.
