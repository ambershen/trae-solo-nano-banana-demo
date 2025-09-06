# 🍌 Artistic Effect Generation for Your Portrait

> **Built with TRAE SOLO x Nano-banana** 🤖✨  
> Want to learn how this app was created? Check out our step-by-step tutorial: [Using TRAE SOLO x Nano-Banana to build an app](./Using%20TRAE%20SOLO%20x%20Nano-Banana%20to%20build%20an%20app.md)

An AI-powered image transformation application that applies stunning artistic effects to your photos using Google's Gemini AI. Transform your portraits into anime characters, Picasso-style paintings, oil paintings, and more!

## ✨ Features

- **Multiple Art Styles**: 
  - 🎨 Anime Style - Transform portraits into beautiful anime characters
  - 🖼️ Picasso Style - Apply cubist artistic transformations
  - 🎭 Oil Painting - Create classic oil painting effects
  - 🏛️ Frida Kahlo Style - Artistic transformations inspired by Frida Kahlo
  - 🏠 Miniature Effect - Create tilt-shift miniature-like effects

## 📋 Prerequisites

- **Node.js 18+** (recommended: Node.js 20 or later)
- **npm** or **yarn** package manager
- **Google Gemini API Key** (required for AI image processing)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nano-banana-effect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```bash
   touch .env
   ```
   
   Add your Google Gemini API key:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

## 🔑 Setting Up Your Gemini API Key

### Step 1: Get Your API Key from Google AI Studio

1. **Visit Google AI Studio**
   - Go to [https://aistudio.google.com/](https://aistudio.google.com/)
   - Sign in with your Google account (create one if needed)

2. **Create Your API Key**
   - Look for "Get API Key" in the left sidebar
   - Click "Create API Key" button
   - Choose "Create API key in new project" (recommended for new users)
   - Or select an existing Google Cloud project if you have one
   - **Important**: Copy the API key immediately - you won't be able to see it again!

### Step 2: Set Up Your Environment File

1. **Copy the Example File**
   ```bash
   cp .env.example .env
   ```

2. **Add Your API Key**
   - Open the `.env` file in your text editor
   - Replace `your_gemini_api_key_here` with your actual API key:
   ```env
   GOOGLE_API_KEY=AIzaSyB...(your actual key here)
   ```

### 🔒 Security Best Practices

- ✅ **DO**: Keep your API key in the `.env` file (already added to `.gitignore`)
- ✅ **DO**: Use environment variables in production
- ❌ **DON'T**: Share your API key publicly or commit it to version control
- ❌ **DON'T**: Hardcode the API key in your source code

### 🚨 Troubleshooting API Key Issues

**Problem**: "API key not found" error
- ✅ Check that your `.env` file exists in the project root
- ✅ Verify the API key starts with `AIzaSy`
- ✅ Ensure no extra spaces or quotes around the key
- ✅ Restart the development server after adding the key

**Problem**: "Invalid API key" error
- ✅ Double-check you copied the complete key from Google AI Studio
- ✅ Make sure the API key hasn't been restricted or disabled
- ✅ Try generating a new API key if the issue persists

**Problem**: "Quota exceeded" error
- ✅ Check your usage in [Google AI Studio](https://aistudio.google.com/)
- ✅ You may need to enable billing for higher usage limits
- ✅ Consider implementing rate limiting in your application

**Still having issues?** 
- Check the [Google AI Studio documentation](https://ai.google.dev/docs)
- Ensure your Google account has access to Gemini API
- Try creating a fresh API key

## 🏃‍♂️ Running the Application

### Development Mode

Start both frontend and backend servers:
```bash
npm run dev
```

This will start:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend**: http://localhost:3001 (Express server)

### Individual Commands

Run frontend only:
```bash
npm run client:dev
```

Run backend only:
```bash
npm run server:dev
```

### Production Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## 📖 How to Use

1. **Open the Application**
   - Navigate to http://localhost:5173 in your browser

2. **Upload an Image**
   - Click the upload area or drag & drop an image
   - Supported formats: JPEG, PNG, WebP
   - Recommended: Portrait photos work best

3. **Choose an Effect**
   - Select from available artistic effects
   - Each effect has a unique AI transformation style

4. **Adjust Intensity**
   - Use the intensity slider (0-100%)
   - Higher values create more dramatic transformations

5. **Apply Effect**
   - Click "Apply Effect" to start AI processing
   - Processing typically takes 10-30 seconds
   - Watch the real-time progress indicator

6. **Download Result**
   - Once complete, download your transformed image
   - Images are automatically optimized for web use

## 🔌 API Endpoints

### Upload Image
```http
POST /api/images/upload
Content-Type: multipart/form-data

Body: { image: File }
```

### Apply Effect
```http
POST /api/images/apply-effect
Content-Type: application/json

Body: {
  "imageId": "string",
  "effectType": "anime_style|picasso_style|oil_painting|frida_effect|miniature_effect",
  "intensity": 0.8
}
```

### Check Processing Status
```http
GET /api/images/status/:jobId
```

### Download Processed Image
```http
GET /api/images/file/:filename
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add `GOOGLE_API_KEY` with your Gemini API key

### Other Platforms

The app can be deployed to any platform that supports Node.js:
- **Netlify** (with serverless functions)
- **Railway**
- **Render**
- **Heroku**

Make sure to:
- Set the `GOOGLE_API_KEY` environment variable
- Configure build command: `npm run build`
- Set start command: `npm start` (you may need to add this script)

## 🛠️ Development

### Project Structure
```
nano-banana-effect/
├── src/                 # Frontend React app
│   ├── components/      # Reusable components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Utility functions
├── api/                # Backend Express server
│   ├── routes/         # API route handlers
│   ├── images/         # Image processing logic
│   └── server.ts       # Server entry point
├── uploads/            # Temporary image storage
└── public/             # Static assets
```

### Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run check` - TypeScript type checking
- `npm run preview` - Preview production build

### Code Quality

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** formatting (recommended)
- **Husky** for git hooks (optional)

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests and linting**
   ```bash
   npm run lint
   npm run check
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**"API Key not found" Error**
- Ensure `GOOGLE_API_KEY` is set in your `.env` file
- Restart the development server after adding the key

**"Image processing failed" Error**
- Check your internet connection
- Verify your Gemini API key is valid and has quota remaining
- Try with a smaller image file

**Upload fails**
- Ensure image is in supported format (JPEG, PNG, WebP)
- Check file size (recommended < 10MB)

**Server won't start**
- Check if ports 3001 and 5173 are available
- Run `npm install` to ensure all dependencies are installed

### Getting Help

- Check the browser console for error messages
- Look at the server logs in your terminal
- Ensure all environment variables are properly set

---

**Crafted with 💖 by TRAE SOLO** 🤖✨ *Your friendly AI coding agent!* 🌟
