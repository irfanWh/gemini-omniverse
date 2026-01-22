# Gemini Omniverse

Gemini Omniverse is a cutting-edge AI playground designed to demonstrate the full spectrum of Google's Gemini models. Built with React, Tailwind CSS, and the `@google/genai` SDK, this application showcases text, vision, audio, and video generation capabilities in a unified interface.

## 🚀 Features

### 1. Chat & Vision (Multimodal)
Interact with **Gemini 3.0 Flash** and **Pro** models.
- **Text:** High-speed, context-aware conversational AI.
- **Vision:** Upload images for analysis, reasoning, and description.
- **Grounding:** Integrated Google Search grounding for up-to-date information.

### 2. Live Interaction (Real-time)
Experience low-latency, two-way communication with **Gemini 2.5 Flash Native Audio**.
- **Audio Streaming:** Talk to Gemini naturally with real-time voice input/output.
- **Video Streaming:** The model "sees" what your camera sees in real-time.
- **PCM Audio Processing:** Custom audio handling using raw PCM data for minimum latency.

### 3. Veo Video Studio
Generate high-definition videos using the **Veo 3.1** model.
- **Text-to-Video:** Create 720p/1080p videos from simple text prompts.
- **Aspect Ratio Control:** Support for 16:9 and 9:16 formats.
- **Billing Integration:** Seamless integration with paid GCP projects for premium video generation features.

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript
- **Styling:** Tailwind CSS
- **AI SDK:** Google GenAI SDK (`@google/genai`)
- **Audio:** Web Audio API (AudioContext, ScriptProcessor)

## 📦 Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gemini-omniverse.git
   cd gemini-omniverse
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Ensure your environment is set up with a valid Google API Key.
   - The app uses `process.env.API_KEY` automatically.

4. **Run the application**
   ```bash
   npm start
   ```

## 🔑 API Key Requirements

- **General Usage:** A standard Gemini API key is required for Chat and Live modes.
- **Veo Video Generation:** A paid API key linked to a Google Cloud Platform project with billing enabled is required. The app includes a built-in selector to help you authenticate with the correct key type for Veo.

## 📄 License

MIT License - feel free to use this code for your own experiments!