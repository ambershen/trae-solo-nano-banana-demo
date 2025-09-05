[English Version]
What you'll need before getting started:
- TRAE SOLO (https://www.trae.ai/solo)
- Token from Google Gemini API (https://aistudio.google.com/welcome)
- An initial idea of what you want to build ✨

# Step 1 Build the initial project in SOLO
- Build the project scaffold in SOLO, explicitly tell SOLO that you want to use Gemini-2.5-flash-image for image processing.

Example Prompt (for a photo editing website):
Build a photo editing website that allows user to upload an image, and select preset effects like miniature effect, Picasso effect and anime effect.
For image processing, use Google Gemini 2.5 Flash Image API (gemini-2.5-flash-image-preview) for AI Image Generation. 
Fetch latest document on how to use the image model in Gemini 2.5 from here Web https://ai.google.dev/gemini-api/docs/image-generation

(Note: here we specify that for image processing, gemini-2.5-flash-image-preview (aka. nano-banana) should be used.)

# Step 2 Use Nano-banana for image generation
- Make sure your technical doc reflects the correct usage of gemini-2.5-flash-image-preview before building
- Start to let SOLO Builder code your app until you are asked to "Configure you Gemini API". 

# Step 3 Get Gemini API Keys
First, go to Google Cloud Console to Create a new Project
https://console.cloud.google.com/welcome
Then head to Google AI Studio. Under "Dashboard", click on [Create API Keys] and choose the project you just created. Copy the generated API key into a safe place.

# Step 4 Configure Gemini API in SOLO
Now head back to TRAE SOLO, under the Integration tab, select Gemini API and add the API key you just got from Step 3. Paste it in and click confirm.

# Step 5 Refine your prompts for image generation

The prompt I used in the sample project:
Now update the image effects to these five styles below and use the prompt I provide:
Name: Anime Style
Prompt: Using the provided image of this person, transform this portrait into pretty, anime style.
Name: Picasso Style
Prompt:
Using the provided image of this person, transform this portrait into Picasso painting style.
Name: Oil Painting Style
Prompt:
Using the provided image of this person, transformed the portrait into the style of a Degas oil painting.
Name: Frida Style
Prompt: Using the provided image of this person, transform this portrait into Frida Kahlo painting style.
Name: Miniature Effect
Prompt: 
Create a 1/7 scale commercialized figure of the character in the illustration, in a realistic style and environment. Place the figure on a computer desk, using a circular transparent acrylic base without any text. On the computer screen, display the ZBrush modeling process of the figure. Next to the computer screen, place a BANDAI-style toy packaging box printed with the original artwork.
Send this prompt to SOLO Builder to refine your image generation results. After this you can play around and test out the image effects in SOLO!

See here for prompting guide for Gemini-2.5-flash-image: Gemini 2.5 Image Generation Prompting Guide